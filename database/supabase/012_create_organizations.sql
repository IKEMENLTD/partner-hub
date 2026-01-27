-- =============================================================================
-- Supabase Migration: 012 - Organizations (Multi-tenant Support)
-- Description: マルチテナント対応のための組織テーブルとRLSポリシー
-- =============================================================================

-- =============================================================================
-- 1. organizations テーブルの作成
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 基本情報
    name VARCHAR(500) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    logo_url VARCHAR(500),

    -- 設定・プラン
    settings JSONB NOT NULL DEFAULT '{}',
    plan VARCHAR(50) NOT NULL DEFAULT 'free',
    max_members INTEGER NOT NULL DEFAULT 5,
    max_partners INTEGER NOT NULL DEFAULT 50,

    -- ステータス
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- オーナー（作成者）
    owner_id UUID,

    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- インデックス
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON public.organizations(is_active);
CREATE INDEX IF NOT EXISTS idx_organizations_plan ON public.organizations(plan);

-- コメント
COMMENT ON TABLE public.organizations IS 'マルチテナント対応のための組織テーブル';
COMMENT ON COLUMN public.organizations.slug IS '組織の一意なスラッグ（URL用）';
COMMENT ON COLUMN public.organizations.plan IS '契約プラン（free, pro, enterprise）';
COMMENT ON COLUMN public.organizations.settings IS '組織固有の設定（JSON）';

