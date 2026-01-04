-- ============================================
-- 完全削除（最初に実行）
-- ============================================

-- トリガー削除
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_boards_updated_at ON boards;
DROP TRIGGER IF EXISTS update_nodes_updated_at ON nodes;
DROP TRIGGER IF EXISTS update_pages_updated_at ON pages;
DROP TRIGGER IF EXISTS update_milestones_updated_at ON milestones;
DROP TRIGGER IF EXISTS update_routines_updated_at ON routines;
DROP TRIGGER IF EXISTS update_board_templates_updated_at ON board_templates;

-- 関数削除
DROP FUNCTION IF EXISTS update_updated_at_column();

-- テーブル削除（依存関係の逆順）
DROP TABLE IF EXISTS template_downloads CASCADE;
DROP TABLE IF EXISTS board_templates CASCADE;
DROP TABLE IF EXISTS routine_history CASCADE;
DROP TABLE IF EXISTS routines CASCADE;
DROP TABLE IF EXISTS milestones CASCADE;
DROP TABLE IF EXISTS pages CASCADE;
DROP TABLE IF EXISTS nodes CASCADE;
DROP TABLE IF EXISTS boards CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Storageポリシー削除
DROP POLICY IF EXISTS "board_images_select" ON storage.objects;
DROP POLICY IF EXISTS "board_images_insert" ON storage.objects;
DROP POLICY IF EXISTS "board_images_update" ON storage.objects;
DROP POLICY IF EXISTS "board_images_delete" ON storage.objects;
DROP POLICY IF EXISTS "template_thumbnails_select" ON storage.objects;
DROP POLICY IF EXISTS "template_thumbnails_insert" ON storage.objects;
DROP POLICY IF EXISTS "template_thumbnails_update" ON storage.objects;
DROP POLICY IF EXISTS "template_thumbnails_delete" ON storage.objects;
DROP POLICY IF EXISTS "page_headers_select" ON storage.objects;
DROP POLICY IF EXISTS "page_headers_insert" ON storage.objects;
DROP POLICY IF EXISTS "page_headers_update" ON storage.objects;
DROP POLICY IF EXISTS "page_headers_delete" ON storage.objects;

-- Storageバケット削除
DELETE FROM storage.buckets WHERE id IN ('board-images', 'template-thumbnails', 'page-headers');
