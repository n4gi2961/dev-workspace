'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Page,
  SupabasePage,
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
 * - pages, milestones, routines に user_id を含める
 * - milestones, routines は node_id を参照（page_id ではなく）
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

      // ★ routinesはnode_idで取得
      const { data: routinesData } = await supabase
        .from('routines')
        .select('*')
        .eq('node_id', nodeId)
        .order('sort_order', { ascending: true })

      // 変換して返す
      const milestones = (milestonesData || []).map((m: { id: string; title: string; completed: boolean; completed_at?: string }) => ({
        id: m.id,
        title: m.title,
        completed: m.completed,
        completedAt: m.completed_at || undefined,
      }))

      const routines = (routinesData || []).map((r: { id: string; title: string; color: string; history?: Record<string, boolean> }) => ({
        id: r.id,
        title: r.title,
        color: r.color,
        history: r.history || {},
      }))

      return supabaseToPage(pageData as SupabasePage, milestones, routines)
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
   * ★ milestones, routines は node_id で削除
   */
  const deletePage = useCallback(async (nodeId: string): Promise<boolean> => {
    if (!userId) return false

    try {
      // ★ milestonesをnode_idで削除
      await supabase
        .from('milestones')
        .delete()
        .eq('node_id', nodeId)

      // ★ routinesをnode_idで削除
      await supabase
        .from('routines')
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

  /**
   * ルーティンを保存
   * ★ node_id と user_id を使用
   */
  const saveRoutines = useCallback(async (
    nodeId: string,
    routines: Page['routines']
  ): Promise<boolean> => {
    if (!userId) return false

    try {
      // ★ 既存のroutinesをnode_idで削除
      await supabase
        .from('routines')
        .delete()
        .eq('node_id', nodeId)

      if (routines.length > 0) {
        // ★ node_id と user_id を含める
        const routinesData = routines.map((r, index) => ({
          id: r.id,
          node_id: nodeId,
          user_id: userId,
          title: r.title,
          color: r.color,
          history: r.history,
          sort_order: index,
        }))

        const { error } = await supabase
          .from('routines')
          .insert(routinesData)

        if (error) throw error
      }

      // ローカルステートを更新
      setPages(prev => ({
        ...prev,
        [nodeId]: {
          ...createInitialPage(),
          ...prev[nodeId],
          routines,
        }
      }))

      return true
    } catch (err) {
      console.error('Failed to save routines:', err)
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
    saveRoutines,
  }
}
