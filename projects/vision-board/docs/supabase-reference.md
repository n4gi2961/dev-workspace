# Supabase 実装リファレンス for Claude Code

公式ドキュメント（https://supabase.com/docs）から抽出した、実装に必要な情報のみをまとめたガイド。

---

## 目次

1. [初期セットアップ（Next.js）](#1-初期セットアップnextjs)
2. [認証（Auth）](#2-認証auth)
3. [データベース操作（CRUD）](#3-データベース操作crud)
4. [Row Level Security（RLS）](#4-row-level-securityrls)
5. [リアルタイム（Realtime/Subscribe）](#5-リアルタイムrealtimesubscribe)
6. [よくあるエラーと対処](#6-よくあるエラーと対処)

---

## 1. 初期セットアップ（Next.js）

### 1.1 推奨：テンプレートから作成

```bash
npx create-next-app -e with-supabase my-app
cd my-app
```

これで以下が自動設定される：
- `@supabase/supabase-js`
- `@supabase/ssr`（サーバーサイド認証用）
- Supabaseクライアントのユーティリティ関数
- 環境変数のひな形

### 1.2 手動セットアップの場合

```bash
npm install @supabase/supabase-js @supabase/ssr
```

#### 環境変数（.env.local）

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

- `SUPABASE_URL`: プロジェクトダッシュボード → Settings → API
- `SUPABASE_ANON_KEY`: 同上（`anon` `public` キー）

### 1.3 クライアント作成ユーティリティ

**重要**: Next.js App Routerでは、クライアント/サーバーで別のクライアントを使う

#### ブラウザ用（src/lib/supabase/client.ts）

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

#### サーバー用（src/lib/supabase/server.ts）

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component からの呼び出し時は無視
          }
        },
      },
    }
  )
}
```

#### Middleware（src/middleware.ts）

認証トークンのリフレッシュに必要：

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // トークンをリフレッシュ
  await supabase.auth.getUser()

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

## 2. 認証（Auth）

### 2.1 サインアップ

```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
})
```

### 2.2 ログイン

```typescript
// メール/パスワード
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123',
})

// マジックリンク（メール送信）
const { data, error } = await supabase.auth.signInWithOtp({
  email: 'user@example.com',
})

// OAuth（Google等）
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: 'http://localhost:3000/auth/callback',
  },
})
```

### 2.3 ログアウト

```typescript
const { error } = await supabase.auth.signOut()
```

### 2.4 現在のユーザー取得

```typescript
// クライアント側（キャッシュ使用、高速）
const { data: { session } } = await supabase.auth.getSession()
const user = session?.user

// サーバー側（DB検証、安全）
const { data: { user } } = await supabase.auth.getUser()
```

### 2.5 認証状態の監視

```typescript
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      console.log(event, session)
      // SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.
    }
  )

  return () => subscription.unsubscribe()
}, [])
```

### 2.6 OAuth Callback処理（Route Handler）

```typescript
// app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`)
}
```

---

## 3. データベース操作（CRUD）

### 3.1 SELECT（読み取り）

```typescript
// 全件取得
const { data, error } = await supabase
  .from('boards')
  .select('*')

// 特定カラムのみ
const { data, error } = await supabase
  .from('boards')
  .select('id, name, created_at')

// リレーション込み（JOINの代わり）
const { data, error } = await supabase
  .from('boards')
  .select(`
    id,
    name,
    nodes (
      id,
      type,
      x,
      y
    )
  `)

// フィルタリング
const { data, error } = await supabase
  .from('boards')
  .select('*')
  .eq('user_id', userId)           // WHERE user_id = userId
  .order('created_at', { ascending: false })
  .limit(10)

// 1件のみ取得
const { data, error } = await supabase
  .from('boards')
  .select('*')
  .eq('id', boardId)
  .single()  // 1件だけ返す、なければエラー
```

### 3.2 INSERT（作成）

```typescript
// 1件挿入
const { data, error } = await supabase
  .from('boards')
  .insert({ name: 'My Board', user_id: userId })
  .select()  // 挿入したデータを返す
  .single()

// 複数件挿入
const { data, error } = await supabase
  .from('nodes')
  .insert([
    { board_id: boardId, type: 'image', x: 100, y: 100 },
    { board_id: boardId, type: 'text', x: 200, y: 200 },
  ])
  .select()
```

### 3.3 UPDATE（更新）

```typescript
const { data, error } = await supabase
  .from('boards')
  .update({ name: 'Updated Name' })
  .eq('id', boardId)
  .select()
  .single()
```

### 3.4 DELETE（削除）

```typescript
const { error } = await supabase
  .from('boards')
  .delete()
  .eq('id', boardId)
