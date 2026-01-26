-- ============================================
-- ルーティンをboard_id紐づけに変更
-- routine_nodes中間テーブルで共有を管理
-- ============================================

-- 1. routinesテーブルにboard_id追加
ALTER TABLE routines
ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES boards(id) ON DELETE CASCADE;

-- 2. 既存データのboard_id設定（nodes経由で取得）
UPDATE routines r
SET board_id = n.board_id
FROM nodes n
WHERE r.node_id = n.id
AND r.board_id IS NULL;

-- 3. board_idをNOT NULLに変更
ALTER TABLE routines
ALTER COLUMN board_id SET NOT NULL;

-- 4. routine_nodes中間テーブル作成
CREATE TABLE IF NOT EXISTS routine_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(routine_id, node_id)
);

-- 5. 既存データをroutine_nodesに移行
INSERT INTO routine_nodes (routine_id, node_id, user_id, sort_order)
SELECT id, node_id, user_id, sort_order FROM routines
WHERE node_id IS NOT NULL
ON CONFLICT (routine_id, node_id) DO NOTHING;

-- 6. routinesからnode_idとsort_orderを削除
ALTER TABLE routines DROP COLUMN IF EXISTS node_id;
ALTER TABLE routines DROP COLUMN IF EXISTS sort_order;

-- 7. RLS設定
ALTER TABLE routine_nodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "routine_nodes_user_policy" ON routine_nodes;
CREATE POLICY "routine_nodes_user_policy" ON routine_nodes
  FOR ALL USING (auth.uid() = user_id);

-- 8. インデックス追加
CREATE INDEX IF NOT EXISTS idx_routine_nodes_routine_id ON routine_nodes(routine_id);
CREATE INDEX IF NOT EXISTS idx_routine_nodes_node_id ON routine_nodes(node_id);
CREATE INDEX IF NOT EXISTS idx_routine_nodes_user_id ON routine_nodes(user_id);
CREATE INDEX IF NOT EXISTS idx_routines_board_id ON routines(board_id);
