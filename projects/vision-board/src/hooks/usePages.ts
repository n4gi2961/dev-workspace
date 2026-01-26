'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Page,
  SupabasePage,
  FrozenDate,
  pageToSupabase,
  supabaseToPage,
  createInitialPage,
} from '@/lib/pageMapper'

/**
 * ページデータのSupabase永続化フック
 *
 * ✅ ルール:
 * 1. useMemoでSupabaseクライアントをキャッシュ
 * 2. useCallbackの依存配列にsupabaseを入れない
 * 3. userIdは親から受け取る（useAuthを使わない）
 *
 * ★ 新スキーマ対応:
 * - pages, milestones に user_id を含める
 * - milestones は node_id を参照（page_id ではなく）
 * - routines は useRoutines で管理（board_id + routine_nodes 中間テーブル）
 */
export function usePages(userId?: string) {
  // ✅ 必須: useMemoでキャッシュ
  const supabase = useMemo(() => createClient(), [])

  // nodeId -> Page のマップ
  const [pages, setPages] = useState<Record<string, Page>>({})
  const [loading, setLoading] = useState(true)

  /**
   * 特定のノードのページデータを取得
   */
  const loadPage = useCallback(async (nodeId: string): Promise<Page | null> => {
    if (!userId) return null

    try {
      // pagesテーブルから取得
      const { data: pageData, error: pageError } = await supabase
        .from('pages')
        .select('*')
        .eq('node_id', nodeId)
        .single()

      if (pageError) {
        // ページが存在しない場合は初期ページを返す
        if (pageError.code === 'PGRST116') {
          return createInitialPage()
        }
        console.error('Failed to load page:', pageError)
        return createInitialPage()
      }

      // ★ milestonesはnode_idで取得
      const { data: milestonesData } = await supabase
        .from('milestones')
        .select('*')
        .eq('node_id', nodeId)
        .order('sort_order', { ascending: true })

      // ★ routinesはuseRoutinesで管理（新スキーマ: board_id + routine_nodes）

      // ★ frozenDatesはnode_idで取得
      const { data: frozenDatesData } = await supabase
        .from('frozen_dates')
        .select('*')
        .eq('node_id', nodeId)

      // 変換して返す
      const milestones = (milestonesData || []).map((m: { id: string; title: string; completed: boolean; completed_at?: string }) => ({
        id: m.id,
        title: m.title,
        completed: m.completed,
        completedAt: m.completed_at || undefined,
      }))

      // routinesはuseRoutinesで管理するため空配列を渡す

      const frozenDates = (frozenDatesData || []).map((f: { id: string; date: string }) => ({
        id: f.id,
        date: f.date,
      }))

      return supabaseToPage(pageData as SupabasePage, milestones, [], frozenDates)
    } catch (err) {
      console.error('Failed to load page:', err)
      return createInitialPage()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])  // ✅ supabaseは入れない

  /**
   * ページを取得（キャッシュがあればそれを返す）
   */
  const getPage = useCallback(async (nodeId: string): Promise<Page> => {
    // キャッシュにあればそれを返す
    if (pages[nodeId]) {
      return pages[nodeId]
    }

    // なければロードしてキャッシュに保存
    const page = await loadPage(nodeId)
    const result = page || createInitialPage()

    setPages(prev => ({
      ...prev,
      [nodeId]: result
    }))

    return result
  }, [pages, loadPage])

  /**
   * ページを保存（upsert）
   * ★ user_id を含める
   */
  const savePage = useCallback(async (nodeId: string, page: Partial<Page>): Promise<boolean> => {
    if (!userId) return false

    try {
      // 既存のページIDを取得
      const { data: existingPage } = await supabase
        .from('pages')
        .select('id')
        .eq('node_id', nodeId)
        .single()

      // ★ userId を渡す
      const pageData = pageToSupabase(page, nodeId, userId)

      if (existingPage) {
        // 更新
        const { error } = await supabase
          .from('pages')
          .update(pageData)
          .eq('id', existingPage.id)

        if (error) throw error
      } else {
        // 新規作成
        const { error } = await supabase
          .from('pages')
          .insert(pageData)

        if (error) throw error
      }

      // ローカルステートも更新
      setPages(prev => ({
        ...prev,
        [nodeId]: {
          ...createInitialPage(),
          ...prev[nodeId],
          ...page,
          updatedAt: Date.now(),
        }
      }))

      return true
    } catch (err) {
      console.error('Failed to save page:', err)
      return false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])  // ✅ supabaseは入れない

  /**
   * ページのローカル状態を更新（楽観的更新用）
   */
  const updatePageLocal = useCallback((nodeId: string, updates: Partial<Page>) => {
    setPages(prev => ({
      ...prev,
      [nodeId]: {
        ...createInitialPage(),
        ...prev[nodeId],
        ...updates,
      }
    }))
  }, [])

  /**
   * ページを削除
   * ★ milestones, routines, frozen_dates は node_id で削除
   */
  const deletePage = useCallback(async (nodeId: string): Promise<boolean> => {
    if (!userId) return false

    try {
      // ★ milestonesをnode_idで削除
      await supabase
        .from('milestones')
        .delete()
        .eq('node_id', nodeId)

      // ★ routinesはuseRoutinesで管理（routine_nodesはCASCADEで削除される）

      // ★ frozen_datesをnode_idで削除
      await supabase
        .from('frozen_dates')
        .delete()
        .eq('node_id', nodeId)

      // ページを削除
      await supabase
        .from('pages')
        .delete()
        .eq('node_id', nodeId)

      // ローカルステートからも削除
      setPages(prev => {
        const newPages = { ...prev }
        delete newPages[nodeId]
        return newPages
      })

      return true
    } catch (err) {
      console.error('Failed to delete page:', err)
      return false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])  // ✅ supabaseは入れない

  /**
   * マイルストーンを保存
   * ★ node_id と user_id を使用
   */
  const saveMilestones = useCallback(async (
    nodeId: string,
    milestones: Page['milestones']
  ): Promise<boolean> => {
    if (!userId) return false

    try {
      // ★ 既存のmilestonesをnode_idで削除
      await supabase
        .from('milestones')
        .delete()
        .eq('node_id', nodeId)

      if (milestones.length > 0) {
        // ★ node_id と user_id を含める
        const milestonesData = milestones.map((m, index) => ({
          id: m.id,
          node_id: nodeId,
          user_id: userId,
          title: m.title,
          completed: m.completed,
          // completedAtが数値の場合はISO文字列に変換
          completed_at: m.completedAt
            ? (typeof m.completedAt === 'number'
                ? new Date(m.completedAt).toISOString()
                : m.completedAt)
            : null,
          sort_order: index,
        }))

        const { error } = await supabase
          .from('milestones')
          .insert(milestonesData)

        if (error) throw error
      }

      // ローカルステートを更新
      setPages(prev => ({
        ...prev,
        [nodeId]: {
          ...createInitialPage(),
          ...prev[nodeId],
          milestones,
        }
      }))

      return true
    } catch (err) {
      console.error('Failed to save milestones:', err)
      return false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])  // ✅ supabaseは入れない

  // ★ saveRoutinesは削除（useRoutinesで管理）

  /**
   * 凍結日を追加
   */
  const addFrozenDate = useCallback(async (
    nodeId: string,
    date: string
  ): Promise<boolean> => {
    if (!userId) return false

    try {
      const newFrozenDate = {
        node_id: nodeId,
        user_id: userId,
        date: date,
      }

      const { data, error } = await supabase
        .from('frozen_dates')
        .insert(newFrozenDate)
        .select()
        .single()

      if (error) throw error

      // ローカルステートを更新
      setPages(prev => {
        const currentPage = prev[nodeId] || createInitialPage()
        const currentFrozenDates = currentPage.frozenDates || []
        return {
          ...prev,
          [nodeId]: {
            ...currentPage,
            frozenDates: [...currentFrozenDates, { id: data.id, date: date }],
          }
        }
      })

      return true
    } catch (err) {
      console.error('Failed to add frozen date:', err)
      return false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])  // ✅ supabaseは入れない

  /**
   * 凍結日を削除
   */
  const removeFrozenDate = useCallback(async (
    nodeId: string,
    date: string
  ): Promise<boolean> => {
    if (!userId) return false

    try {
      const { error } = await supabase
        .from('frozen_dates')
        .delete()
        .eq('node_id', nodeId)
        .eq('date', date)

      if (error) throw error

      // ローカルステートを更新
      setPages(prev => {
        const currentPage = prev[nodeId] || createInitialPage()
        const currentFrozenDates = currentPage.frozenDates || []
        return {
          ...prev,
          [nodeId]: {
            ...currentPage,
            frozenDates: currentFrozenDates.filter(f => f.date !== date),
          }
        }
      })

      return true
    } catch (err) {
      console.error('Failed to remove frozen date:', err)
      return false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])  // ✅ supabaseは入れない

  // 初期化完了
  useEffect(() => {
    setLoading(false)
  }, [])

  return {
    pages,
    loading,
    getPage,
    savePage,
    updatePageLocal,
    deletePage,
    saveMilestones,
    // saveRoutinesは削除（useRoutinesで管理）
    addFrozenDate,
    removeFrozenDate,
  }
}
