-- Vision Board アプリ Row Level Security ポリシー

-- RLS有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_downloads ENABLE ROW LEVEL SECURITY;

-- ========================================
-- profiles テーブルのポリシー
-- ========================================

-- ユーザーは自分のプロファイルのみ閲覧可能
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- ユーザーは自分のプロファイルのみ更新可能
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- 新規ユーザー登録時にプロファイル作成
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ========================================
-- boards テーブルのポリシー
-- ========================================

-- ユーザーは自分のボードのみ閲覧可能
CREATE POLICY "Users can view own boards"
  ON boards FOR SELECT
  USING (auth.uid() = user_id);

-- ユーザーは自分のボードを作成可能
CREATE POLICY "Users can create own boards"
  ON boards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分のボードのみ更新可能
CREATE POLICY "Users can update own boards"
  ON boards FOR UPDATE
  USING (auth.uid() = user_id);

-- ユーザーは自分のボードのみ削除可能
CREATE POLICY "Users can delete own boards"
  ON boards FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- nodes テーブルのポリシー
-- ========================================

-- ユーザーは自分のボードのノードのみ閲覧可能
CREATE POLICY "Users can view nodes in own boards"
  ON nodes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = nodes.board_id
      AND boards.user_id = auth.uid()
    )
  );

-- ユーザーは自分のボードにノードを作成可能
CREATE POLICY "Users can create nodes in own boards"
  ON nodes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = nodes.board_id
      AND boards.user_id = auth.uid()
    )
  );

-- ユーザーは自分のボードのノードのみ更新可能
CREATE POLICY "Users can update nodes in own boards"
  ON nodes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = nodes.board_id
      AND boards.user_id = auth.uid()
    )
  );

-- ユーザーは自分のボードのノードのみ削除可能
CREATE POLICY "Users can delete nodes in own boards"
  ON nodes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = nodes.board_id
      AND boards.user_id = auth.uid()
    )
  );

-- ========================================
-- pages テーブルのポリシー
-- ========================================

-- ユーザーは自分のボードのページのみ閲覧可能
CREATE POLICY "Users can view pages in own boards"
  ON pages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM nodes
      JOIN boards ON boards.id = nodes.board_id
      WHERE nodes.id = pages.node_id
      AND boards.user_id = auth.uid()
    )
  );

-- ユーザーは自分のボードにページを作成可能
CREATE POLICY "Users can create pages in own boards"
  ON pages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM nodes
      JOIN boards ON boards.id = nodes.board_id
      WHERE nodes.id = pages.node_id
      AND boards.user_id = auth.uid()
    )
  );

-- ユーザーは自分のボードのページのみ更新可能
CREATE POLICY "Users can update pages in own boards"
  ON pages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM nodes
      JOIN boards ON boards.id = nodes.board_id
      WHERE nodes.id = pages.node_id
      AND boards.user_id = auth.uid()
    )
  );

-- ユーザーは自分のボードのページのみ削除可能
CREATE POLICY "Users can delete pages in own boards"
  ON pages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM nodes
      JOIN boards ON boards.id = nodes.board_id
      WHERE nodes.id = pages.node_id
      AND boards.user_id = auth.uid()
    )
  );

-- ========================================
-- milestones テーブルのポリシー
-- ========================================

-- ユーザーは自分のボードのマイルストーンのみ閲覧可能
CREATE POLICY "Users can view milestones in own boards"
  ON milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pages
      JOIN nodes ON nodes.id = pages.node_id
      JOIN boards ON boards.id = nodes.board_id
      WHERE pages.id = milestones.page_id
      AND boards.user_id = auth.uid()
    )
  );

-- ユーザーは自分のボードにマイルストーンを作成可能
CREATE POLICY "Users can create milestones in own boards"
  ON milestones FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pages
      JOIN nodes ON nodes.id = pages.node_id
      JOIN boards ON boards.id = nodes.board_id
      WHERE pages.id = milestones.page_id
      AND boards.user_id = auth.uid()
    )
  );

-- ユーザーは自分のボードのマイルストーンのみ更新可能
CREATE POLICY "Users can update milestones in own boards"
  ON milestones FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pages
      JOIN nodes ON nodes.id = pages.node_id
      JOIN boards ON boards.id = nodes.board_id
      WHERE pages.id = milestones.page_id
      AND boards.user_id = auth.uid()
    )
  );

-- ユーザーは自分のボードのマイルストーンのみ削除可能
CREATE POLICY "Users can delete milestones in own boards"
  ON milestones FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pages
      JOIN nodes ON nodes.id = pages.node_id
      JOIN boards ON boards.id = nodes.board_id
      WHERE pages.id = milestones.page_id
      AND boards.user_id = auth.uid()
    )
  );

