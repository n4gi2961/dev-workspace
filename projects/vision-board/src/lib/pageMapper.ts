/**
 * TypeScript Page型 ⇔ Supabase pages テーブル の変換
 * ★ 新スキーマ: user_id を直接持つ
 */

// フロントエンドで使用するPage型
export interface Page {
  title: string
  description: string
  headerImage?: string
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
