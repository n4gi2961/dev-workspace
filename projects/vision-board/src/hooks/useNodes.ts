'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
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
  // テキストノード専用
  content?: string
  fontSize?: number
  color?: string
  fontFamily?: string
}

// ✅ boardIdとuserIdを引数で受け取る（useAuthは使わない）
export function useNodes(boardId?: string, userId?: string) {
  // ✅ 必須: useMemoでキャッシュ
  const supabase = useMemo(() => createClient(), [])

  const [nodes, setNodes] = useState<Node[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // 初期ロード
  useEffect(() => {
    if (!boardId) {
      setLoading(false)
      return
    }

    const loadNodes = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data, error: fetchError } = await supabase
          .from('nodes')
          .select('*')
          .eq('board_id', boardId)
          .order('created_at', { ascending: true })

        if (fetchError) throw fetchError
        setNodes((data || []).map(supabaseToNode))
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
      setNodes(prev => [...prev, newNode])
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
      // 楽観的UI更新: まずローカルを更新
      setNodes(prev => prev.map(n => n.id === updatedNode.id ? updatedNode : n))

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
        setNodes(data.map(supabaseToNode))
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
      // 楽観的UI更新: まずローカルを更新
      setNodes(prev => prev.filter(n => n.id !== nodeId))

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
        setNodes(data.map(supabaseToNode))
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
