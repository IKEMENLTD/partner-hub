-- =============================================================================
-- Supabase Migration: 007 - Views and Utility Functions
-- Description: ビューとユーティリティ関数
-- =============================================================================

-- =============================================================================
-- ビュー定義
-- =============================================================================

-- -----------------------------------------------------------------------------
-- アクティブな案件一覧ビュー
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_active_projects AS
SELECT
    p.*,
    owner.display_name AS owner_name,
    owner.email AS owner_email,
    manager.display_name AS manager_name,
    pt.name AS template_name,
    (
        SELECT COUNT(*)
        FROM public.tasks t
        WHERE t.project_id = p.id
    ) AS total_tasks,
    (
        SELECT COUNT(*)
        FROM public.tasks t
        WHERE t.project_id = p.id AND t.status = 'completed'
    ) AS completed_tasks,
    (
        SELECT COUNT(*)
        FROM public.project_stakeholders ps
        WHERE ps.project_id = p.id
    ) AS stakeholder_count,
    (
        SELECT COUNT(*)
        FROM public.project_partners pp
        WHERE pp.project_id = p.id
    ) AS partner_count
FROM public.projects p
LEFT JOIN public.profiles owner ON p.owner_id = owner.id
LEFT JOIN public.profiles manager ON p.manager_id = manager.id
LEFT JOIN public.project_templates pt ON p.template_id = pt.id
WHERE p.status NOT IN ('completed', 'cancelled');

COMMENT ON VIEW public.v_active_projects IS 'アクティブな案件の一覧（完了・キャンセル以外）';

-- -----------------------------------------------------------------------------
-- プロジェクトサマリービュー
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_project_summary AS
SELECT
    p.id,
    p.name,
    p.code,
    p.status,
    p.priority,
    p.project_type,
    p.start_date,
    p.end_date,
    p.progress,
    p.health_score,
    p.owner_id,
    owner.display_name AS owner_name,
    (
        SELECT COUNT(*)
        FROM public.tasks t
        WHERE t.project_id = p.id
    ) AS total_tasks,
    (
        SELECT COUNT(*)
        FROM public.tasks t
        WHERE t.project_id = p.id AND t.status = 'completed'
    ) AS completed_tasks,
    (
        SELECT COUNT(*)
        FROM public.tasks t
        WHERE t.project_id = p.id
        AND t.status NOT IN ('completed', 'cancelled')
        AND t.due_date < CURRENT_DATE
    ) AS overdue_tasks,
    (
        SELECT COUNT(*)
        FROM public.project_partners pp
        WHERE pp.project_id = p.id
    ) AS partner_count
FROM public.projects p
LEFT JOIN public.profiles owner ON p.owner_id = owner.id;

COMMENT ON VIEW public.v_project_summary IS '案件サマリー情報';

-- -----------------------------------------------------------------------------
-- ユーザータスクダッシュボードビュー
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_user_task_dashboard AS
SELECT
    t.id,
    t.title,
    t.status,
    t.priority,
    t.due_date,
    t.progress,
    t.assignee_id,
    t.project_id,
    p.name AS project_name,
    p.code AS project_code,
    CASE
        WHEN t.due_date < CURRENT_DATE AND t.status NOT IN ('completed', 'cancelled')
        THEN true
        ELSE false
    END AS is_overdue,
    CASE
        WHEN t.due_date = CURRENT_DATE AND t.status NOT IN ('completed', 'cancelled')
        THEN true
        ELSE false
    END AS is_due_today,
    CASE
        WHEN t.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
             AND t.status NOT IN ('completed', 'cancelled')
        THEN true
        ELSE false
    END AS is_due_this_week
FROM public.tasks t
LEFT JOIN public.projects p ON t.project_id = p.id
WHERE t.status NOT IN ('completed', 'cancelled');

COMMENT ON VIEW public.v_user_task_dashboard IS 'ユーザータスクダッシュボード用ビュー';

-- =============================================================================
-- ユーティリティ関数
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 案件の進捗率を計算
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_project_progress(p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
    total_tasks INTEGER;
    completed_tasks INTEGER;
    progress INTEGER;
BEGIN
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'completed')
    INTO total_tasks, completed_tasks
    FROM public.tasks
    WHERE project_id = p_project_id;

    IF total_tasks = 0 THEN
        RETURN 0;
    END IF;

    progress := (completed_tasks * 100) / total_tasks;
    RETURN progress;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- -----------------------------------------------------------------------------
