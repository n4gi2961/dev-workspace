/**
 * TypeScript Node型 ⇔ Supabase nodes テーブル の変換
 */

import type { Node } from '@/hooks/useNodes'

// Supabaseのnodesテーブルの型
export interface SupabaseNode {
  id: string
  board_id: string
  user_id: string  // ✅ 追加
  type: string
  x: number
  y: number
  width: number
  height: number
  z_index: number | null
  image_url: string | null
  shape: string | null
  hover_font_size: string | null
  hover_text_color: string | null
  content: string | null
  font_size: number | null
  color: string | null
  font_family: string | null
  clear_percent: number | null  // クリア度 0〜100
  created_at: string
  updated_at: string
}

/**
 * TypeScript Node → Supabase形式に変換
 */
export function nodeToSupabase(
  node: Partial<Node>,
  boardId: string,
  userId: string  // ✅ 必須パラメータ
): Partial<Omit<SupabaseNode, 'created_at' | 'updated_at'>> {
  const result: Partial<Omit<SupabaseNode, 'created_at' | 'updated_at'>> = {
    board_id: boardId,
    user_id: userId,  // ✅ 必須
    type: node.type || 'image',
    x: node.x || 0,
    y: node.y || 0,
    width: node.width || 200,
    height: node.height || 200,
    image_url: node.src || null,
    shape: node.shape || null,
    hover_font_size: node.hoverFontSize || null,
    hover_text_color: node.hoverTextColor || null,
    content: node.content || null,
    font_size: node.fontSize || null,
    color: node.color || null,
    font_family: node.fontFamily || null,
    clear_percent: node.clearPercent ?? 0,  // クリア度
  }

  // IDがある場合のみ含める（新規作成時はSupabaseが自動生成）
  if (node.id) {
    result.id = node.id
  }

  return result
}

/**
 * Supabase形式 → TypeScript Nodeに変換
 */
export function supabaseToNode(data: SupabaseNode): Node {
  return {
    id: data.id,
    type: data.type as 'image' | 'text',
    x: data.x,
    y: data.y,
    width: data.width,
    height: data.height,
    src: data.image_url || undefined,
    shape: data.shape || undefined,
    hoverFontSize: data.hover_font_size || undefined,
    hoverTextColor: data.hover_text_color || undefined,
    content: data.content || undefined,
    fontSize: data.font_size || undefined,
    color: data.color || undefined,
    fontFamily: data.font_family || undefined,
    clearPercent: data.clear_percent ?? 0,  // クリア度
  }
}
