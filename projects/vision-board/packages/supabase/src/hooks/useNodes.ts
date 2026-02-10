'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { createClient } from '../client.web'
import { nodeToSupabase, supabaseToNode, Node } from '@vision-board/shared/lib'

// Re-export Node type for consumers
export type { Node } from '@vision-board/shared/lib'

// ローカルキャッシュのキー
const getCacheKey = (boardId: string) => `vision-board-nodes-${boardId}`

// キャッシュからノードを読み込む
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

// キャッシュにノードを保存
const saveToCache = (boardId: string, nodes: Node[]) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(getCacheKey(boardId), JSON.stringify(nodes))
  } catch (e) {
    console.warn('Failed to save to cache:', e)
  }
}

// 全ボードのキャッシュをクリア
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

export function useNodes(boardId?: string, userId?: string) {
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

    if (initialLoadDone.current) return
    initialLoadDone.current = true

    const loadNodes = async () => {
      try {
        setError(null)

        // Step 1: キャッシュから即時表示
        const cachedNodes = loadFromCache(boardId)
        if (cachedNodes && cachedNodes.length > 0) {
          setNodes(cachedNodes)
          setLoading(false)
        }

        // Step 2: バックグラウンドでDBから最新を取得
        const { data, error: fetchError } = await supabase
          .from('nodes')
          .select('*')
          .eq('board_id', boardId)
          .order('created_at', { ascending: true })

        if (fetchError) throw fetchError

        const freshNodes = (data || []).map(supabaseToNode)
        setNodes(freshNodes)
        saveToCache(boardId, freshNodes)
      } catch (err) {
        console.error('Failed to load nodes:', err)
        setError(err instanceof Error ? err : new Error('Failed to load nodes'))
      } finally {
        setLoading(false)
      }
    }

    loadNodes()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId])

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
        saveToCache(boardId, updated)
        return updated
      })
      return newNode
    } catch (err) {
      console.error('Failed to add node:', err)
      throw err
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, userId])

  const updateNode = useCallback(async (updatedNode: Node) => {
    if (!boardId || !userId) {
      console.warn('boardId and userId are required for updateNode')
      return
    }

    try {
      // 楽観的UI更新
      setNodes(prev => {
        const updated = prev.map(n => n.id === updatedNode.id ? updatedNode : n)
        saveToCache(boardId, updated)
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
        saveToCache(boardId, freshNodes)
      }
      throw err
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, userId])

  const deleteNode = useCallback(async (nodeId: string) => {
    if (!boardId) {
      console.warn('boardId is required for deleteNode')
      return
    }

    try {
      // 楽観的UI更新
      setNodes(prev => {
        const updated = prev.filter(n => n.id !== nodeId)
        saveToCache(boardId, updated)
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
        saveToCache(boardId, freshNodes)
      }
      throw err
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId])

  return {
    nodes,
    addNode,
    updateNode,
    deleteNode,
    loading,
    error,
  }
}
