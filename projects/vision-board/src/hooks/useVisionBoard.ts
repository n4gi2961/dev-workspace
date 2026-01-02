'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
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
  // ✅ useMemo でキャッシュ - 毎レンダリングで新インスタンスを作らない
  const supabase = useMemo(() => createClient(), [])
  const [boards, setBoards] = useState<Board[]>([])
  const [currentBoard, setCurrentBoard] = useState<Board | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // 初回選択済みフラグ（循環依存防止用）
  const initialBoardSelectedRef = useRef(false)

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

      // 最初のボードを自動選択（初回のみ）
      if (data && data.length > 0 && !initialBoardSelectedRef.current) {
        initialBoardSelectedRef.current = true
        setCurrentBoard(data[0])
      }
    } catch (err) {
      console.error('Failed to load boards:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])  // supabaseはuseMemoでキャッシュ済み、currentBoardは循環依存防止のため除外

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])  // supabaseはuseMemoでキャッシュ済み

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
      // currentBoardの更新はsetCurrentBoardの関数形式で安全に行う
      setCurrentBoard(prev => prev?.id === boardId ? data : prev)
      return data
    } catch (err) {
      console.error('Failed to update board:', err)
      setError(err as Error)
      throw err
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])  // supabaseはuseMemoでキャッシュ済み

  // ボード削除
  const deleteBoard = useCallback(async (boardId: string) => {
    try {
      const { error } = await supabase
        .from('boards')
        .delete()
        .eq('id', boardId)

      if (error) throw error

      setBoards(prev => prev.filter(b => b.id !== boardId))
      // currentBoardの更新はsetCurrentBoardの関数形式で安全に行う
      setCurrentBoard(prev => prev?.id === boardId ? null : prev)
    } catch (err) {
      console.error('Failed to delete board:', err)
      setError(err as Error)
      throw err
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])  // supabaseはuseMemoでキャッシュ済み

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
