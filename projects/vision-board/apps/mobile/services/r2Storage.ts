/**
 * R2 Storage Service — Cloudflare R2 Worker API client
 *
 * Implements the StorageService interface from @vision-board/shared.
 * Handles presigned URL flow: POST /upload/presign → PUT /upload/:key
 */

import type { StorageService, UploadResult } from '@vision-board/shared/lib';

const WORKER_URL = process.env.EXPO_PUBLIC_WORKER_URL ?? '';

interface PresignResponse {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  contentType: string;
}

class R2StorageService implements StorageService {
  async uploadImage(
    file: Blob | ArrayBuffer,
    userId: string,
    boardId: string,
    fileName: string,
    contentType: string,
    authToken: string,
    onProgress?: (percent: number) => void,
  ): Promise<UploadResult> {
    if (!WORKER_URL) {
      throw new Error('EXPO_PUBLIC_WORKER_URL is not configured');
    }

    // 1. Get presigned URL
    const presignRes = await fetch(`${WORKER_URL}/upload/presign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ boardId, fileName, contentType }),
    });

    if (!presignRes.ok) {
      const err = await presignRes.json().catch(() => ({ error: 'Presign failed' }));
      throw new Error((err as { error: string }).error || `Presign failed: ${presignRes.status}`);
    }

    const { uploadUrl, publicUrl, key } = (await presignRes.json()) as PresignResponse;

    // 2. Upload binary via XHR for progress tracking
    await this.uploadWithProgress(uploadUrl, file, contentType, authToken, onProgress);

    return { publicUrl, key };
  }

  async deleteImage(key: string, authToken: string): Promise<void> {
    if (!WORKER_URL) return;

    const res = await fetch(`${WORKER_URL}/images/${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (!res.ok && res.status !== 404) {
      throw new Error(`Failed to delete image: ${res.status}`);
    }
  }

  private uploadWithProgress(
    url: string,
    data: Blob | ArrayBuffer,
    contentType: string,
    authToken: string,
    onProgress?: (percent: number) => void,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url);
      xhr.setRequestHeader('Content-Type', contentType);
      xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);

      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            onProgress(Math.round((event.loaded / event.total) * 100));
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.ontimeout = () => reject(new Error('Upload timed out'));
      xhr.send(data);
    });
  }
}

export const r2Storage = new R2StorageService();
