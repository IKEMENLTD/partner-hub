-- =============================================
-- 022: task_subtasks / task_comments テーブル作成
-- タスクのサブタスク（チェックリスト）とコメント機能
-- =============================================

-- 1. task_subtasks テーブル
CREATE TABLE IF NOT EXISTS task_subtasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT false,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_subtasks_task_id ON task_subtasks(task_id);

-- 2. task_comments テーブル
CREATE TABLE IF NOT EXISTS task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_author_id ON task_comments(author_id);

-- 3. tasks テーブルに progress カラム追加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tasks' AND column_name = 'progress'
    ) THEN
        ALTER TABLE tasks ADD COLUMN progress INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- 4. updated_at トリガー
DROP TRIGGER IF EXISTS update_task_subtasks_updated_at ON task_subtasks;
CREATE TRIGGER update_task_subtasks_updated_at
    BEFORE UPDATE ON task_subtasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_task_comments_updated_at ON task_comments;
CREATE TRIGGER update_task_comments_updated_at
    BEFORE UPDATE ON task_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. RLS 有効化
ALTER TABLE task_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- task_subtasks: 認証済みユーザーはフルアクセス
CREATE POLICY "task_subtasks_select" ON task_subtasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "task_subtasks_insert" ON task_subtasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "task_subtasks_update" ON task_subtasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "task_subtasks_delete" ON task_subtasks FOR DELETE TO authenticated USING (true);

-- task_comments: 認証済みユーザーはフルアクセス
CREATE POLICY "task_comments_select" ON task_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "task_comments_insert" ON task_comments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "task_comments_update" ON task_comments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "task_comments_delete" ON task_comments FOR DELETE TO authenticated USING (true);

-- 確認
DO $$
BEGIN
    RAISE NOTICE 'Migration 022 completed: task_subtasks, task_comments tables created';
END $$;
