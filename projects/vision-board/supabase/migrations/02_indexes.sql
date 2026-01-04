-- ============================================
-- Vision Board インデックス定義
-- 実行順序: 2
-- ============================================

CREATE INDEX idx_boards_user_id ON boards(user_id);

CREATE INDEX idx_nodes_board_id ON nodes(board_id);
CREATE INDEX idx_nodes_user_id ON nodes(user_id);

CREATE INDEX idx_pages_node_id ON pages(node_id);
CREATE INDEX idx_pages_user_id ON pages(user_id);

CREATE INDEX idx_milestones_node_id ON milestones(node_id);
CREATE INDEX idx_milestones_user_id ON milestones(user_id);

CREATE INDEX idx_routines_node_id ON routines(node_id);
CREATE INDEX idx_routines_user_id ON routines(user_id);

CREATE INDEX idx_board_templates_board_id ON board_templates(board_id);
CREATE INDEX idx_board_templates_creator_id ON board_templates(creator_id);

CREATE INDEX idx_template_downloads_template_id ON template_downloads(template_id);
CREATE INDEX idx_template_downloads_user_id ON template_downloads(user_id);
