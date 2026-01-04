-- ============================================
-- Vision Board Storage設定
-- 実行順序: 5
-- ============================================

-- バケット作成
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'board-images',
  'board-images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'template-thumbnails',
  'template-thumbnails',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'page-headers',
  'page-headers',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- board-images ポリシー
CREATE POLICY "board_images_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'board-images');

CREATE POLICY "board_images_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'board-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "board_images_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'board-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "board_images_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'board-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- template-thumbnails ポリシー
CREATE POLICY "template_thumbnails_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'template-thumbnails');

CREATE POLICY "template_thumbnails_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'template-thumbnails' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "template_thumbnails_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'template-thumbnails' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "template_thumbnails_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'template-thumbnails' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- page-headers ポリシー
CREATE POLICY "page_headers_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'page-headers');

CREATE POLICY "page_headers_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'page-headers' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "page_headers_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'page-headers' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "page_headers_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'page-headers' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
