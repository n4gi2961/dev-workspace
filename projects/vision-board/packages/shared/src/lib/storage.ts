/**
 * Platform-agnostic storage interface for image uploads.
 * Implementations are provided per-platform (mobile/web).
 */

export interface UploadResult {
  publicUrl: string;
  key: string;
}

export interface StorageService {
  /**
   * Request upload URL from the R2 Worker, then upload the image.
   * @returns Public CDN URL and storage key
   */
  uploadImage(
    file: Blob | ArrayBuffer,
    userId: string,
    boardId: string,
    fileName: string,
    contentType: string,
    authToken: string
  ): Promise<UploadResult>;

  /**
   * Delete an image from R2 storage.
   */
  deleteImage(key: string, authToken: string): Promise<void>;
}

/**
 * Check if a URL points to R2 storage (Worker-served images).
 */
export function isR2Url(url: string): boolean {
  // Matches Worker image URLs: /images/{key}
  return url.includes('/images/') && !url.includes('/storage/v1/');
}

/**
 * Check if a URL points to legacy Supabase Storage.
 */
export function isSupabaseStorageUrl(url: string): boolean {
  return url.includes('/storage/v1/object/public/board-images/');
}

/**
 * Determine the storage type of an image URL.
 */
export function getStorageType(url: string): 'r2' | 'supabase' | 'external' {
  if (isR2Url(url)) return 'r2';
  if (isSupabaseStorageUrl(url)) return 'supabase';
  return 'external';
}

/**
 * Extract the R2 key from a Worker image URL.
 */
export function extractR2Key(url: string): string | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/^\/images\/(.+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}
