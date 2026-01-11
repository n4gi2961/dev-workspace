



  Vision Board - Supabase統合 実装サマリー

  現在のブランチ

  feature/phase2-supabase-integration

  完了した実装

  1. Supabase認証基盤（Phase 1）

  - Google OAuth認証
  - useAuthフック（シングルトンクライアント使用）

  2. データ永続化

  - nodes: 画像・テキストノード
  - pages: ノードに紐づくページデータ
  - RLSポリシー: user_id = (SELECT auth.uid()) + TO authenticated

  3. パフォーマンス改善

  | 実装                     | ファイル                    | 効果           |
  |--------------------------|-----------------------------|----------------|
  | シングルトンクライアント | src/lib/supabase/client.ts  | セッション共有 |
  | ローカルキャッシュ       | src/hooks/useNodes.ts       | 即時表示       |
  | getSession()             | src/hooks/useAuth.ts        | 認証高速化     |
  | Supabase Storage         | src/lib/supabase/storage.ts | DB容量削減     |

  4. 無限ループ修正

  - 原因: DraggableImageNodeでドラッグ中に毎フレームonUpdate呼び出し
  - 解決: ローカルstate使用、mouseup時のみDB保存

  ---
  発生した問題と解決法

  | 問題                   | 原因                               | 解決                          |
  |------------------------|------------------------------------|-------------------------------|
  | 無限ループ・画面固まる | useEffectの依存配列にnode/onUpdate | ローカルstate + refで依存排除 |
  | 406 Not Acceptable     | RLSにTO authenticatedなし          | ポリシー修正                  |
  | Statement timeout      | 複雑なRLS JOIN                     | user_idをテーブルに追加       |
  | セッション共有されない | createClientが毎回新規作成         | シングルトンパターン          |
  | キャッシュ容量超過     | base64画像をlocalStorageに保存     | Storage実装でURL保存に変更    |

  ---
  SQLマイグレーション構成

  supabase/migrations/
  ├── 00_drop_all.sql      # リセット用
  ├── 01_schema.sql        # テーブル定義
  ├── 02_indexes.sql       # インデックス
  ├── 03_triggers.sql      # updated_at自動更新
  ├── 04_rls_policies.sql  # RLSポリシー
  └── 05_storage.sql       # Storageバケット

  ---
  重要なコードパターン

  // ✅ Supabaseクライアント - シングルトン
  let client = null
  export function createClient() {
    if (!client) client = createBrowserClient(...)
    return client
  }

  // ✅ useCallback依存配列 - supabaseは入れない
  const addNode = useCallback(async () => {
    // ...
  }, [boardId, userId])  // supabaseは入れない

  // ✅ RLSポリシー - 最適化形式
  CREATE POLICY "x" ON table
    FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

  ---
今後の計画（Phase 2以降）

  Phase 2: パフォーマンス最適化
    現在完了済み
  - ローカルキャッシュ実装
  - getSession()による認証高速化
  - Supabase Storage実装
    未完了
  - Service Worker + PWA（完全即時表示・オフライン対応）
  - 既存base64データのStorage移行
        Storage実装前に追加された画像は、DBにbase64文字列として保存されている。これらを
        1. DBから読み出し
        2. Storageにアップロード
        3. DBのsrcをURLに書き換え
        4. 古いbase64データを削除

  - 多言語対応を目的としたjsonファイルの作成

  Phase 3: テンプレート機能

  - ボードテンプレートの保存・読み込み
  - テンプレートギャラリー（公開テンプレート）
  - テンプレートサムネイル（template-thumbnails バケット使用）

  Phase 4: 共有・コラボレーション

  - ボードの公開リンク生成
  - 閲覧専用モード
  - 複数ユーザーでのリアルタイム編集（Supabase Realtime）



  Phase 5: 高度な機能

  - バージョン履歴・復元
  - ボードのエクスポート（PDF/画像）
  - ゴール達成通知・リマインダー
  - 統計ダッシュボード

  ---
  参考ドキュメント

  - /docs/supabase-reference.md - Supabase実装ガイド
  - CLAUDE.md - useCallback依存配列ルール