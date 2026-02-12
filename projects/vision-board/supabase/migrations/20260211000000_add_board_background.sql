-- boards テーブルに背景タイプカラムを追加
ALTER TABLE boards ADD COLUMN IF NOT EXISTS background_type TEXT DEFAULT 'default';
