-- =============================================================================
-- Migration: 019 - Enable RLS on Missing Tables
-- Date: 2026-02-06
-- Description: RLSが未設定/無効のテーブルにRLSポリシーを追加
--   対象: in_app_notifications, partner_evaluations, project_files,
--          escalation_rules, escalation_logs
--   ※ progress_reports はトークンベースアクセスのため意図的にRLS無効を維持
-- =============================================================================

-- =============================================================================
-- 1. in_app_notifications - ユーザー自身の通知のみアクセス可能
-- =============================================================================

ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

-- 自分の通知のみ閲覧可能
CREATE POLICY "in_app_notifications_select_own"
    ON public.in_app_notifications
    FOR SELECT
    USING (user_id = auth.uid());

-- 自分の通知のみ更新可能（既読マーク等）
CREATE POLICY "in_app_notifications_update_own"
    ON public.in_app_notifications
    FOR UPDATE
    USING (user_id = auth.uid());

-- 自分の通知のみ削除可能
CREATE POLICY "in_app_notifications_delete_own"
    ON public.in_app_notifications
    FOR DELETE
    USING (user_id = auth.uid());

-- INSERT はバックエンド（TypeORM/postgres role = BYPASSRLS）経由のみ
-- Supabase クライアントからの直接挿入を防止
CREATE POLICY "in_app_notifications_insert_deny"
    ON public.in_app_notifications
    FOR INSERT
    WITH CHECK (false);

-- =============================================================================
-- 2. partner_evaluations - 同じ組織のパートナー評価のみアクセス可能
-- =============================================================================

ALTER TABLE public.partner_evaluations ENABLE ROW LEVEL SECURITY;

-- 同じ組織のパートナーの評価を閲覧可能
CREATE POLICY "partner_evaluations_select_same_org"
    ON public.partner_evaluations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.partners p
            WHERE p.id = partner_evaluations.partner_id
            AND (
                p.organization_id IS NULL
                OR p.organization_id IN (SELECT public.get_user_organization_ids())
            )
        )
        OR public.is_admin()
    );

-- マネージャー以上かつ同じ組織のパートナーのみ評価作成可能
CREATE POLICY "partner_evaluations_insert_manager_same_org"
    ON public.partner_evaluations
    FOR INSERT
    WITH CHECK (
        public.is_manager_or_above()
        AND evaluator_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.partners p
            WHERE p.id = partner_evaluations.partner_id
            AND (
                p.organization_id IS NULL
                OR p.organization_id IN (SELECT public.get_user_organization_ids())
            )
        )
    );

-- 評価者本人またはアドミンのみ更新可能
CREATE POLICY "partner_evaluations_update_evaluator"
    ON public.partner_evaluations
    FOR UPDATE
    USING (
        evaluator_id = auth.uid()
        OR public.is_admin()
    );

-- アドミンのみ削除可能
CREATE POLICY "partner_evaluations_delete_admin"
    ON public.partner_evaluations
    FOR DELETE
    USING (public.is_admin());

-- =============================================================================
-- 3. project_files - 同じ組織のプロジェクトファイルのみアクセス可能
-- =============================================================================

ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

-- 同じ組織のプロジェクトのファイルを閲覧可能
CREATE POLICY "project_files_select_same_org"
    ON public.project_files
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_files.project_id
            AND (
                p.organization_id IS NULL
                OR p.organization_id IN (SELECT public.get_user_organization_ids())
            )
        )
        OR public.is_admin()
    );

-- 同じ組織のプロジェクトにファイルをアップロード可能
CREATE POLICY "project_files_insert_same_org"
    ON public.project_files
    FOR INSERT
    WITH CHECK (
        uploader_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_files.project_id
            AND (
                p.organization_id IS NULL
                OR p.organization_id IN (SELECT public.get_user_organization_ids())
            )
        )
    );

-- アップロード者本人またはアドミンのみ更新可能
CREATE POLICY "project_files_update_uploader"
    ON public.project_files
    FOR UPDATE
    USING (
        uploader_id = auth.uid()
        OR public.is_admin()
    );

-- アップロード者本人またはアドミンのみ削除可能
CREATE POLICY "project_files_delete_uploader"
    ON public.project_files
    FOR DELETE
    USING (
        uploader_id = auth.uid()
        OR public.is_admin()
    );

-- =============================================================================
-- 4. escalation_rules - 同じ組織のプロジェクトのルールのみアクセス可能
-- =============================================================================

