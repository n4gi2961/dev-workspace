'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'

export interface Board {
  id: string
  user_id: string
  name: string
  description?: string
  thumbnail_url?: string
  created_at: string
  updated_at: string
}

export function useVisionBoard() {
  const { user } = useAuth()
  const supabase = createClient()
  const [boards, setBoards] = useState<Board[]>([])
  const [currentBoard, setCurrentBoard] = useState<Board | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // ボード一覧読み込み
  const loadBoards = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) throw error
      setBoards(data || [])

      // 最初のボードを自動選択（currentBoardが未設定の場合）
      if (data && data.length > 0 && !currentBoard) {
        setCurrentBoard(data[0])
      }
    } catch (err) {
      console.error('Failed to load boards:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [user, currentBoard, supabase])

  // ボード作成
  const createBoard = useCallback(async (name: string, description?: string) => {
    if (!user) throw new Error('User not authenticated')

    try {
      const { data, error } = await supabase
        .from('boards')
        .insert({ user_id: user.id, name, description })
        .select()
        .single()

      if (error) throw error

      setBoards(prev => [data, ...prev])
      setCurrentBoard(data)
      return data
    } catch (err) {
      console.error('Failed to create board:', err)
      setError(err as Error)
      throw err
    }
  }, [user, supabase])

  // ボード更新
  const updateBoard = useCallback(async (boardId: string, updates: Partial<Board>) => {
    try {
      const { data, error } = await supabase
        .from('boards')
        .update(updates)
        .eq('id', boardId)
        .select()
        .single()

      if (error) throw error

      setBoards(prev => prev.map(b => b.id === boardId ? data : b))
      if (currentBoard?.id === boardId) {
        setCurrentBoard(data)
      }
      return data
    } catch (err) {
      console.error('Failed to update board:', err)
      setError(err as Error)
      throw err
    }
  }, [currentBoard, supabase])

  // ボード削除
  const deleteBoard = useCallback(async (boardId: string) => {
    try {
      const { error } = await supabase
        .from('boards')
        .delete()
        .eq('id', boardId)

      if (error) throw error

      setBoards(prev => prev.filter(b => b.id !== boardId))
      if (currentBoard?.id === boardId) {
        setCurrentBoard(null)
      }
    } catch (err) {
      console.error('Failed to delete board:', err)
      setError(err as Error)
      throw err
    }
  }, [currentBoard, supabase])

  // 初期ロード
  useEffect(() => {
    loadBoards()
  }, [loadBoards])

  return {
    boards,
    currentBoard,
    loading,
    error,
    loadBoards,
    createBoard,
    updateBoard,
    deleteBoard,
    setCurrentBoard,
  }
}
