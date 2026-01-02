/**
 * TypeScript Page型 ⇔ Supabase pages/milestones/routines テーブル の変換
 */

import type { Page } from '@/hooks/usePages'

// Supabaseのテーブル型定義
export interface SupabasePage {
  id: string
  node_id: string
  title: string | null
  description: string | null
  header_image: string | null
  category: string | null
  target_decade: string | null
  blocks: any[] | null
  created_at: string
  updated_at: string
}

export interface SupabaseMilestone {
  id: string
  node_id: string
  title: string
  completed: boolean
  completed_at: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface SupabaseRoutine {
  id: string
  node_id: string
  title: string
  color: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface SupabaseRoutineHistory {
  id: string
  routine_id: string
  date: string
  completed: boolean
}

/**
 * TypeScript Page → Supabase pages 形式に変換
 */
export function pageToSupabase(
  page: Partial<Page>,
  nodeId: string
): Partial<Omit<SupabasePage, 'id' | 'created_at' | 'updated_at'>> {
  return {
    node_id: nodeId,
    title: page.title || '',
    description: page.description || '',
    header_image: page.headerImage || null,
    category: page.category || null,
    target_decade: page.targetDecade || null,
    blocks: page.blocks || [],
  }
}

/**
 * TypeScript Milestone → Supabase形式に変換
 */
export function milestoneToSupabase(
  milestone: Page['milestones'][0],
  nodeId: string,
  sortOrder: number
): Omit<SupabaseMilestone, 'created_at' | 'updated_at'> {
  return {
    id: milestone.id,
    node_id: nodeId,
    title: milestone.title,
    completed: milestone.completed,
    completed_at: milestone.completedAt ? new Date(milestone.completedAt).toISOString() : null,
    sort_order: sortOrder,
  }
}

/**
 * TypeScript Routine → Supabase形式に変換
 */
export function routineToSupabase(
  routine: Page['routines'][0],
  nodeId: string,
  sortOrder: number
): Omit<SupabaseRoutine, 'created_at' | 'updated_at'> {
  return {
    id: routine.id,
    node_id: nodeId,
    title: routine.title,
    color: routine.color,
    sort_order: sortOrder,
  }
}

/**
 * Supabase形式 → TypeScript Pageに変換
 */
export function supabaseToPage(
  pageData: SupabasePage,
  milestones: SupabaseMilestone[],
  routines: SupabaseRoutine[],
  routineHistory: SupabaseRoutineHistory[]
): Page {
  // routine_historyをroutine_idでグループ化
  const historyByRoutine: Record<string, Record<string, boolean>> = {}
  for (const h of routineHistory) {
    if (!historyByRoutine[h.routine_id]) {
      historyByRoutine[h.routine_id] = {}
    }
    historyByRoutine[h.routine_id][h.date] = h.completed
  }

  return {
    title: pageData.title || '',
    description: pageData.description || '',
    headerImage: pageData.header_image,
    category: pageData.category || '',
    targetDecade: pageData.target_decade || '',
    milestones: milestones
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(m => ({
        id: m.id,
        title: m.title,
        completed: m.completed,
        completedAt: m.completed_at ? new Date(m.completed_at).getTime() : null,
      })),
    routines: routines
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(r => ({
        id: r.id,
        title: r.title,
        color: r.color,
        history: historyByRoutine[r.id] || {},
      })),
    blocks: pageData.blocks || [],
    createdAt: new Date(pageData.created_at).getTime(),
    updatedAt: new Date(pageData.updated_at).getTime(),
  }
}
