-- =============================================================================
-- 012_fix_organizations.sql
-- 既存ポリシーを削除してから再作成する修正版
-- =============================================================================

-- まず既存のポリシーを削除
DROP POLICY IF EXISTS "organizations_select_member" ON public.organizations;
DROP POLICY IF EXISTS "organizations_update_admin" ON public.organizations;
DROP POLICY IF EXISTS "organizations_insert_authenticated" ON public.organizations;
DROP POLICY IF EXISTS "organizations_delete_admin" ON public.organizations;

DROP POLICY IF EXISTS "organization_members_select" ON public.organization_members;
DROP POLICY IF EXISTS "organization_members_insert" ON public.organization_members;
DROP POLICY IF EXISTS "organization_members_update" ON public.organization_members;
DROP POLICY IF EXISTS "organization_members_delete" ON public.organization_members;

DROP POLICY IF EXISTS "profiles_select_same_org" ON public.profiles;
DROP POLICY IF EXISTS "partners_select_same_org" ON public.partners;
DROP POLICY IF EXISTS "partners_update_same_org" ON public.partners;
DROP POLICY IF EXISTS "partners_insert_same_org" ON public.partners;

-- トリガーも削除
DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
DROP TRIGGER IF EXISTS update_organization_members_updated_at ON public.organization_members;
DROP TRIGGER IF EXISTS on_organization_created ON public.organizations;

-- =============================================================================
-- RLSポリシーを再作成
-- =============================================================================

-- organizations テーブル
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organizations_select_member"
    ON public.organizations
    FOR SELECT
    USING (
        id IN (SELECT public.get_user_organization_ids())
        OR public.is_admin()
    );

CREATE POLICY "organizations_update_admin"
    ON public.organizations
    FOR UPDATE
    USING (
        public.is_org_admin(id)
        OR public.is_admin()
    );

CREATE POLICY "organizations_insert_authenticated"
    ON public.organizations
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "organizations_delete_admin"
    ON public.organizations
    FOR DELETE
    USING (public.is_admin());

-- organization_members テーブル
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organization_members_select"
    ON public.organization_members
    FOR SELECT
    USING (
        organization_id IN (SELECT public.get_user_organization_ids())
        OR public.is_admin()
    );

CREATE POLICY "organization_members_insert"
    ON public.organization_members
    FOR INSERT
    WITH CHECK (
        public.is_org_admin(organization_id)
        OR public.is_admin()
    );

CREATE POLICY "organization_members_update"
    ON public.organization_members
    FOR UPDATE
    USING (
        public.is_org_admin(organization_id)
        OR public.is_admin()
    );

CREATE POLICY "organization_members_delete"
    ON public.organization_members
    FOR DELETE
    USING (
        public.is_org_admin(organization_id)
        OR public.is_admin()
        OR user_id = auth.uid()
    );

-- profiles: 同じ組織のメンバーを閲覧可能
CREATE POLICY "profiles_select_same_org"
    ON public.profiles
    FOR SELECT
    USING (
        organization_id IS NULL
        OR organization_id IN (SELECT public.get_user_organization_ids())
    );

-- partners: 同じ組織のパートナーのみ
CREATE POLICY "partners_select_same_org"
    ON public.partners
    FOR SELECT
    USING (
        organization_id IS NULL
        OR organization_id IN (SELECT public.get_user_organization_ids())
    );

CREATE POLICY "partners_update_same_org"
    ON public.partners
    FOR UPDATE
    USING (
        (organization_id IS NULL AND public.is_manager_or_above())
        OR (organization_id IN (SELECT public.get_user_organization_ids()) AND public.is_manager_or_above())
    );

CREATE POLICY "partners_insert_same_org"
    ON public.partners
    FOR INSERT
    WITH CHECK (
        organization_id IS NULL
        OR (organization_id IN (SELECT public.get_user_organization_ids()) AND public.is_manager_or_above())
    );

-- =============================================================================
-- トリガーを再作成
-- =============================================================================

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organization_members_updated_at
    BEFORE UPDATE ON public.organization_members
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 組織作成時の自動メンバーシップ作成
CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.owner_id IS NOT NULL THEN
        INSERT INTO public.organization_members (
            organization_id,
            user_id,
            role,
            is_primary
        ) VALUES (
            NEW.id,
            NEW.owner_id,
            'owner',
            true
        )
        ON CONFLICT (organization_id, user_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_organization_created
    AFTER INSERT ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_organization();

-- =============================================================================
-- 完了
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Organizations RLS policies recreated successfully!';
END $$;
