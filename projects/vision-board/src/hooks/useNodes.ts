'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { nodeToSupabase, supabaseToNode } from '@/lib/nodeMapper'

export interface Node {
  id: string
  type: 'image' | 'text'
  x: number
  y: number
  width: number
  height: number
  // 画像ノード専用
  src?: string
  shape?: string
  hoverFontSize?: string
  hoverTextColor?: string
  clearPercent?: number  // クリア度 0〜100（ブラー値計算用）
  // テキストノード専用
  content?: string
  fontSize?: number
  color?: string
  fontFamily?: string
}

// ✅ ローカルキャッシュのキー
const getCacheKey = (boardId: string) => `vision-board-nodes-${boardId}`

// ✅ キャッシュからノードを読み込む
const loadFromCache = (boardId: string): Node[] | null => {
  if (typeof window === 'undefined') return null
  try {
    const cached = localStorage.getItem(getCacheKey(boardId))
    if (cached) {
      return JSON.parse(cached)
    }
  } catch (e) {
    console.warn('Failed to load from cache:', e)
  }
  return null
}

// ✅ キャッシュにノードを保存
const saveToCache = (boardId: string, nodes: Node[]) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(getCacheKey(boardId), JSON.stringify(nodes))
  } catch (e) {
    console.warn('Failed to save to cache:', e)
  }
}

// ✅ 全ボードのキャッシュをクリア（移行後に使用）
export const clearAllNodesCache = () => {
  if (typeof window === 'undefined') return
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('vision-board-nodes-')) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
    console.log(`Cleared ${keysToRemove.length} cache entries`)
  } catch (e) {
    console.warn('Failed to clear cache:', e)
  }
}

// ✅ boardIdとuserIdを引数で受け取る（useAuthは使わない）
export function useNodes(boardId?: string, userId?: string) {
  // ✅ 必須: useMemoでキャッシュ
  const supabase = useMemo(() => createClient(), [])

  const [nodes, setNodes] = useState<Node[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const initialLoadDone = useRef(false)

  // 初期ロード（キャッシュ優先）
  useEffect(() => {
    if (!boardId) {
      setLoading(false)
      return
    }

    // 既にロード済みなら何もしない
    if (initialLoadDone.current) return
    initialLoadDone.current = true

    const loadNodes = async () => {
      try {
        setError(null)

        // ✅ Step 1: キャッシュから即時表示
        const cachedNodes = loadFromCache(boardId)
        if (cachedNodes && cachedNodes.length > 0) {
          setNodes(cachedNodes)
          setLoading(false)  // キャッシュがあれば即座にローディング解除
        }

        // ✅ Step 2: バックグラウンドでDBから最新を取得
        const { data, error: fetchError } = await supabase
          .from('nodes')
          .select('*')
          .eq('board_id', boardId)
          .order('created_at', { ascending: true })

        if (fetchError) throw fetchError

        const freshNodes = (data || []).map(supabaseToNode)
        setNodes(freshNodes)
        saveToCache(boardId, freshNodes)  // キャッシュを更新
      } catch (err) {
        console.error('Failed to load nodes:', err)
        setError(err instanceof Error ? err : new Error('Failed to load nodes'))
      } finally {
        setLoading(false)
      }
    }

    loadNodes()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId])  // ✅ supabaseは入れない

  const addNode = useCallback(async (node: Omit<Node, 'id'>) => {
    if (!boardId || !userId) {
      console.warn('boardId and userId are required for addNode')
      return null
    }

    try {
      const { data, error: insertError } = await supabase
        .from('nodes')
        .insert(nodeToSupabase(node as Node, boardId, userId))
        .select()
        .single()

      if (insertError) throw insertError

      const newNode = supabaseToNode(data)
      setNodes(prev => {
        const updated = [...prev, newNode]
        saveToCache(boardId, updated)  // ✅ キャッシュも更新
        return updated
      })
      return newNode
    } catch (err) {
      console.error('Failed to add node:', err)
      throw err
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, userId])  // ✅ supabaseは入れない

  const updateNode = useCallback(async (updatedNode: Node) => {
    if (!boardId || !userId) {
      console.warn('boardId and userId are required for updateNode')
      return
    }

    try {
      // 楽観的UI更新: まずローカルを更新（キャッシュも同時更新）
      setNodes(prev => {
        const updated = prev.map(n => n.id === updatedNode.id ? updatedNode : n)
        saveToCache(boardId, updated)  // ✅ キャッシュも更新
        return updated
      })

      const { error: updateError } = await supabase
        .from('nodes')
        .update(nodeToSupabase(updatedNode, boardId, userId))
        .eq('id', updatedNode.id)

      if (updateError) throw updateError
    } catch (err) {
      console.error('Failed to update node:', err)
      // エラー時は再読み込み
      const { data } = await supabase
        .from('nodes')
        .select('*')
        .eq('board_id', boardId)
        .order('created_at', { ascending: true })

      if (data) {
        const freshNodes = data.map(supabaseToNode)
        setNodes(freshNodes)
        saveToCache(boardId, freshNodes)  // ✅ エラー回復時もキャッシュ更新
      }
      throw err
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, userId])  // ✅ supabaseは入れない

  const deleteNode = useCallback(async (nodeId: string) => {
    if (!boardId) {
      console.warn('boardId is required for deleteNode')
      return
    }

    try {
      // 楽観的UI更新: まずローカルを更新（キャッシュも同時更新）
      setNodes(prev => {
        const updated = prev.filter(n => n.id !== nodeId)
        saveToCache(boardId, updated)  // ✅ キャッシュも更新
        return updated
      })

      const { error: deleteError } = await supabase
        .from('nodes')
        .delete()
        .eq('id', nodeId)

      if (deleteError) throw deleteError
    } catch (err) {
      console.error('Failed to delete node:', err)
      // エラー時は再読み込み
      const { data } = await supabase
        .from('nodes')
        .select('*')
        .eq('board_id', boardId)
        .order('created_at', { ascending: true })

      if (data) {
        const freshNodes = data.map(supabaseToNode)
        setNodes(freshNodes)
        saveToCache(boardId, freshNodes)  // ✅ エラー回復時もキャッシュ更新
      }
      throw err
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId])  // ✅ supabaseは入れない

  return {
    nodes,
    addNode,
    updateNode,
    deleteNode,
    loading,
    error,
  }
}
