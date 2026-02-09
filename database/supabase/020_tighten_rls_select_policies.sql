-- ============================================================
-- 020: SELECTポリシーの組織フィルタリング強化
-- ============================================================
-- 対象: projects, tasks, partners, project_partners,
--        project_stakeholders, task_comments
--
-- 変更内容:
--   認証済みユーザーなら全件閲覧可能だった旧ポリシーを削除し、
--   同一組織のデータのみ閲覧可能なポリシーに置き換える。
-- ============================================================

BEGIN;

-- ============================================================
-- 1. PROJECTS: 組織フィルタリング追加
-- ============================================================
DROP POLICY IF EXISTS "projects_select_policy" ON public.projects;

CREATE POLICY "projects_select_same_org"
    ON public.projects
    FOR SELECT
    USING (
        -- 組織未設定のプロジェクトは既存動作を維持
        organization_id IS NULL
        -- 同一組織のプロジェクトのみ閲覧可能
        OR organization_id IN (SELECT public.get_user_organization_ids())
        -- 自分がオーナーまたはマネージャーのプロジェクト
        OR owner_id = auth.uid()
        OR manager_id = auth.uid()
        -- システム管理者は全件閲覧可能
        OR public.is_admin()
    );

-- ============================================================
-- 2. TASKS: 組織フィルタリング追加（project経由）
-- ============================================================
DROP POLICY IF EXISTS "tasks_select_policy" ON public.tasks;

CREATE POLICY "tasks_select_same_org"
    ON public.tasks
    FOR SELECT
    USING (
        -- 自分が担当者または作成者のタスク
        assignee_id = auth.uid()
        OR created_by = auth.uid()
        -- 同一組織のプロジェクトに属するタスク
        OR EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = tasks.project_id
            AND (
                p.organization_id IS NULL
                OR p.organization_id IN (SELECT public.get_user_organization_ids())
                OR p.owner_id = auth.uid()
                OR p.manager_id = auth.uid()
            )
        )
        -- プロジェクトに紐付かないタスク（orphaned）は作成者のみ
        -- システム管理者は全件閲覧可能
        OR public.is_admin()
    );

-- ============================================================
-- 3. PARTNERS: 旧ポリシー（全件閲覧）を削除
--    ※ partners_select_same_org は 012 で追加済み
-- ============================================================
DROP POLICY IF EXISTS "partners_select_policy" ON public.partners;

-- ============================================================
-- 4. PROJECT_PARTNERS: 組織フィルタリング追加（project経由）
-- ============================================================
DROP POLICY IF EXISTS "project_partners_select_policy" ON public.project_partners;

CREATE POLICY "project_partners_select_same_org"
    ON public.project_partners
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_partners.project_id
            AND (
                p.organization_id IS NULL
                OR p.organization_id IN (SELECT public.get_user_organization_ids())
                OR p.owner_id = auth.uid()
                OR p.manager_id = auth.uid()
            )
        )
        OR public.is_admin()
    );

-- ============================================================
-- 5. PROJECT_STAKEHOLDERS: 組織フィルタリング追加（project経由）
-- ============================================================
DROP POLICY IF EXISTS "project_stakeholders_select_policy" ON public.project_stakeholders;

CREATE POLICY "project_stakeholders_select_same_org"
    ON public.project_stakeholders
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_stakeholders.project_id
            AND (
                p.organization_id IS NULL
                OR p.organization_id IN (SELECT public.get_user_organization_ids())
                OR p.owner_id = auth.uid()
                OR p.manager_id = auth.uid()
            )
        )
        OR public.is_admin()
    );

-- ============================================================
-- 6. TASK_COMMENTS: 組織フィルタリング追加（task→project経由）
-- ============================================================
DROP POLICY IF EXISTS "task_comments_select_policy" ON public.task_comments;

CREATE POLICY "task_comments_select_same_org"
    ON public.task_comments
    FOR SELECT
    USING (
        -- 自分のコメント
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.projects p ON p.id = t.project_id
            WHERE t.id = task_comments.task_id
            AND (
                p.organization_id IS NULL
                OR p.organization_id IN (SELECT public.get_user_organization_ids())
                OR p.owner_id = auth.uid()
                OR p.manager_id = auth.uid()
            )
        )
        OR public.is_admin()
    );

COMMIT;
