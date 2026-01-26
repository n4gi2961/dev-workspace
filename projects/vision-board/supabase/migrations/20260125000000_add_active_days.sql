-- routinesテーブルにactive_daysカラムを追加
-- 実行する曜日を格納 (0=日曜, 1=月曜, ..., 6=土曜)
-- NULLは毎日実行を意味する

ALTER TABLE routines
ADD COLUMN IF NOT EXISTS active_days INTEGER[] DEFAULT NULL;

-- コメント追加
COMMENT ON COLUMN routines.active_days IS '実行する曜日の配列 (0=日曜, 1=月曜, ..., 6=土曜)。NULLは毎日実行';