-- ========================================
-- routines テーブルのポリシー
-- ========================================

-- ユーザーは自分のボードのルーティンのみ閲覧可能
CREATE POLICY "Users can view routines in own boards"
  ON routines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pages
      JOIN nodes ON nodes.id = pages.node_id
      JOIN boards ON boards.id = nodes.board_id
      WHERE pages.id = routines.page_id
      AND boards.user_id = auth.uid()
    )
  );

-- ユーザーは自分のボードにルーティンを作成可能
CREATE POLICY "Users can create routines in own boards"
  ON routines FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pages
      JOIN nodes ON nodes.id = pages.node_id
      JOIN boards ON boards.id = nodes.board_id
      WHERE pages.id = routines.page_id
      AND boards.user_id = auth.uid()
    )
  );

-- ユーザーは自分のボードのルーティンのみ更新可能
CREATE POLICY "Users can update routines in own boards"
  ON routines FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pages
      JOIN nodes ON nodes.id = pages.node_id
      JOIN boards ON boards.id = nodes.board_id
      WHERE pages.id = routines.page_id
      AND boards.user_id = auth.uid()
    )
  );

-- ユーザーは自分のボードのルーティンのみ削除可能
CREATE POLICY "Users can delete routines in own boards"
  ON routines FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pages
      JOIN nodes ON nodes.id = pages.node_id
      JOIN boards ON boards.id = nodes.board_id
      WHERE pages.id = routines.page_id
      AND boards.user_id = auth.uid()
    )
  );

-- ========================================
-- routine_history テーブルのポリシー
-- ========================================

-- ユーザーは自分のボードのルーティン履歴のみ閲覧可能
CREATE POLICY "Users can view routine history in own boards"
  ON routine_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM routines
      JOIN pages ON pages.id = routines.page_id
      JOIN nodes ON nodes.id = pages.node_id
      JOIN boards ON boards.id = nodes.board_id
      WHERE routines.id = routine_history.routine_id
      AND boards.user_id = auth.uid()
    )
  );

-- ユーザーは自分のボードにルーティン履歴を作成可能
CREATE POLICY "Users can create routine history in own boards"
  ON routine_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM routines
      JOIN pages ON pages.id = routines.page_id
      JOIN nodes ON nodes.id = pages.node_id
      JOIN boards ON boards.id = nodes.board_id
      WHERE routines.id = routine_history.routine_id
      AND boards.user_id = auth.uid()
    )
  );

-- ユーザーは自分のボードのルーティン履歴のみ更新可能
CREATE POLICY "Users can update routine history in own boards"
  ON routine_history FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM routines
      JOIN pages ON pages.id = routines.page_id
      JOIN nodes ON nodes.id = pages.node_id
      JOIN boards ON boards.id = nodes.board_id
      WHERE routines.id = routine_history.routine_id
      AND boards.user_id = auth.uid()
    )
  );

-- ユーザーは自分のボードのルーティン履歴のみ削除可能
CREATE POLICY "Users can delete routine history in own boards"
  ON routine_history FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM routines
      JOIN pages ON pages.id = routines.page_id
      JOIN nodes ON nodes.id = pages.node_id
      JOIN boards ON boards.id = nodes.board_id
      WHERE routines.id = routine_history.routine_id
      AND boards.user_id = auth.uid()
    )
  );

-- ========================================
-- board_templates テーブルのポリシー
-- ========================================

-- 全員がテンプレートを閲覧可能（公開テンプレート）
CREATE POLICY "Everyone can view templates"
  ON board_templates FOR SELECT
  USING (true);

-- ユーザーは自分のボードをテンプレート化可能
CREATE POLICY "Users can create templates from own boards"
  ON board_templates FOR INSERT
  WITH CHECK (
    auth.uid() = creator_id AND
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = board_templates.board_id
      AND boards.user_id = auth.uid()
    )
  );

-- ユーザーは自分のテンプレートのみ更新可能
CREATE POLICY "Users can update own templates"
  ON board_templates FOR UPDATE
  USING (auth.uid() = creator_id);

-- ユーザーは自分のテンプレートのみ削除可能
CREATE POLICY "Users can delete own templates"
  ON board_templates FOR DELETE
  USING (auth.uid() = creator_id);

-- ========================================
-- template_downloads テーブルのポリシー
-- ========================================

-- ユーザーは自分のダウンロード履歴のみ閲覧可能
CREATE POLICY "Users can view own download history"
  ON template_downloads FOR SELECT
  USING (auth.uid() = user_id);

-- ユーザーはダウンロード履歴を作成可能
CREATE POLICY "Users can create download records"
  ON template_downloads FOR INSERT
  WITH CHECK (auth.uid() = user_id);
