/**
 * Base64画像をSupabase Storageに移行するスクリプト
 *
 * 実行方法: npm run migrate:base64
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// .env.localを読み込む
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const BUCKET_NAME = 'board-images'

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('環境変数が設定されていません')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '設定済み' : '未設定')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '設定済み' : '未設定')
  process.exit(1)
}

// サービスロールキーでクライアント作成（RLSをバイパス）
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

interface MigrationResult {
  total: number
  migrated: number
  failed: number
  errors: { nodeId: string; error: string }[]
}

/**
 * base64文字列かどうかを判定
 */
function isBase64Image(url: string): boolean {
  return url.startsWith('data:image/')
}

/**
 * base64文字列をBufferに変換
 */
function base64ToBuffer(base64: string): { buffer: Buffer; mimeType: string } {
  // data:image/jpeg;base64,xxxxx の形式を処理
  const matches = base64.match(/^data:([^;]+);base64,(.+)$/)
  if (!matches) {
    throw new Error('Invalid base64 format')
  }

  const mimeType = matches[1]
  const data = matches[2]
  const buffer = Buffer.from(data, 'base64')

  return { buffer, mimeType }
}

/**
 * MIMEタイプから拡張子を取得
 */
function getExtensionFromMime(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
  }
  return map[mimeType] || 'jpg'
}

/**
 * 単一ノードの画像を移行
 */
async function migrateNodeImage(
  nodeId: string,
  base64: string,
  userId: string,
  boardId: string
): Promise<string> {
  const { buffer, mimeType } = base64ToBuffer(base64)
  const extension = getExtensionFromMime(mimeType)

  // ファイル名をユニークにする
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const fileName = `${timestamp}-${random}-migrated.${extension}`
  const filePath = `${userId}/${boardId}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, buffer, {
      contentType: mimeType,
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`)
  }

  // 公開URLを取得
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath)

  return urlData.publicUrl
}

/**
 * メイン移行処理
 */
async function migrate(): Promise<MigrationResult> {
  console.log('=== Base64→Storage 移行スクリプト ===\n')

  const result: MigrationResult = {
    total: 0,
    migrated: 0,
    failed: 0,
    errors: [],
  }

  try {
    // 1. 全ての画像ノードを取得（user_idとboard_idが必要）
    console.log('ノードを取得中...')
    const { data: nodes, error } = await supabase
      .from('nodes')
      .select('id, image_url, user_id, board_id')
      .eq('type', 'image')
      .not('image_url', 'is', null)

    if (error) {
      throw new Error(`Failed to fetch nodes: ${error.message}`)
    }

    if (!nodes || nodes.length === 0) {
      console.log('画像ノードが見つかりませんでした')
      return result
    }

    console.log(`取得したノード数: ${nodes.length}`)

    // 2. base64画像のみをフィルタ
    const base64Nodes = nodes.filter(node =>
      node.image_url && isBase64Image(node.image_url)
    )

    result.total = base64Nodes.length

    if (result.total === 0) {
      console.log('\n移行対象のbase64画像はありませんでした（既にすべてStorage URL）')
      return result
    }

    console.log(`移行対象のbase64画像: ${result.total}件\n`)

    // 3. 各ノードを移行
    for (let i = 0; i < base64Nodes.length; i++) {
      const node = base64Nodes[i]
      const progress = `[${i + 1}/${result.total}]`

      try {
        console.log(`${progress} ノード ${node.id} を移行中...`)

        const storageUrl = await migrateNodeImage(
          node.id,
          node.image_url,
          node.user_id,
          node.board_id
        )

        // DBを更新
        const { error: updateError } = await supabase
          .from('nodes')
          .update({ image_url: storageUrl })
          .eq('id', node.id)

        if (updateError) {
          throw new Error(`DB update failed: ${updateError.message}`)
        }

        result.migrated++
        console.log(`${progress} 完了: ${storageUrl.substring(0, 80)}...`)
      } catch (err) {
        result.failed++
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        result.errors.push({ nodeId: node.id, error: errorMessage })
        console.error(`${progress} 失敗: ${errorMessage}`)
      }
    }

    return result
  } catch (err) {
    console.error('移行処理でエラーが発生しました:', err)
    throw err
  }
}

// 実行
migrate()
  .then(result => {
    console.log('\n=== 移行結果 ===')
    console.log(`対象: ${result.total}件`)
    console.log(`成功: ${result.migrated}件`)
    console.log(`失敗: ${result.failed}件`)

    if (result.errors.length > 0) {
      console.log('\nエラー詳細:')
      result.errors.forEach(({ nodeId, error }) => {
        console.log(`  - ${nodeId}: ${error}`)
      })
    }

    console.log('\n移行が完了しました')
    console.log('※ ブラウザのlocalStorageをクリアしてください')

    process.exit(result.failed > 0 ? 1 : 0)
  })
  .catch(err => {
    console.error('致命的なエラー:', err)
    process.exit(1)
  })
