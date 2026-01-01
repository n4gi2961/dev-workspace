'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useVisionBoard } from '@/hooks/useVisionBoard'
import { createClient } from '@/lib/supabase/client'

// スケルトンローディングコンポーネント
function BoardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 animate-pulse">
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-4"></div>
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
    </div>
  )
}

export default function BoardsPage() {
  const { user, loading: authLoading } = useAuth()
  const { boards, loading: boardsLoading, createBoard } = useVisionBoard()
  const router = useRouter()
  const supabase = createClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) return

    setCreating(true)
    try {
      const board = await createBoard(newBoardName.trim())
      setShowCreateModal(false)
      setNewBoardName('')
      // ボード作成後、そのボードを開く
      router.push(`/board/${board.id}`)
    } catch (error) {
      console.error('Failed to create board:', error)
      alert('ボードの作成に失敗しました')
    } finally {
      setCreating(false)
    }
  }

  if (!user && !authLoading) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ヘッダー */}
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Vision Board
              </h1>
            </div>
            <div className="flex items-center gap-4">
              {user && (
                <>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {user.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                  >
                    <LogOut className="w-4 h-4" />
                    ログアウト
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* ヘッダー */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              ボード一覧
            </h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={authLoading || boardsLoading}
            >
              <Plus className="w-4 h-4" />
              新規ボード作成
            </button>
          </div>

          {/* ボード一覧 */}
          {authLoading || boardsLoading ? (
            // スケルトンローディング表示
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <BoardSkeleton />
              <BoardSkeleton />
              <BoardSkeleton />
            </div>
          ) : boards.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                まだボードがありません
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
              >
                最初のボードを作成
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {boards.map(board => (
                <div
                  key={board.id}
                  onClick={() => router.push(`/board/${board.id}`)}
                  className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 cursor-pointer hover:shadow-lg transition-shadow"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {board.name}
                  </h3>
                  {board.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {board.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {new Date(board.updated_at).toLocaleDateString('ja-JP')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 新規ボード作成モーダル */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              新規ボード作成
            </h3>
            <input
              type="text"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !creating) {
                  handleCreateBoard()
                }
              }}
              placeholder="ボード名を入力"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setNewBoardName('')
                }}
                disabled={creating}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreateBoard}
                disabled={creating || !newBoardName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? '作成中...' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
