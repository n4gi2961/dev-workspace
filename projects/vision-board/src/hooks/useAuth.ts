'use client'

import { useEffect, useState, useMemo } from 'react'
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  // ✅ 必須: useMemoでキャッシュ
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    // ✅ getSession()はローカルストレージを先にチェック（高速）
    // getUser()は毎回サーバーに問い合わせる（遅い）
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])  // ✅ 空配列 - supabaseはuseMemoでキャッシュ済み

  return { user, loading }
}
