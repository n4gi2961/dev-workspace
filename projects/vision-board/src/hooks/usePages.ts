'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  pageToSupabase,
  milestoneToSupabase,
  routineToSupabase,
  supabaseToPage,
  type SupabasePage,
  type SupabaseMilestone,
  type SupabaseRoutine,
  type SupabaseRoutineHistory,
} from '@/lib/pageMapper'

export interface Page {
  title: string
  description: string
  headerImage: string | null
  category: string
  targetDecade: string
  milestones: Array<{
    id: string
    title: string
    completed: boolean
    completedAt: number | null
  }>
  routines: Array<{
    id: string
    title: string
    color: string
    history: Record<string, boolean>
  }>
  blocks: any[]
  createdAt: number
  updatedAt: number
}

export function usePages(nodeIds: string[] = []) {
  // useMemo でキャッシュ
  const supabase = useMemo(() => createClient(), [])

  const [pages, setPages] = useState<Record<string, Page>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // 前回のnodeIdsを記憶して、変更があった時だけ再ロード
  const prevNodeIdsRef = useRef<string>('')
  const nodeIdsKey = nodeIds.sort().join(',')

  // nodeIdsが変更されたらページをロード
  useEffect(() => {
    // 前回と同じなら何もしない
    if (prevNodeIdsRef.current === nodeIdsKey) {
      return
    }
    prevNodeIdsRef.current = nodeIdsKey

    if (nodeIds.length === 0) {
      setLoading(false)
      return
    }

    const loadPages = async () => {
      try {
        setLoading(true)
        setError(null)

        // 全nodeIdに対するページを取得
        const { data: pagesData, error: pagesError } = await supabase
          .from('pages')
          .select('*')
          .in('node_id', nodeIds)

        if (pagesError) throw pagesError

        if (!pagesData || pagesData.length === 0) {
          setPages({})
          return
        }

        // 関連するmilestones, routinesを取得
        const pageNodeIds = pagesData.map(p => p.node_id)

        const [milestonesResult, routinesResult] = await Promise.all([
          supabase.from('milestones').select('*').in('node_id', pageNodeIds),
          supabase.from('routines').select('*').in('node_id', pageNodeIds),
        ])

        if (milestonesResult.error) throw milestonesResult.error
        if (routinesResult.error) throw routinesResult.error

        // routine_historyを取得
        const routineIds = (routinesResult.data || []).map(r => r.id)
        let routineHistoryData: SupabaseRoutineHistory[] = []

        if (routineIds.length > 0) {
          const { data, error: historyError } = await supabase
            .from('routine_history')
            .select('*')
            .in('routine_id', routineIds)

          if (historyError) throw historyError
          routineHistoryData = data || []
        }

        // node_idでグループ化
        const milestonesByNode: Record<string, SupabaseMilestone[]> = {}
        const routinesByNode: Record<string, SupabaseRoutine[]> = {}

        for (const m of milestonesResult.data || []) {
          if (!milestonesByNode[m.node_id]) milestonesByNode[m.node_id] = []
          milestonesByNode[m.node_id].push(m)
        }

        for (const r of routinesResult.data || []) {
          if (!routinesByNode[r.node_id]) routinesByNode[r.node_id] = []
          routinesByNode[r.node_id].push(r)
        }

        // ページデータを構築
        const pagesRecord: Record<string, Page> = {}
        for (const pageData of pagesData) {
          const nodeId = pageData.node_id
          const milestones = milestonesByNode[nodeId] || []
          const routines = routinesByNode[nodeId] || []

          // このノードのルーティンに関連する履歴だけをフィルタ
          const routineIdsForNode = routines.map(r => r.id)
          const historyForNode = routineHistoryData.filter(h =>
            routineIdsForNode.includes(h.routine_id)
          )

          pagesRecord[nodeId] = supabaseToPage(
            pageData,
            milestones,
            routines,
            historyForNode
          )
        }

        setPages(pagesRecord)
      } catch (err) {
        console.error('Failed to load pages:', err)
        setError(err instanceof Error ? err : new Error('Failed to load pages'))
      } finally {
        setLoading(false)
      }
    }

    loadPages()
  }, [nodeIdsKey, supabase])

  const updatePage = useCallback(async (nodeId: string, pageData: Page) => {
    try {
      // 楽観的UI更新
      setPages(prev => ({ ...prev, [nodeId]: pageData }))

      // ページが存在するか確認
      const { data: existingPage } = await supabase
        .from('pages')
        .select('id')
        .eq('node_id', nodeId)
        .single()

      if (existingPage) {
        // 更新
        const { error: updateError } = await supabase
          .from('pages')
          .update(pageToSupabase(pageData, nodeId))
          .eq('node_id', nodeId)

        if (updateError) throw updateError
      } else {
        // 新規作成
        const { error: insertError } = await supabase
          .from('pages')
          .insert(pageToSupabase(pageData, nodeId))

        if (insertError) throw insertError
      }

      // Milestones更新: 既存を削除して再挿入
      await supabase.from('milestones').delete().eq('node_id', nodeId)

      if (pageData.milestones.length > 0) {
        const milestonesToInsert = pageData.milestones.map((m, idx) =>
          milestoneToSupabase(m, nodeId, idx)
        )
        const { error: milestoneError } = await supabase
          .from('milestones')
          .insert(milestonesToInsert)

        if (milestoneError) throw milestoneError
      }

      // Routines更新: 既存のroutine_historyも考慮
      // まず現在のroutinesを取得
      const { data: existingRoutines } = await supabase
        .from('routines')
        .select('id')
        .eq('node_id', nodeId)

      // 既存のroutine_historyを削除（routineが削除されると自動削除されるが念のため）
      if (existingRoutines && existingRoutines.length > 0) {
        const existingRoutineIds = existingRoutines.map(r => r.id)
        await supabase
          .from('routine_history')
          .delete()
          .in('routine_id', existingRoutineIds)
      }

      // 既存routinesを削除
      await supabase.from('routines').delete().eq('node_id', nodeId)

      if (pageData.routines.length > 0) {
        // 新しいroutinesを挿入
        const routinesToInsert = pageData.routines.map((r, idx) =>
          routineToSupabase(r, nodeId, idx)
        )
        const { error: routineError } = await supabase
          .from('routines')
          .insert(routinesToInsert)

        if (routineError) throw routineError

        // routine_historyを挿入
        const historyToInsert: Array<{
          routine_id: string
          date: string
          completed: boolean
        }> = []

        for (const routine of pageData.routines) {
          for (const [date, completed] of Object.entries(routine.history)) {
            historyToInsert.push({
              routine_id: routine.id,
              date,
              completed,
            })
          }
        }

        if (historyToInsert.length > 0) {
          const { error: historyError } = await supabase
            .from('routine_history')
            .insert(historyToInsert)

          if (historyError) throw historyError
        }
      }
    } catch (err) {
      console.error('Failed to update page:', err)
      throw err
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])  // supabaseはuseMemoでキャッシュ済み

  const getPage = useCallback((nodeId: string) => {
    return pages[nodeId]
  }, [pages])

  return {
    pages,
    updatePage,
    getPage,
    loading,
    error,
  }
}
