-- boards テーブルに settings カラムを追加（ズーム値など保存用）
ALTER TABLE boards ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- 既存ボードはデフォルト値で初期化
UPDATE boards SET settings = '{}' WHERE settings IS NULL;
