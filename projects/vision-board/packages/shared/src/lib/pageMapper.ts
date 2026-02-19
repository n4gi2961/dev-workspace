/**
 * TypeScript Page型 ⇔ Supabase pages テーブル の変換
 * ★ 新スキーマ: user_id を直接持つ
 */

// フロントエンドで使用するPage型
export interface ImageCropPosition {
  x: number  // 0-100 (50=center), horizontal position
  y: number  // 0-100 (50=center), vertical position
  scale: number  // zoom multiplier (1.0 = cover fit, 2.0 = 2x zoom)
}

export interface Page {
  title: string
  description: string
  headerImage?: string
  headerImageCrop?: ImageCropPosition
  category?: string
  targetDecade?: string
  blocks: Block[]
  milestones: Milestone[]
  routines: Routine[]
  frozenDates?: FrozenDate[]  // 凍結日リスト
  updatedAt?: number
}

export interface Block {
  id: string
  type: string
  content: string
  children?: Block[]
  collapsed?: boolean
}

export interface Milestone {
  id: string
  title: string
  completed: boolean
  completedAt?: string
}

export interface Routine {
  id: string
  boardId: string  // ボードに紐づく
  title: string
  color: string
  history: Record<string, boolean>
  createdAt?: string  // ルーティン作成日（ISO 8601形式）
  activeDays?: number[]  // 実行する曜日 (0=日曜, 1=月曜, ..., 6=土曜)。undefinedは毎日実行
  stackId?: string | null  // 所属するスタックID（nullは個別ルーティン）
  stackOrder?: number  // スタック内の順序
  displayOrder?: number  // トップレベルでの表示順（routine_nodes.sort_order から付与）
}

// ルーティンスタック（Habit Stacking用グループ）
export interface RoutineStack {
  id: string
  boardId: string
  nodeId: string
  userId?: string
  title: string
  sortOrder: number
  createdAt?: string
}

// ノードとルーティンの関連（中間テーブル）
export interface RoutineNode {
  id: string
  routineId: string
  nodeId: string
  sortOrder: number
}

export interface FrozenDate {
  id: string
  date: string  // YYYY-MM-DD形式
}

// Supabaseのpagesテーブルの型
export interface SupabasePage {
  id: string
  node_id: string
  user_id: string
  title: string
  description: string
  header_image: string | null
  header_image_crop: { x: number; y: number } | null
  category: string | null
  target_decade: string | null
  blocks: Block[]
  created_at: string
  updated_at: string
}

/**
 * TypeScript Page → Supabase形式に変換
 * ★ user_id を必須パラメータとして追加
 */
export function pageToSupabase(
  page: Partial<Page>,
  nodeId: string,
  userId: string
): Partial<Omit<SupabasePage, 'id' | 'created_at' | 'updated_at'>> {
  return {
    node_id: nodeId,
    user_id: userId,
    title: page.title || '',
    description: page.description || '',
    header_image: page.headerImage || null,
    header_image_crop: page.headerImageCrop || null,
    category: page.category || null,
    target_decade: page.targetDecade || null,
    blocks: page.blocks || [],
  }
}

/**
 * Supabase形式 → TypeScript Pageに変換
 * （milestones, routines, frozenDatesは別途取得して結合する）
 */
export function supabaseToPage(
  data: SupabasePage,
  milestones: Milestone[] = [],
  routines: Routine[] = [],
  frozenDates: FrozenDate[] = []
): Page {
  return {
    title: data.title || '',
    description: data.description || '',
    headerImage: data.header_image || undefined,
    headerImageCrop: data.header_image_crop || undefined,
    category: data.category || undefined,
    targetDecade: data.target_decade || undefined,
    blocks: data.blocks || [],
    milestones,
    routines,
    frozenDates,
    updatedAt: new Date(data.updated_at).getTime(),
  }
}

/**
 * 初期ページデータを作成
 */
export function createInitialPage(): Page {
  return {
    title: '',
    description: '',
    blocks: [],
    milestones: [],
    routines: [],
    frozenDates: [],
  }
}
