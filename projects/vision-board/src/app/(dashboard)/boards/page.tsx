'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { Plus } from 'lucide-react'

interface Board {
  id: string
  user_id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
}

export default function BoardsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  // ✅ 必須: useMemoでキャッシュ
  const supabase = useMemo(() => createClient(), [])
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }

    const loadBoards = async () => {
      if (!user) return

      try {
        const { data, error } = await supabase
          .from('boards')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })

        if (error) throw error
        setBoards(data || [])
      } catch (err) {
        console.error('Failed to load boards:', err)
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading && user) {
      loadBoards()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, router])  // ✅ supabaseは入れない

  const handleCreateBoard = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('boards')
        .insert({
          user_id: user.id,
          name: '新しいボード',
          description: ''
        })
        .select()
        .single()

      if (error) throw error
      router.push(`/board/${data.id}`)
    } catch (err) {
      console.error('Failed to create board:', err)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-900 dark:text-white">読み込み中...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Vision Board
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {user.email}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              ボード一覧
            </h2>
            <button
              onClick={handleCreateBoard}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              <Plus className="w-4 h-4" />
              新規ボード
            </button>
          </div>

          {boards.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                まだボードがありません
              </p>
              <button
                onClick={handleCreateBoard}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                <Plus className="w-4 h-4" />
                最初のボードを作成
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {boards.map((board) => (
                <div
                  key={board.id}
                  onClick={() => router.push(`/board/${board.id}`)}
                  className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 cursor-pointer hover:shadow-lg transition-shadow"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {board.name}
                  </h3>
                  {board.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      {board.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    最終更新: {new Date(board.updated_at).toLocaleDateString('ja-JP')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