```

### 3.5 UPSERT（あれば更新、なければ挿入）

```typescript
const { data, error } = await supabase
  .from('settings')
  .upsert({ 
    user_id: userId, 
    dark_mode: true 
  })
  .select()
  .single()
```

### 3.6 フィルタ演算子一覧

| メソッド | SQL相当 | 例 |
|---------|--------|-----|
| `.eq()` | `=` | `.eq('status', 'active')` |
| `.neq()` | `!=` | `.neq('status', 'deleted')` |
| `.gt()` | `>` | `.gt('age', 18)` |
| `.gte()` | `>=` | `.gte('price', 100)` |
| `.lt()` | `<` | `.lt('stock', 10)` |
| `.lte()` | `<=` | `.lte('priority', 5)` |
| `.like()` | `LIKE` | `.like('name', '%john%')` |
| `.ilike()` | `ILIKE` | `.ilike('name', '%john%')` |
| `.in()` | `IN` | `.in('id', [1, 2, 3])` |
| `.is()` | `IS` | `.is('deleted_at', null)` |

---

## 4. Row Level Security（RLS）

### 4.1 RLSとは

- テーブルへのアクセスを行レベルで制御
- **必須**: publicスキーマのテーブルには必ず有効化する
- ポリシーがないと、誰もアクセスできない（安全側に倒れる）

### 4.2 RLS有効化

```sql
-- テーブル作成時
CREATE TABLE boards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS有効化（必須）
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
```

### 4.3 基本的なポリシーパターン

#### ユーザーは自分のデータのみアクセス可能

```sql
-- SELECT: 自分のデータのみ読める
CREATE POLICY "Users can view own boards"
ON boards FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- INSERT: 自分のデータのみ作成できる
CREATE POLICY "Users can create own boards"
ON boards FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: 自分のデータのみ更新できる
CREATE POLICY "Users can update own boards"
ON boards FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: 自分のデータのみ削除できる
CREATE POLICY "Users can delete own boards"
ON boards FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
```

#### 全員が読めるが、作成者のみ編集可能

```sql
-- 誰でも読める
CREATE POLICY "Public read access"
ON posts FOR SELECT
TO anon, authenticated
USING (true);

-- 作成者のみ編集
CREATE POLICY "Authors can update"
ON posts FOR UPDATE
TO authenticated
USING (auth.uid() = author_id);
```

### 4.4 重要な関数

| 関数 | 説明 |
|------|------|
| `auth.uid()` | 現在のユーザーのUUID |
| `auth.jwt()` | 現在のJWTトークン全体 |
| `auth.role()` | 現在のロール（anon/authenticated） |

### 4.5 RLSパフォーマンス最適化

```sql
-- ❌ 遅い: 関数を直接呼ぶ
CREATE POLICY "slow_policy" ON boards
FOR SELECT USING (auth.uid() = user_id);

-- ✅ 速い: SELECTでラップ
CREATE POLICY "fast_policy" ON boards
FOR SELECT USING ((SELECT auth.uid()) = user_id);
```

**理由**: `(SELECT auth.uid())` は1回だけ評価される（キャッシュされる）

### 4.6 インデックス追加

RLSで使うカラムにはインデックスを追加：

```sql
CREATE INDEX idx_boards_user_id ON boards(user_id);
```

### 4.7 子テーブルのRLS

親テーブル経由でアクセス制御：

```sql
-- nodesテーブル: boardsを所有するユーザーのみアクセス可能
CREATE POLICY "Users can access nodes of own boards"
ON nodes FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM boards
    WHERE boards.id = nodes.board_id
    AND boards.user_id = (SELECT auth.uid())
  )
);
```

---

## 5. リアルタイム（Realtime/Subscribe）

### 5.1 前提条件

1. Supabaseダッシュボード → Database → Publications
2. `supabase_realtime` に監視したいテーブルを追加

または SQL で：

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE boards;
ALTER PUBLICATION supabase_realtime ADD TABLE nodes;
```

### 5.2 データベース変更の監視

```typescript
// 特定テーブルの全変更を監視
const channel = supabase
  .channel('boards-changes')
  .on(
    'postgres_changes',
    {
      event: '*',        // INSERT, UPDATE, DELETE, または *
      schema: 'public',
      table: 'boards',
    },
    (payload) => {
      console.log('Change received:', payload)
      // payload.eventType: 'INSERT' | 'UPDATE' | 'DELETE'
      // payload.new: 新しいデータ
      // payload.old: 古いデータ（DELETEとUPDATE時）
    }
  )
  .subscribe()

// クリーンアップ
channel.unsubscribe()
```

### 5.3 特定条件のみ監視