-- 案件の健全性スコアを計算
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_project_health_score(p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
    base_score INTEGER := 100;
    overdue_count INTEGER;
    total_tasks INTEGER;
    overdue_penalty INTEGER;
    schedule_penalty INTEGER;
    project_record RECORD;
BEGIN
    -- 基本情報取得
    SELECT * INTO project_record
    FROM public.projects
    WHERE id = p_project_id;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- 期限切れタスク数を取得
    SELECT COUNT(*) INTO overdue_count
    FROM public.tasks
    WHERE project_id = p_project_id
      AND status NOT IN ('completed', 'cancelled')
      AND due_date < CURRENT_DATE;

    -- 総タスク数を取得
    SELECT COUNT(*) INTO total_tasks
    FROM public.tasks
    WHERE project_id = p_project_id;

    -- 期限切れペナルティ（1タスクあたり-5点、最大-30点）
    IF total_tasks > 0 THEN
        overdue_penalty := LEAST(overdue_count * 5, 30);
    ELSE
        overdue_penalty := 0;
    END IF;

    -- スケジュール遅延ペナルティ
    IF project_record.end_date IS NOT NULL
       AND project_record.end_date < CURRENT_DATE
       AND project_record.status NOT IN ('completed', 'cancelled') THEN
        schedule_penalty := 20;
    ELSE
        schedule_penalty := 0;
    END IF;

    -- 最終スコア計算（最小0）
    RETURN GREATEST(base_score - overdue_penalty - schedule_penalty, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- -----------------------------------------------------------------------------
-- ユーザーの今週のタスク数を取得
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_weekly_task_count(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    total_tasks BIGINT,
    completed_tasks BIGINT,
    in_progress_tasks BIGINT,
    overdue_tasks BIGINT
) AS $$
DECLARE
    target_user_id UUID;
BEGIN
    target_user_id := COALESCE(p_user_id, auth.uid());

    RETURN QUERY
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'completed'),
        COUNT(*) FILTER (WHERE status = 'in_progress'),
        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status NOT IN ('completed', 'cancelled'))
    FROM public.tasks
    WHERE assignee_id = target_user_id
      AND (
          due_date BETWEEN date_trunc('week', CURRENT_DATE) AND date_trunc('week', CURRENT_DATE) + INTERVAL '6 days'
          OR (status NOT IN ('completed', 'cancelled') AND due_date < CURRENT_DATE)
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- -----------------------------------------------------------------------------
-- プロジェクト統計を取得
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_project_statistics()
RETURNS TABLE (
    total_projects BIGINT,
    active_projects BIGINT,
    completed_projects BIGINT,
    on_hold_projects BIGINT,
    average_health_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'in_progress'),
        COUNT(*) FILTER (WHERE status = 'completed'),
        COUNT(*) FILTER (WHERE status = 'on_hold'),
        ROUND(AVG(health_score), 1)
    FROM public.projects;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- -----------------------------------------------------------------------------
-- 期限が近いタスクを取得
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_upcoming_tasks(
    p_days INTEGER DEFAULT 7,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    task_id UUID,
    title VARCHAR,
    due_date DATE,
    project_name VARCHAR,
    assignee_name VARCHAR,
    days_until_due INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.title,
        t.due_date,
        p.name,
        pr.display_name,
        (t.due_date - CURRENT_DATE)::INTEGER
    FROM public.tasks t
    LEFT JOIN public.projects p ON t.project_id = p.id
    LEFT JOIN public.profiles pr ON t.assignee_id = pr.id
    WHERE t.status NOT IN ('completed', 'cancelled')
      AND t.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + p_days
      AND (t.assignee_id = auth.uid() OR public.is_manager_or_above())
    ORDER BY t.due_date ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================================================
-- Realtime 設定
-- 注: Supabase Dashboard で Realtime を有効化する必要があります
-- =============================================================================

-- Realtime を有効化するテーブル:
-- - tasks (タスク更新のリアルタイム通知)
-- - reminders (通知のリアルタイム受信)
-- - projects (プロジェクト状態のリアルタイム更新)

-- Dashboard > Database > Replication から設定
-- または以下のSQLで設定:
--
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.reminders;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
