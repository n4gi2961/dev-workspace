-- Vision Board アプリ初期スキーマ

-- 1. ユーザープロファイル
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ボード（ユーザーごとに複数保持可能）
CREATE TABLE IF NOT EXISTS boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_template BOOLEAN DEFAULT FALSE,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ノード（ボード内の画像/テキスト）
CREATE TABLE IF NOT EXISTS nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('image', 'text')),
  x NUMERIC NOT NULL,
  y NUMERIC NOT NULL,
  width NUMERIC NOT NULL,
  height NUMERIC NOT NULL,
  z_index INTEGER DEFAULT 0,

  -- 画像ノード専用フィールド
  image_url TEXT,
  shape TEXT CHECK (shape IN ('free', 'square', 'landscape', 'portrait')),
  hover_font_size TEXT CHECK (hover_font_size IN ('small', 'medium', 'large')),
  hover_text_color TEXT CHECK (hover_text_color IN ('white', 'black')),

  -- テキストノード専用フィールド
  content TEXT,
  font_size INTEGER,
  color TEXT,
  font_family TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ページ（画像ノードに紐づく詳細）
CREATE TABLE IF NOT EXISTS pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE UNIQUE,
  title TEXT DEFAULT '',
  description TEXT DEFAULT '',
  header_image TEXT,
  category TEXT CHECK (category IN ('place', 'state', 'experience')),
  target_decade TEXT,
  blocks JSONB DEFAULT '[]', -- 階層的なメモブロック
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. マイルストーン
CREATE TABLE IF NOT EXISTS milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ルーティン
CREATE TABLE IF NOT EXISTS routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ルーティン履歴（日付ごとのチェック状態）
CREATE TABLE IF NOT EXISTS routine_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(routine_id, date)
);

-- 8. テンプレート
CREATE TABLE IF NOT EXISTS board_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_official BOOLEAN DEFAULT FALSE, -- 公式テンプレートフラグ
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  download_count INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. ダウンロード履歴
CREATE TABLE IF NOT EXISTS template_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES board_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  new_board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_boards_user_id ON boards(user_id);
CREATE INDEX IF NOT EXISTS idx_nodes_board_id ON nodes(board_id);
CREATE INDEX IF NOT EXISTS idx_pages_node_id ON pages(node_id);
CREATE INDEX IF NOT EXISTS idx_milestones_page_id ON milestones(page_id);
CREATE INDEX IF NOT EXISTS idx_routines_page_id ON routines(page_id);
CREATE INDEX IF NOT EXISTS idx_routine_history_routine_id ON routine_history(routine_id);
CREATE INDEX IF NOT EXISTS idx_routine_history_date ON routine_history(date);
CREATE INDEX IF NOT EXISTS idx_board_templates_board_id ON board_templates(board_id);
CREATE INDEX IF NOT EXISTS idx_template_downloads_template_id ON template_downloads(template_id);
CREATE INDEX IF NOT EXISTS idx_template_downloads_user_id ON template_downloads(user_id);

-- トリガー：updated_atの自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_boards_updated_at BEFORE UPDATE ON boards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_nodes_updated_at BEFORE UPDATE ON nodes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pages_updated_at BEFORE UPDATE ON pages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_routines_updated_at BEFORE UPDATE ON routines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_board_templates_updated_at BEFORE UPDATE ON board_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