```typescript
// 特定ユーザーのボードのみ
const channel = supabase
  .channel('my-boards')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'boards',
      filter: `user_id=eq.${userId}`,
    },
    (payload) => {
      console.log('My board changed:', payload)
    }
  )
  .subscribe()
```

### 5.4 React Hookでの使用例

```typescript
function useRealtimeBoards(userId: string) {
  const [boards, setBoards] = useState<Board[]>([])
  const supabase = createClient()

  useEffect(() => {
    // 初期データ取得
    const fetchBoards = async () => {
      const { data } = await supabase
        .from('boards')
        .select('*')
        .eq('user_id', userId)
      
      if (data) setBoards(data)
    }

    fetchBoards()

    // リアルタイム監視
    const channel = supabase
      .channel('boards-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'boards',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setBoards(prev => [...prev, payload.new as Board])
          } else if (payload.eventType === 'UPDATE') {
            setBoards(prev => 
              prev.map(b => b.id === payload.new.id ? payload.new as Board : b)
            )
          } else if (payload.eventType === 'DELETE') {
            setBoards(prev => 
              prev.filter(b => b.id !== payload.old.id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [userId, supabase])

  return boards
}
```

### 5.5 Broadcast（軽量メッセージング）

DB変更を経由しない、クライアント間の直接通信：

```typescript
// 送信側
const channel = supabase.channel('room-1')

await channel.send({
  type: 'broadcast',
  event: 'cursor-move',
  payload: { x: 100, y: 200 },
})

// 受信側
const channel = supabase
  .channel('room-1')
  .on('broadcast', { event: 'cursor-move' }, (payload) => {
    console.log('Cursor moved:', payload)
  })
  .subscribe()
```

### 5.6 注意事項

- DELETE時、RLS有効 + REPLICA IDENTITY FULL でも主キーのみ返る
- 大量の同時接続はDB負荷になる → Broadcastを検討
- チャンネル名に `realtime` は使用不可（予約語）

---

## 6. よくあるエラーと対処

### 6.1 RLS関連

**エラー**: `new row violates row-level security policy`

**原因**: INSERT/UPDATEのWITH CHECKポリシーに違反

**対処**: 
```sql
-- ポリシーを確認
SELECT * FROM pg_policies WHERE tablename = 'boards';

-- よくある原因: user_idを設定していない
INSERT INTO boards (name, user_id) VALUES ('Test', auth.uid());
```

### 6.2 認証関連

**エラー**: `JWT expired`

**原因**: Middlewareでトークンリフレッシュができていない

**対処**: middleware.ts を確認、`await supabase.auth.getUser()` があるか

### 6.3 Realtime関連

**エラー**: 変更が検知されない

**チェックリスト**:
1. テーブルがPublicationに追加されているか
2. RLSポリシーでSELECTが許可されているか
3. `.subscribe()` を呼んでいるか
4. チャンネル名が `realtime` でないか

### 6.4 型エラー

**対処**: Supabase CLIで型生成

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.types.ts
```

使用例：

```typescript
import { Database } from '@/types/database.types'

type Board = Database['public']['Tables']['boards']['Row']
type BoardInsert = Database['public']['Tables']['boards']['Insert']
type BoardUpdate = Database['public']['Tables']['boards']['Update']
```

---

## 付録: テーブル作成テンプレート

Vision Board用のテーブル定義例：

```sql
-- ユーザープロフィール（auth.usersと連携）
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  dark_mode BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = id);

-- ボード
CREATE TABLE boards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL DEFAULT 'Untitled Board',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_boards_user_id ON boards(user_id);

CREATE POLICY "Users can CRUD own boards"
ON boards FOR ALL
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

-- ノード
CREATE TABLE nodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'text')),
  x NUMERIC NOT NULL DEFAULT 0,
  y NUMERIC NOT NULL DEFAULT 0,
  width NUMERIC NOT NULL DEFAULT 200,
  height NUMERIC NOT NULL DEFAULT 150,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_nodes_board_id ON nodes(board_id);

CREATE POLICY "Users can CRUD nodes of own boards"
ON nodes FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM boards
    WHERE boards.id = nodes.board_id
    AND boards.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM boards
    WHERE boards.id = nodes.board_id
    AND boards.user_id = (SELECT auth.uid())
  )
);

-- Realtime有効化
ALTER PUBLICATION supabase_realtime ADD TABLE boards;
ALTER PUBLICATION supabase_realtime ADD TABLE nodes;
```

---

## 参考リンク

- 認証: https://supabase.com/docs/guides/auth
- RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Realtime: https://supabase.com/docs/guides/realtime
- Next.js統合: https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
- JavaScript API: https://supabase.com/docs/reference/javascript/introduction
