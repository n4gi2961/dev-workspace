import { createClient } from '@vision-board/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // プロファイルが存在するか確認
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single()

      // プロファイルが存在しない場合は作成
      if (!profile) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          email: data.user.email,
          display_name: data.user.user_metadata.full_name || data.user.email?.split('@')[0],
          avatar_url: data.user.user_metadata.avatar_url,
        })
      }

      // ボード一覧ページにリダイレクト
      return NextResponse.redirect(`${origin}/boards`)
    }
  }

  // エラーの場合はログインページにリダイレクト
  return NextResponse.redirect(`${origin}/login`)
}
