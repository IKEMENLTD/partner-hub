-- =============================================================================
-- Migration: 024 - Enable RLS on system_settings
-- Date: 2026-02-11
-- Description: system_settingsテーブルにRLSポリシーを追加
--   管理者のみアクセス可能
-- =============================================================================

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 管理者のみ閲覧可能
CREATE POLICY "system_settings_select_admin"
    ON public.system_settings
    FOR SELECT
    USING (
        organization_id IN (SELECT public.get_user_organization_ids())
        AND public.is_admin()
    );

-- 管理者のみ作成可能
CREATE POLICY "system_settings_insert_admin"
    ON public.system_settings
    FOR INSERT
    WITH CHECK (
        organization_id IN (SELECT public.get_user_organization_ids())
        AND public.is_admin()
    );

-- 管理者のみ更新可能
CREATE POLICY "system_settings_update_admin"
    ON public.system_settings
    FOR UPDATE
    USING (
        organization_id IN (SELECT public.get_user_organization_ids())
        AND public.is_admin()
    );

-- 管理者のみ削除可能
CREATE POLICY "system_settings_delete_admin"
    ON public.system_settings
    FOR DELETE
    USING (
        organization_id IN (SELECT public.get_user_organization_ids())
        AND public.is_admin()
    );

-- バックエンド（service_role）はフルアクセス
CREATE POLICY "system_settings_service_role"
    ON public.system_settings
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
