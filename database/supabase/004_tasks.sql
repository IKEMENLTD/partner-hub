-- =============================================================================
-- Supabase Migration: 004 - Tasks Table
-- Description: タスクテーブル
-- =============================================================================

-- =============================================================================
-- ENUM型定義
-- =============================================================================

-- タスクステータス
CREATE TYPE public.task_status AS ENUM (
    'todo',                 -- 未着手
    'in_progress',          -- 進行中
    'waiting',              -- 待機中（ブロック）
    'review',               -- レビュー中
    'completed',            -- 完了
    'cancelled'             -- キャンセル
);

-- タスク優先度
CREATE TYPE public.task_priority AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);

-- タスク種別
CREATE TYPE public.task_type AS ENUM (
    'task',                 -- 通常タスク
    'feature',              -- 機能
    'bug',                  -- バグ
    'improvement',          -- 改善
    'documentation',        -- ドキュメント
    'research',             -- 調査
    'other'                 -- その他
);

-- =============================================================================
-- tasks テーブル
-- =============================================================================

CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 基本情報
    title VARCHAR(500) NOT NULL,
    description TEXT,

    -- ステータスと種別
    status public.task_status NOT NULL DEFAULT 'todo',
    priority public.task_priority NOT NULL DEFAULT 'medium',
    type public.task_type NOT NULL DEFAULT 'task',

    -- 関連案件
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,

    -- 担当者
    assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- パートナー担当者（外部割り当ての場合）
    partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,

    -- 親タスク（サブタスク機能）
    parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,

    -- 日程
    due_date DATE,
    start_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- 工数
    estimated_hours INTEGER DEFAULT 0,
    actual_hours INTEGER DEFAULT 0,

    -- 進捗
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

    -- リマインダー設定（JSONB）
    reminder_config JSONB DEFAULT NULL,
    -- 構造例:
    -- {
    --   "enabled": true,
    --   "days_before": [3, 1],
    --   "channels": ["email", "in_app"]
    -- }

    -- メタデータ
    tags TEXT[],
    metadata JSONB DEFAULT '{}',

    -- 作成者
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX idx_tasks_partner_id ON public.tasks(partner_id) WHERE partner_id IS NOT NULL;
CREATE INDEX idx_tasks_parent_task_id ON public.tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_priority ON public.tasks(priority);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_tasks_type ON public.tasks(type);
CREATE INDEX idx_tasks_tags ON public.tasks USING GIN(tags);

-- 期限切れタスク検索用の部分インデックス
CREATE INDEX idx_tasks_overdue ON public.tasks(due_date)
    WHERE status NOT IN ('completed', 'cancelled') AND due_date < CURRENT_DATE;

COMMENT ON TABLE public.tasks IS 'タスク情報';
COMMENT ON COLUMN public.tasks.reminder_config IS 'リマインダー設定（JSON形式）';

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- task_comments テーブル（タスクコメント）
-- =============================================================================

CREATE TABLE public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    content TEXT NOT NULL,

    -- 社内向けフラグ（パートナーには非公開）
    is_internal BOOLEAN NOT NULL DEFAULT false,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX idx_task_comments_user_id ON public.task_comments(user_id);

COMMENT ON TABLE public.task_comments IS 'タスクに対するコメント';
COMMENT ON COLUMN public.task_comments.is_internal IS '社内向けコメント（パートナーには非公開）';

CREATE TRIGGER update_task_comments_updated_at
    BEFORE UPDATE ON public.task_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================

-- tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- SELECT: 認証済みユーザーは全タスクを閲覧可能
-- （より厳密にする場合はプロジェクトメンバーのみに制限可能）
CREATE POLICY "tasks_select_policy" ON public.tasks
    FOR SELECT USING (auth.role() = 'authenticated');

-- INSERT: 認証済みユーザーはタスクを作成可能
CREATE POLICY "tasks_insert_policy" ON public.tasks
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- UPDATE: 担当者、プロジェクトオーナー、または admin が更新可能
CREATE POLICY "tasks_update_policy" ON public.tasks
    FOR UPDATE USING (
        assignee_id = auth.uid()
        OR created_by = auth.uid()
        OR public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = tasks.project_id
            AND (p.owner_id = auth.uid() OR p.manager_id = auth.uid())
        )
    );

-- DELETE: 作成者、プロジェクトオーナー、または admin が削除可能
CREATE POLICY "tasks_delete_policy" ON public.tasks
    FOR DELETE USING (
        created_by = auth.uid()
        OR public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = tasks.project_id
            AND p.owner_id = auth.uid()
        )
    );

-- task_comments
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_comments_select_policy" ON public.task_comments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "task_comments_insert_policy" ON public.task_comments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "task_comments_update_policy" ON public.task_comments
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "task_comments_delete_policy" ON public.task_comments
    FOR DELETE USING (user_id = auth.uid() OR public.is_admin());

-- =============================================================================
-- ビュー: 期限切れタスク
-- =============================================================================

CREATE OR REPLACE VIEW public.v_overdue_tasks AS
SELECT
    t.*,
    p.name AS project_name,
    p.code AS project_code,
    pr.display_name AS assignee_name,
    pr.email AS assignee_email
FROM public.tasks t
LEFT JOIN public.projects p ON t.project_id = p.id
LEFT JOIN public.profiles pr ON t.assignee_id = pr.id
WHERE t.status NOT IN ('completed', 'cancelled')
  AND t.due_date < CURRENT_DATE;

COMMENT ON VIEW public.v_overdue_tasks IS '期限切れタスクの一覧';
