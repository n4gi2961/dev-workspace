-- routine_stacks テーブル新規作成
CREATE TABLE routine_stacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS有効化
ALTER TABLE routine_stacks ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY routine_stacks_user_policy ON routine_stacks
  FOR ALL USING (auth.uid() = user_id);

-- インデックス
CREATE INDEX idx_routine_stacks_board_id ON routine_stacks(board_id);
CREATE INDEX idx_routine_stacks_node_id ON routine_stacks(node_id);
CREATE INDEX idx_routine_stacks_user_id ON routine_stacks(user_id);

-- routines テーブルに stack 関連カラム追加
ALTER TABLE routines ADD COLUMN stack_id UUID REFERENCES routine_stacks(id) ON DELETE SET NULL;
ALTER TABLE routines ADD COLUMN stack_order INTEGER NOT NULL DEFAULT 0;

-- インデックス
CREATE INDEX idx_routines_stack_id ON routines(stack_id);
