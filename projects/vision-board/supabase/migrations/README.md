# Vision Board データベース設定

## 実行手順

Supabase Dashboard → SQL Editor で順番に実行してください。

```
01_schema.sql      → テーブル作成
02_indexes.sql     → インデックス作成
03_triggers.sql    → トリガー設定
04_rls_policies.sql → RLSポリシー設定
05_storage.sql     → Storage設定（任意）
```

## スキーマ構造

```
boards (user_id)
  └── nodes (board_id, user_id)
        ├── pages (node_id, user_id)
        ├── milestones (node_id, user_id)
        └── routines (node_id, user_id, history)
```

## ポイント

- 全テーブルに `user_id` を持たせてRLSを高速化
- JOINなしの `user_id = auth.uid()` でシンプル＆高速
- `routines.history` はJSONB型（別テーブル不要）
