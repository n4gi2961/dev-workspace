/**
 * ImageCropModal — Position + zoom crop modal
 *
 * No actual image cropping or re-upload.
 * User pans and pinch-zooms to choose the visible region.
 * Returns { x, y, scale } for the header to replicate the same view.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LucideIcon } from '../ui/LucideIcon';

const CROP_HEIGHT = 240;

export interface CropPosition {
  x: number;     // 0-100 (50=center)
  y: number;     // 0-100 (50=center)
  scale: number; // zoom multiplier (1.0 = cover, >=1)
}

interface ImageCropModalProps {
  visible: boolean;
  imageUri: string | null;
  initialPosition?: CropPosition;
  onConfirm: (position: CropPosition) => void;
  onCancel: () => void;
}

export function ImageCropModal({
  visible,
  imageUri,
  initialPosition,
  onConfirm,
  onCancel,
}: ImageCropModalProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const cropW = screenWidth;
  const cropH = CROP_HEIGHT;

  // SharedValues for worklet-safe access
  const baseH_SV = useSharedValue(screenWidth);
  const coverScale_SV = useSharedValue(1);

  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const [displayBaseH, setDisplayBaseH] = useState(screenWidth);

  const handleImageLoad = useCallback(
    (e: { source: { width: number; height: number } }) => {
      const { width: imgW, height: imgH } = e.source;
      const bH = (imgH / imgW) * screenWidth;
      baseH_SV.value = bH;
      setDisplayBaseH(bH);

      const cs = Math.max(1, cropH / bH);
      coverScale_SV.value = cs;

      // Initial scale from stored zoom or cover
      const initZoom = initialPosition?.scale ?? 1;
      const initScale = cs * Math.max(1, initZoom);
      scale.value = initScale;
      savedScale.value = initScale;

      // Max pan at initial scale
      const mTx = Math.max(0, (screenWidth * initScale - cropW) / 2);
      const mTy = Math.max(0, (bH * initScale - cropH) / 2);

      // Convert stored percentage to translate
      const initX = initialPosition?.x ?? 50;
      const initY = initialPosition?.y ?? 50;
      const tx = mTx > 0 ? mTx * (1 - initX / 50) : 0;
      const ty = mTy > 0 ? mTy * (1 - initY / 50) : 0;

      translateX.value = tx;
      translateY.value = ty;
      savedTranslateX.value = tx;
      savedTranslateY.value = ty;
    },
    [screenWidth, cropW, cropH, initialPosition, baseH_SV, coverScale_SV, scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY],
  );

  // Pan gesture
  const panGesture = Gesture.Pan()
    .onStart(() => {
      'worklet';
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      'worklet';
      const newTx = savedTranslateX.value + e.translationX;
      const newTy = savedTranslateY.value + e.translationY;
      const dW = screenWidth * scale.value;
      const dH = baseH_SV.value * scale.value;
      const mTx = Math.max(0, (dW - cropW) / 2);
      const mTy = Math.max(0, (dH - cropH) / 2);
      translateX.value = Math.min(mTx, Math.max(-mTx, newTx));
      translateY.value = Math.min(mTy, Math.max(-mTy, newTy));
    })
    .onEnd(() => {
      'worklet';
      const dW = screenWidth * scale.value;
      const dH = baseH_SV.value * scale.value;
      const mTx = Math.max(0, (dW - cropW) / 2);
      const mTy = Math.max(0, (dH - cropH) / 2);
      translateX.value = withSpring(Math.min(mTx, Math.max(-mTx, translateX.value)), { damping: 20 });
      translateY.value = withSpring(Math.min(mTy, Math.max(-mTy, translateY.value)), { damping: 20 });
    });

  // Pinch gesture
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      'worklet';
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      'worklet';
      const cs = coverScale_SV.value;
      const newScale = Math.max(cs, Math.min(savedScale.value * e.scale, cs * 5));
      scale.value = newScale;
      // Re-clamp translation
      const dW = screenWidth * newScale;
      const dH = baseH_SV.value * newScale;
      const mTx = Math.max(0, (dW - cropW) / 2);
      const mTy = Math.max(0, (dH - cropH) / 2);
      translateX.value = Math.min(mTx, Math.max(-mTx, translateX.value));
      translateY.value = Math.min(mTy, Math.max(-mTy, translateY.value));
    })
    .onEnd(() => {
      'worklet';
      const cs = coverScale_SV.value;
      if (scale.value < cs) {
        scale.value = withSpring(cs, { damping: 20 });
      }
      const dW = screenWidth * scale.value;
      const dH = baseH_SV.value * scale.value;
      const mTx = Math.max(0, (dW - cropW) / 2);
      const mTy = Math.max(0, (dH - cropH) / 2);
      translateX.value = withSpring(Math.min(mTx, Math.max(-mTx, translateX.value)), { damping: 20 });
      translateY.value = withSpring(Math.min(mTy, Math.max(-mTy, translateY.value)), { damping: 20 });
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const imageAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // Confirm: convert current state to { x, y, scale }
  const handleConfirm = useCallback(() => {
    const cs = coverScale_SV.value;
    const s = scale.value;
    const tx = translateX.value;
    const ty = translateY.value;
    const bH = baseH_SV.value;

    const dW = screenWidth * s;
    const dH = bH * s;
    const mTx = Math.max(0, (dW - cropW) / 2);
    const mTy = Math.max(0, (dH - cropH) / 2);

    const x = mTx > 0 ? Math.round(50 * (1 - tx / mTx)) : 50;
    const y = mTy > 0 ? Math.round(50 * (1 - ty / mTy)) : 50;
    const zoom = cs > 0 ? Math.round((s / cs) * 100) / 100 : 1;

    onConfirm({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
      scale: Math.max(1, zoom),
    });
  }, [screenWidth, cropW, cropH, coverScale_SV, baseH_SV, scale, translateX, translateY, onConfirm]);

  if (!visible || !imageUri) return null;

  const imageTop = (screenHeight - displayBaseH) / 2;
  const cropTop = (screenHeight - cropH) / 2;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.container}>
          <GestureDetector gesture={composedGesture}>
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  top: imageTop,
                  left: 0,
                  width: screenWidth,
                  height: displayBaseH,
                },
                imageAnimStyle,
              ]}
            >
              <Image
                source={{ uri: imageUri }}
                style={{ width: '100%', height: '100%' }}
                contentFit="fill"
                onLoad={handleImageLoad}
              />
            </Animated.View>
          </GestureDetector>

          {/* Dark overlay — top */}
          <View pointerEvents="none" style={[styles.overlay, { top: 0, height: cropTop }]} />
          {/* Dark overlay — bottom */}
          <View pointerEvents="none" style={[styles.overlay, { top: cropTop + cropH, bottom: 0 }]} />

          {/* Crop window border */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute', top: cropTop, left: 0,
              width: cropW, height: cropH,
              borderTopWidth: 1, borderBottomWidth: 1,
              borderColor: 'rgba(255,255,255,0.4)',
            }}
          />

          {/* Action buttons */}
          <View style={[styles.actions, { top: insets.top + 12, right: 16 }]}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.6 : 1 }]}
            >
              <LucideIcon name="x" size={22} color="#FF6B6B" />
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.6 : 1 }]}
            >
              <LucideIcon name="check" size={22} color="#4ADE80" />
            </Pressable>
          </View>

          <Text style={[styles.hint, { bottom: insets.bottom + 40 }]}>
            ピンチで拡大 / ドラッグで位置調整
          </Text>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  overlay: { position: 'absolute', left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)' },
  actions: { position: 'absolute', flexDirection: 'row', gap: 12, zIndex: 10 },
  actionBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  hint: {
    position: 'absolute', left: 0, right: 0,
    textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 13,
  },
});
