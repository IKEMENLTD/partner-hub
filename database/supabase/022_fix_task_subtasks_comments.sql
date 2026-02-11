-- =============================================
-- task_subtasks / task_comments 作成（安全版）
-- =============================================

-- 既存テーブルがあれば削除（CASCADE でポリシーも一緒に消える）
DROP TABLE IF EXISTS task_comments CASCADE;
DROP TABLE IF EXISTS task_subtasks CASCADE;

-- 1. task_subtasks テーブル
CREATE TABLE task_subtasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT false,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_task_subtasks_task_id ON task_subtasks(task_id);

-- 2. task_comments テーブル
CREATE TABLE task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX idx_task_comments_author_id ON task_comments(author_id);

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

-- 4. RLS 有効化
ALTER TABLE task_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_subtasks_select" ON task_subtasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "task_subtasks_insert" ON task_subtasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "task_subtasks_update" ON task_subtasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "task_subtasks_delete" ON task_subtasks FOR DELETE TO authenticated USING (true);

CREATE POLICY "task_comments_select" ON task_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "task_comments_insert" ON task_comments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "task_comments_update" ON task_comments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "task_comments_delete" ON task_comments FOR DELETE TO authenticated USING (true);