ALTER TABLE public.escalation_rules ENABLE ROW LEVEL SECURITY;

-- 同じ組織のプロジェクトのルールを閲覧可能（グローバルルールも含む）
CREATE POLICY "escalation_rules_select_same_org"
    ON public.escalation_rules
    FOR SELECT
    USING (
        project_id IS NULL
        OR EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = escalation_rules.project_id
            AND (
                p.organization_id IS NULL
                OR p.organization_id IN (SELECT public.get_user_organization_ids())
            )
        )
        OR public.is_admin()
    );

-- マネージャー以上のみルール作成可能
CREATE POLICY "escalation_rules_insert_manager"
    ON public.escalation_rules
    FOR INSERT
    WITH CHECK (public.is_manager_or_above());

-- マネージャー以上のみルール更新可能
CREATE POLICY "escalation_rules_update_manager"
    ON public.escalation_rules
    FOR UPDATE
    USING (public.is_manager_or_above());

-- アドミンのみルール削除可能
CREATE POLICY "escalation_rules_delete_admin"
    ON public.escalation_rules
    FOR DELETE
    USING (public.is_admin());

-- =============================================================================
-- 5. escalation_logs - 同じ組織のプロジェクトのログのみ閲覧可能
-- =============================================================================

ALTER TABLE public.escalation_logs ENABLE ROW LEVEL SECURITY;

-- 同じ組織のプロジェクトのログを閲覧可能
CREATE POLICY "escalation_logs_select_same_org"
    ON public.escalation_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = escalation_logs.project_id
            AND (
                p.organization_id IS NULL
                OR p.organization_id IN (SELECT public.get_user_organization_ids())
            )
        )
        OR public.is_admin()
    );

-- ログはシステム（バックエンド）のみ作成可能
-- Supabase クライアントからの直接挿入を防止
CREATE POLICY "escalation_logs_insert_deny"
    ON public.escalation_logs
    FOR INSERT
    WITH CHECK (false);

-- ログはシステム（バックエンド）のみ更新可能
CREATE POLICY "escalation_logs_update_deny"
    ON public.escalation_logs
    FOR UPDATE
    USING (false);

-- アドミンのみログ削除可能
CREATE POLICY "escalation_logs_delete_admin"
    ON public.escalation_logs
    FOR DELETE
    USING (public.is_admin());

-- =============================================================================
-- 6. progress_reports - バックエンド専用（トークンベースアクセス）
--    パートナーはログイン不要だが、アクセスは全てバックエンド(TypeORM)経由。
--    Supabase REST API からの直接アクセスを防止するためRLSを有効化。
-- =============================================================================

-- 既存の DISABLE を上書き
ALTER TABLE public.progress_reports ENABLE ROW LEVEL SECURITY;

-- 同じ組織のプロジェクトに紐づくレポートのみ閲覧可能
CREATE POLICY "progress_reports_select_same_org"
    ON public.progress_reports
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.projects p ON p.id = t.project_id
            WHERE t.id = progress_reports.task_id
            AND (
                p.organization_id IS NULL
                OR p.organization_id IN (SELECT public.get_user_organization_ids())
            )
        )
        OR public.is_admin()
    );

-- INSERT/UPDATE はバックエンド（TypeORM/postgres role = BYPASSRLS）経由のみ
-- Supabase クライアントからの直接操作を防止
CREATE POLICY "progress_reports_insert_deny"
    ON public.progress_reports
    FOR INSERT
    WITH CHECK (false);

CREATE POLICY "progress_reports_update_deny"
    ON public.progress_reports
    FOR UPDATE
    USING (false);

-- アドミンのみ削除可能
CREATE POLICY "progress_reports_delete_admin"
    ON public.progress_reports
    FOR DELETE
    USING (public.is_admin());

-- =============================================================================
-- 完了ログ
-- =============================================================================
-- RLS有効化済みテーブル（全6テーブル）:
--   [NEW] in_app_notifications   (user_id ベース)
--   [NEW] partner_evaluations    (組織ベース: partners.organization_id 経由)
--   [NEW] project_files          (組織ベース: projects.organization_id 経由)
--   [NEW] escalation_rules       (組織ベース: projects.organization_id 経由)
--   [NEW] escalation_logs        (組織ベース: projects.organization_id 経由)
--   [NEW] progress_reports       (組織ベース: tasks→projects.organization_id 経由)
--
-- RLS無効テーブル: なし（全テーブル有効化完了）
-- =============================================================================
