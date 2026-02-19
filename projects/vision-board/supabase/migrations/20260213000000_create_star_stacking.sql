-- star_stacking テーブル: ボードごとの星蓄積データ
CREATE TABLE star_stacking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  total_stars INTEGER NOT NULL DEFAULT 0,
  last_synced_total INTEGER NOT NULL DEFAULT 0,
  color_counts JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, board_id)
);

-- RLS
ALTER TABLE star_stacking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own star_stacking"
  ON star_stacking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own star_stacking"
  ON star_stacking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own star_stacking"
  ON star_stacking FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own star_stacking"
  ON star_stacking FOR DELETE
  USING (auth.uid() = user_id);

-- Index
CREATE INDEX idx_star_stacking_user_board ON star_stacking(user_id, board_id);

-- updated_at trigger
CREATE TRIGGER set_star_stacking_updated_at
  BEFORE UPDATE ON star_stacking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
