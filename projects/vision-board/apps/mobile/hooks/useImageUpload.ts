/**
 * useImageUpload — Image selection, compression, and R2 upload hook
 *
 * Handles the full flow: pick → compress → validate → upload (or offline queue)
 */

import { useState, useCallback, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Paths, File, Directory } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as Haptics from 'expo-haptics';
import { validateImageFile } from '@vision-board/shared/lib';
import { r2Storage } from '../services/r2Storage';

const UPLOAD_QUEUE_KEY = 'image_upload_queue';
const PENDING_DIR_NAME = 'pending_images';
const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.8;

function getPendingDir(): Directory {
  return new Directory(Paths.document, PENDING_DIR_NAME);
}

export interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
}

interface PendingUpload {
  localUri: string;
  boardId: string;
  nodeId: string;
  fileName: string;
  contentType: string;
  timestamp: number;
}

export interface UploadImageResult {
  publicUrl: string | null;
  localUri: string;
  key: string | null;
  width: number;
  height: number;
}

export function useImageUpload(
  userId: string | null,
  authToken: string | null,
) {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
  });
  const authTokenRef = useRef(authToken);
  authTokenRef.current = authToken;

  const pickImage = useCallback(async (
    source: 'camera' | 'gallery',
  ): Promise<ImagePicker.ImagePickerAsset | null> => {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
    };

    let result: ImagePicker.ImagePickerResult;
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') return null;
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return null;
      result = await ImagePicker.launchImageLibraryAsync(options);
    }

    if (result.canceled || !result.assets?.[0]) return null;
    return result.assets[0];
  }, []);

  const compressImage = useCallback(async (
    uri: string,
    width: number,
    height: number,
  ): Promise<{ uri: string; width: number; height: number }> => {
    const actions: ImageManipulator.Action[] = [];

    const maxSide = Math.max(width, height);
    if (maxSide > MAX_DIMENSION) {
      const ratio = MAX_DIMENSION / maxSide;
      actions.push({
        resize: {
          width: Math.round(width * ratio),
          height: Math.round(height * ratio),
        },
      });
    }

    const result = await ImageManipulator.manipulateAsync(uri, actions, {
      compress: JPEG_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    });

    return {
      uri: result.uri,
      width: result.width,
      height: result.height,
    };
  }, []);

  const uploadImage = useCallback(async (
    asset: ImagePicker.ImagePickerAsset,
    boardId: string,
    nodeId: string,
  ): Promise<UploadImageResult> => {
    if (!userId || !authTokenRef.current) {
      throw new Error('認証が必要です');
    }

    setState({ isUploading: true, progress: 0, error: null });

    try {
      // 1. Compress
      const compressed = await compressImage(
        asset.uri,
        asset.width,
        asset.height,
      );
      setState(prev => ({ ...prev, progress: 10 }));

      // 2. Validate file size using new File API
      const compressedFile = new File(compressed.uri);
      if (!compressedFile.exists) throw new Error('圧縮画像が見つかりません');

      const fileSize = compressedFile.size ?? 0;
      const validation = validateImageFile('image/jpeg', fileSize);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }
      setState(prev => ({ ...prev, progress: 15 }));

      // 3. Save local copy (offline fallback)
      const pendingDir = getPendingDir();
      if (!pendingDir.exists) {
        pendingDir.create();
      }
      const localFileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
      const localFile = new File(pendingDir, localFileName);
      compressedFile.copy(localFile);
      const localUri = localFile.uri;
      setState(prev => ({ ...prev, progress: 20 }));

      // 4. Check network
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        await addToUploadQueue({
          localUri,
          boardId,
          nodeId,
          fileName: localFileName,
          contentType: 'image/jpeg',
          timestamp: Date.now(),
        });

        setState({ isUploading: false, progress: 100, error: null });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        return {
          publicUrl: null,
          localUri,
          key: null,
          width: compressed.width,
          height: compressed.height,
        };
      }

      // 5. Upload to R2
      const fileBlob = await localFile.arrayBuffer();

      const result = await r2Storage.uploadImage(
        fileBlob,
        userId,
        boardId,
        localFileName,
        'image/jpeg',
        authTokenRef.current,
        (percent) => {
          setState(prev => ({
            ...prev,
            progress: 20 + Math.round(percent * 0.75),
          }));
        },
      );

      // 6. Clean up local copy
      try { localFile.delete(); } catch { /* ignore */ }

      setState({ isUploading: false, progress: 100, error: null });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      return {
        publicUrl: result.publicUrl,
        localUri,
        key: result.key,
        width: compressed.width,
        height: compressed.height,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'アップロードに失敗しました';
      setState({ isUploading: false, progress: 0, error: errorMessage });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      throw err;
    }
  }, [userId, compressImage]);

  const syncPendingUploads = useCallback(async (
    onNodeUpdate?: (nodeId: string, publicUrl: string) => Promise<void>,
  ): Promise<number> => {
    if (!userId || !authTokenRef.current) return 0;

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return 0;

    try {
      const raw = await AsyncStorage.getItem(UPLOAD_QUEUE_KEY);
      if (!raw) return 0;

      const queue: PendingUpload[] = JSON.parse(raw);
      if (queue.length === 0) return 0;

      const successIndices: number[] = [];

      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        try {
          const localFile = new File(item.localUri);
          if (!localFile.exists) {
            successIndices.push(i);
            continue;
          }

          const fileBuffer = await localFile.arrayBuffer();
          const result = await r2Storage.uploadImage(
            fileBuffer,
            userId,
            item.boardId,
            item.fileName,
            item.contentType,
            authTokenRef.current!,
          );

          // Update the node's src to R2 URL
          if (onNodeUpdate) {
            await onNodeUpdate(item.nodeId, result.publicUrl);
          }

          try { localFile.delete(); } catch { /* ignore */ }
          successIndices.push(i);
        } catch {
          // Skip failed items, retry next time
        }
      }

      const remaining = queue.filter((_, i) => !successIndices.includes(i));
      await AsyncStorage.setItem(UPLOAD_QUEUE_KEY, JSON.stringify(remaining));
      return remaining.length;
    } catch {
      return 0;
    }
  }, [userId]);

  return {
    ...state,
    pickImage,
    uploadImage,
    syncPendingUploads,
  };
}

async function addToUploadQueue(item: PendingUpload): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(UPLOAD_QUEUE_KEY);
    const queue: PendingUpload[] = raw ? JSON.parse(raw) : [];
    queue.push(item);
    await AsyncStorage.setItem(UPLOAD_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('Failed to add to upload queue:', err);
  }
}