-- =============================================================================
-- 2. organization_members テーブルの作成
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 関連ID
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- メンバー情報
    role VARCHAR(50) NOT NULL DEFAULT 'member',  -- owner, admin, member
    is_primary BOOLEAN NOT NULL DEFAULT false,   -- ユーザーのプライマリ組織

    -- 招待情報
    invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    -- ユニーク制約（同じユーザーは同じ組織に1回のみ参加可能）
    CONSTRAINT unique_org_member UNIQUE (organization_id, user_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_is_primary ON public.organization_members(user_id, is_primary) WHERE is_primary = true;

-- コメント
COMMENT ON TABLE public.organization_members IS '組織とユーザーの関連テーブル';
COMMENT ON COLUMN public.organization_members.role IS '組織内での役割（owner, admin, member）';
COMMENT ON COLUMN public.organization_members.is_primary IS 'ユーザーのプライマリ組織フラグ';

-- =============================================================================
-- 3. profiles テーブルに organization_id を追加
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE public.profiles
        ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

        CREATE INDEX idx_profiles_organization_id ON public.profiles(organization_id);
    END IF;
END $$;

COMMENT ON COLUMN public.profiles.organization_id IS 'ユーザーが所属するプライマリ組織（ショートカット用）';

-- =============================================================================
-- 4. partners テーブルに organization_id を追加
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'partners'
        AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE public.partners
        ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

        CREATE INDEX idx_partners_organization_id ON public.partners(organization_id);
    END IF;
END $$;

COMMENT ON COLUMN public.partners.organization_id IS 'パートナーが所属する組織';

-- =============================================================================
-- 5. RLS用ヘルパー関数の作成
-- =============================================================================

-- ユーザーが所属する組織IDを取得する関数
CREATE OR REPLACE FUNCTION public.get_user_organization_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT organization_id
    FROM public.organization_members
    WHERE user_id = auth.uid()
$$;

-- ユーザーのプライマリ組織IDを取得する関数
CREATE OR REPLACE FUNCTION public.get_user_primary_organization_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT organization_id
    FROM public.organization_members
    WHERE user_id = auth.uid() AND is_primary = true
    LIMIT 1
$$;

-- 同じ組織に所属しているかチェックする関数
CREATE OR REPLACE FUNCTION public.is_same_organization(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE user_id = auth.uid()
        AND organization_id = target_org_id
    )
$$;

-- 組織内でのロールをチェックする関数
CREATE OR REPLACE FUNCTION public.get_org_role(target_org_id UUID)
RETURNS VARCHAR
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT role
    FROM public.organization_members
    WHERE user_id = auth.uid()
    AND organization_id = target_org_id
    LIMIT 1
$$;

-- 組織の管理者かどうかをチェックする関数
CREATE OR REPLACE FUNCTION public.is_org_admin(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE user_id = auth.uid()
        AND organization_id = target_org_id
        AND role IN ('owner', 'admin')
    )
$$;

-- =============================================================================
-- 6. organizations テーブルのRLSポリシー
-- =============================================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 所属組織の閲覧を許可
CREATE POLICY "organizations_select_member"
    ON public.organizations
    FOR SELECT
    USING (
        id IN (SELECT public.get_user_organization_ids())
        OR public.is_admin()
    );

-- 組織の更新は組織管理者のみ
CREATE POLICY "organizations_update_admin"
    ON public.organizations
    FOR UPDATE
    USING (
        public.is_org_admin(id)
        OR public.is_admin()
    );

-- 組織の作成は認証済みユーザー
CREATE POLICY "organizations_insert_authenticated"
    ON public.organizations
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- 組織の削除はシステム管理者のみ
CREATE POLICY "organizations_delete_admin"
    ON public.organizations
    FOR DELETE
    USING (public.is_admin());

-- =============================================================================
-- 7. organization_members テーブルのRLSポリシー
-- =============================================================================

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 同じ組織のメンバーを閲覧可能
CREATE POLICY "organization_members_select"
    ON public.organization_members
    FOR SELECT
    USING (
        organization_id IN (SELECT public.get_user_organization_ids())
        OR public.is_admin()
    );

-- 組織管理者のみメンバーを追加可能
CREATE POLICY "organization_members_insert"
    ON public.organization_members
    FOR INSERT
    WITH CHECK (
        public.is_org_admin(organization_id)
        OR public.is_admin()
    );

-- 組織管理者のみメンバーを更新可能
CREATE POLICY "organization_members_update"
    ON public.organization_members
    FOR UPDATE
    USING (
        public.is_org_admin(organization_id)
        OR public.is_admin()
    );

-- 組織管理者または本人のみメンバーを削除可能
CREATE POLICY "organization_members_delete"
    ON public.organization_members
    FOR DELETE
    USING (
        public.is_org_admin(organization_id)
        OR public.is_admin()
        OR user_id = auth.uid()
    );

-- =============================================================================
-- 8. 既存テーブルへの組織ベースRLSポリシー追加（段階的更新用）
-- =============================================================================

-- profiles: 同じ組織のメンバーを閲覧可能にするポリシー追加
-- 注意: organization_id が NULL の場合は既存の動作を維持
CREATE POLICY "profiles_select_same_org"
    ON public.profiles
    FOR SELECT
    USING (
        organization_id IS NULL
        OR organization_id IN (SELECT public.get_user_organization_ids())
    );

-- partners: 同じ組織のパートナーのみ閲覧可能にするポリシー追加
CREATE POLICY "partners_select_same_org"
    ON public.partners
    FOR SELECT
    USING (
        organization_id IS NULL
        OR organization_id IN (SELECT public.get_user_organization_ids())
    );

-- partners: 同じ組織のパートナーのみ更新可能にするポリシー追加
CREATE POLICY "partners_update_same_org"
    ON public.partners
    FOR UPDATE
    USING (
        (organization_id IS NULL AND public.is_manager_or_above())
        OR (organization_id IN (SELECT public.get_user_organization_ids()) AND public.is_manager_or_above())
    );

-- partners: 同じ組織へのパートナー追加のみ可能にするポリシー追加
CREATE POLICY "partners_insert_same_org"
    ON public.partners
    FOR INSERT
    WITH CHECK (
        organization_id IS NULL
        OR (organization_id IN (SELECT public.get_user_organization_ids()) AND public.is_manager_or_above())
    );

-- =============================================================================
-- 9. updated_at トリガーの追加
-- =============================================================================

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organization_members_updated_at
    BEFORE UPDATE ON public.organization_members
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- 10. 組織作成時に自動的にメンバーシップを作成するトリガー
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 作成者を組織のオーナーとして登録
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
        ) ON CONFLICT (organization_id, user_id) DO NOTHING;

        -- プロフィールの organization_id も更新
        UPDATE public.profiles
        SET organization_id = NEW.id
        WHERE id = NEW.owner_id AND organization_id IS NULL;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER on_organization_created
    AFTER INSERT ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_organization();
