-- ============================================
-- Vision Board RLSポリシー定義
-- 実行順序: 4
-- ✅ TO authenticated 追加
-- ✅ (SELECT auth.uid()) でパフォーマンス最適化
-- ============================================

-- RLS有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_downloads ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id);
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id);

-- boards
CREATE POLICY "boards_select" ON boards
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY "boards_insert" ON boards
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "boards_update" ON boards
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY "boards_delete" ON boards
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- nodes
CREATE POLICY "nodes_select" ON nodes
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY "nodes_insert" ON nodes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "nodes_update" ON nodes
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY "nodes_delete" ON nodes
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- pages
CREATE POLICY "pages_select" ON pages
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY "pages_insert" ON pages
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "pages_update" ON pages
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY "pages_delete" ON pages
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- milestones
CREATE POLICY "milestones_select" ON milestones
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY "milestones_insert" ON milestones
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "milestones_update" ON milestones
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY "milestones_delete" ON milestones
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- routines
CREATE POLICY "routines_select" ON routines
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY "routines_insert" ON routines
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "routines_update" ON routines
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY "routines_delete" ON routines
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- board_templates（全員閲覧可、作成者のみ編集可）
CREATE POLICY "templates_select" ON board_templates
  FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY "templates_insert" ON board_templates
  FOR INSERT TO authenticated
  WITH CHECK (creator_id = (SELECT auth.uid()));
CREATE POLICY "templates_update" ON board_templates
  FOR UPDATE TO authenticated
  USING (creator_id = (SELECT auth.uid()));
CREATE POLICY "templates_delete" ON board_templates
  FOR DELETE TO authenticated
  USING (creator_id = (SELECT auth.uid()));

-- template_downloads
CREATE POLICY "downloads_select" ON template_downloads
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY "downloads_insert" ON template_downloads
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
