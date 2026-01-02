'use client'

import { useEffect, useState, useMemo } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  // ✅ useMemo でキャッシュ - 毎レンダリングで新インスタンスを作らない
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    // 初期セッション取得
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])  // supabaseはuseMemoでキャッシュ済み

  return { user, loading }
}
