'use client'

import { createClient } from './client.web'

const BUCKET_NAME = 'board-images'

/**
 * 画像をSupabase Storageにアップロードし、公開URLを返す
 * @param file - アップロードするファイル
 * @param userId - ユーザーID（フォルダパスに使用）
 * @param boardId - ボードID（フォルダパスに使用）
 * @returns 公開URL
 */
export async function uploadImage(
  file: File,
  userId: string,
  boardId: string
): Promise<string> {
  const supabase = createClient()

  // ファイル名をユニークにする（タイムスタンプ + ランダム）
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const extension = file.name.split('.').pop() || 'jpg'
  const fileName = `${timestamp}-${random}.${extension}`

  // パス: userId/boardId/fileName（RLSポリシーに合わせる）
  const filePath = `${userId}/${boardId}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    console.error('Storage upload error:', uploadError)
    throw new Error(`画像のアップロードに失敗しました: ${uploadError.message}`)
  }

  // 公開URLを取得
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath)

  return urlData.publicUrl
}

/**
 * Storageから画像を削除する
 * @param imageUrl - 削除する画像のURL
 * @param userId - ユーザーID
 */
export async function deleteImage(imageUrl: string, userId: string): Promise<void> {
  // URLからパスを抽出
  const url = new URL(imageUrl)
  const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/board-images\/(.+)/)
  if (!pathMatch) {
    console.warn('Invalid storage URL:', imageUrl)
    return
  }

  const filePath = decodeURIComponent(pathMatch[1])

  // 自分のファイルのみ削除可能（RLSで保護）
  if (!filePath.startsWith(userId)) {
    console.warn('Cannot delete file owned by another user')
    return
  }

  const supabase = createClient()
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([filePath])

  if (error) {
    console.error('Storage delete error:', error)
  }
}

/**
 * URLがStorage URLかどうかを判定
 */
export function isStorageUrl(url: string): boolean {
  return url.includes('/storage/v1/object/public/board-images/')
}
