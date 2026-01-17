'use client'

import { use, useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import VisionBoard from '@/app/vision-board'
import { ChevronLeft } from 'lucide-react'

interface BoardPageProps {
  params: Promise<{
    id: string
  }>
}

interface Board {
  id: string
  user_id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
}

export default function BoardPage({ params }: BoardPageProps) {
  // paramsをアンラップ
  const { id: boardId } = use(params)

  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const t = useTranslations('boards')
  const tBoard = useTranslations('board')
  // ✅ 必須: useMemoでキャッシュ
  const supabase = useMemo(() => createClient(), [])
  const [board, setBoard] = useState<Board | null>(null)
  const [loading, setLoading] = useState(true)
  const [boardNotFound, setBoardNotFound] = useState(false)
  const [isFullscreenMode, setIsFullscreenMode] = useState(false)

  useEffect(() => {
    // ログインチェック
    if (!authLoading && !user) {
      router.push('/login')
      return
    }

    // ボードを直接Supabaseから取得
    const loadBoard = async () => {
      if (!user) return

      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('boards')
          .select('*')
          .eq('id', boardId)
          .eq('user_id', user.id)
          .single()

        if (error || !data) {
          console.error('Board not found:', error)
          setBoardNotFound(true)
        } else {
          setBoard(data)
          setBoardNotFound(false)
        }
      } catch (err) {
        console.error('Failed to load board:', err)
        setBoardNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading && user) {
      loadBoard()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, boardId, router])  // ✅ supabaseは入れない

  // ローディング中 - スケルトン表示
  if (authLoading || loading) {
    return (
      <div className="h-screen flex flex-col bg-gray-950">
        {/* ヘッダースケルトン */}
        <div className="flex-shrink-0 bg-gray-900/90 border-b border-gray-800 backdrop-blur-xl">
          <div className="max-w-screen-2xl mx-auto px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between">
            <div className="h-6 w-20 sm:w-32 bg-gray-800 rounded animate-pulse"></div>
            <div className="flex items-center gap-1.5 sm:gap-3">
              <div className="h-8 sm:h-10 w-10 sm:w-32 bg-gray-800 rounded-xl animate-pulse"></div>
              <div className="h-8 sm:h-10 w-10 sm:w-32 bg-gray-800 rounded-xl animate-pulse"></div>
              <div className="h-8 sm:h-10 w-8 sm:w-10 bg-gray-800 rounded-xl animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* ボードスケルトン */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-64 h-64 mx-auto mb-6 rounded-3xl bg-gray-800 animate-pulse"></div>
            <div className="h-8 w-96 bg-gray-800 rounded mx-auto mb-3 animate-pulse"></div>
            <div className="h-4 w-64 bg-gray-800 rounded mx-auto animate-pulse"></div>
          </div>
        </div>
      </div>
    )
  }

  // ログインしていない
  if (!user) {
    return null
  }

  // ボードが見つからない
  if (boardNotFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {t('notFound.title')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('notFound.message')}
          </p>
          <button
            onClick={() => router.push('/boards')}
            className="flex items-center gap-2 mx-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
          >
            <ChevronLeft className="w-4 h-4" />
            {t('notFound.backToList')}
          </button>
        </div>
      </div>
    )
  }

  // Vision Board表示
  return (
    <div className="relative h-screen">
      {/* 戻るボタン - 全画面時は非表示 */}
      {!isFullscreenMode && (
        <div className="absolute top-3 sm:top-4 left-3 sm:left-4 z-50">
          <button
            onClick={() => router.push('/boards')}
            className="flex items-center gap-1 sm:gap-2 p-2 sm:px-3 sm:py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 rounded-lg shadow-lg backdrop-blur-sm transition-all"
            title={tBoard('backToList')}
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{tBoard('backToList')}</span>
          </button>
        </div>
      )}

      {/* Vision Board本体 - ✅ userIdを渡す */}
      <VisionBoard
        boardId={boardId}
        userId={user.id}
        onFullscreenChange={setIsFullscreenMode}
      />
    </div>
  )
}
