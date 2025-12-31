-- Vision Board アプリ Storage バケット設定

-- ========================================
-- Storage バケット作成
-- ========================================

-- 1. ボード画像用バケット
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'board-images',
  'board-images',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 2. テンプレートサムネイル用バケット
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'template-thumbnails',
  'template-thumbnails',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 3. ページヘッダー画像用バケット
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'page-headers',
  'page-headers',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- Storage ポリシー設定
-- ========================================

-- board-images バケットのポリシー

-- 全員が画像を閲覧可能
CREATE POLICY "Anyone can view board images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'board-images');

-- 認証ユーザーは自分のフォルダに画像をアップロード可能
CREATE POLICY "Authenticated users can upload board images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'board-images' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ユーザーは自分のフォルダの画像のみ更新可能
CREATE POLICY "Users can update own board images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'board-images' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ユーザーは自分のフォルダの画像のみ削除可能
CREATE POLICY "Users can delete own board images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'board-images' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- template-thumbnails バケットのポリシー

-- 全員がサムネイルを閲覧可能
CREATE POLICY "Anyone can view template thumbnails"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'template-thumbnails');

-- 認証ユーザーは自分のフォルダにサムネイルをアップロード可能
CREATE POLICY "Authenticated users can upload template thumbnails"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'template-thumbnails' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ユーザーは自分のフォルダのサムネイルのみ更新可能
CREATE POLICY "Users can update own template thumbnails"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'template-thumbnails' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ユーザーは自分のフォルダのサムネイルのみ削除可能
CREATE POLICY "Users can delete own template thumbnails"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'template-thumbnails' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- page-headers バケットのポリシー

-- 全員がページヘッダー画像を閲覧可能
CREATE POLICY "Anyone can view page header images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'page-headers');

-- 認証ユーザーは自分のフォルダにページヘッダーをアップロード可能
CREATE POLICY "Authenticated users can upload page headers"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'page-headers' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ユーザーは自分のフォルダのページヘッダーのみ更新可能
CREATE POLICY "Users can update own page headers"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'page-headers' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ユーザーは自分のフォルダのページヘッダーのみ削除可能
CREATE POLICY "Users can delete own page headers"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'page-headers' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
