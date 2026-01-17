'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { Plus, MoreVertical, Pencil, Trash2, X, Check } from 'lucide-react'

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
  const t = useTranslations('boards')
  const tCommon = useTranslations('common')
  const tAuth = useTranslations('auth')
  const tBoard = useTranslations('board')
  // ✅ 必須: useMemoでキャッシュ
  const supabase = useMemo(() => createClient(), [])
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

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
          name: tBoard('newBoardDefault'),
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

  const handleDeleteBoard = async (boardId: string) => {
    try {
      const { error } = await supabase
        .from('boards')
        .delete()
        .eq('id', boardId)

      if (error) throw error
      setBoards(boards.filter(b => b.id !== boardId))
      setDeleteConfirmId(null)
    } catch (err) {
      console.error('Failed to delete board:', err)
    }
  }

  const handleRenameBoard = async (boardId: string) => {
    if (!editingName.trim()) return

    try {
      const { error } = await supabase
        .from('boards')
        .update({ name: editingName.trim(), updated_at: new Date().toISOString() })
        .eq('id', boardId)

      if (error) throw error
      setBoards(boards.map(b =>
        b.id === boardId ? { ...b, name: editingName.trim() } : b
      ))
      setEditingId(null)
      setEditingName('')
    } catch (err) {
      console.error('Failed to rename board:', err)
    }
  }

  const startEditing = (board: Board) => {
    setEditingId(board.id)
    setEditingName(board.name)
    setOpenMenuId(null)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-900 dark:text-white">{tCommon('loading')}</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 sm:h-16">
            <div className="flex items-center">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                {t('title')}
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="hidden sm:inline text-sm text-gray-700 dark:text-gray-300">
                {user.email}
              </span>
              <button
                onClick={handleLogout}
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {tAuth('logout')}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('listTitle')}
            </h2>
            <button
              onClick={handleCreateBoard}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              <Plus className="w-4 h-4" />
              {t('newBoard')}
            </button>
          </div>

          {boards.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {t('empty')}
              </p>
              <button
                onClick={handleCreateBoard}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                <Plus className="w-4 h-4" />
                {t('createFirst')}
              </button>
            </div>
          ) : (
            <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {boards.map((board) => (
                <div
                  key={board.id}
                  className="relative bg-white dark:bg-gray-800 shadow rounded-lg p-6 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => {
                    if (!openMenuId && !deleteConfirmId && !editingId) {
                      router.push(`/board/${board.id}`)
                    }
                  }}
                >
                  {/* 三点リーダーメニュー */}
                  <div className="absolute top-3 right-3" ref={openMenuId === board.id ? menuRef : null}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenMenuId(openMenuId === board.id ? null : board.id)
                      }}
                      className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      <MoreVertical className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>

                    {openMenuId === board.id && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenMenuId(null)
                          }}
                        />
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-700 rounded-lg shadow-xl z-50 py-1 border border-gray-200 dark:border-gray-600">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              startEditing(board)
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                          >
                            <Pencil className="w-4 h-4" />
                            {t('editName')}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteConfirmId(board.id)
                              setOpenMenuId(null)
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600"
                          >
                            <Trash2 className="w-4 h-4" />
                            {t('deleteBoard')}
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* ボード名（編集モード対応） */}
                  {editingId === board.id ? (
                    <div className="flex items-center gap-2 mb-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameBoard(board.id)
                          if (e.key === 'Escape') {
                            setEditingId(null)
                            setEditingName('')
                          }
                        }}
                        className="flex-1 px-2 py-1 text-lg font-semibold border border-blue-500 rounded outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        autoFocus
                      />
                      <button
                        onClick={() => handleRenameBoard(board.id)}
                        className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null)
                          setEditingName('')
                        }}
                        className="p-1 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 pr-8">
                      {board.name}
                    </h3>
                  )}

                  {board.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      {board.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {t('lastUpdated')} {new Date(board.updated_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>

            {/* 削除確認モーダル */}
            {deleteConfirmId && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                onClick={() => setDeleteConfirmId(null)}
              >
                <div
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm mx-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {t('deleteModal.title')}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    {t('deleteModal.message')}
                  </p>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md"
                    >
                      {tCommon('cancel')}
                    </button>
                    <button
                      onClick={() => handleDeleteBoard(deleteConfirmId)}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
                    >
                      {t('deleteModal.confirm')}
                    </button>
                  </div>
                </div>
              </div>
            )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
