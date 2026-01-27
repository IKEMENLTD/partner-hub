-- =============================================================================
-- Supabase Migration: 013 - Migrate Existing Data to Organizations
-- Description: 既存データをデフォルト組織に移行するためのスクリプト
-- =============================================================================

-- =============================================================================
-- 既存データ移行方針
-- =============================================================================
--
-- 1. デフォルト組織の作成
--    - 既存の全データを1つのデフォルト組織に紐付け
--    - 後から組織を分割することも可能
--
-- 2. 既存ユーザーの移行
--    - 全ての既存プロフィールをデフォルト組織に所属させる
--    - admin ロールのユーザーは組織の owner として登録
--    - manager ロールのユーザーは組織の admin として登録
--    - その他は member として登録
--
-- 3. 既存パートナーの移行
--    - 全ての既存パートナーをデフォルト組織に紐付け
--
-- 注意: このマイグレーションは本番環境では慎重に実行してください
-- =============================================================================

-- トランザクション開始
BEGIN;

-- =============================================================================
-- 1. デフォルト組織の作成（既に存在しない場合のみ）
-- =============================================================================

DO $$
DECLARE
    default_org_id UUID;
    admin_user_id UUID;
BEGIN
    -- デフォルト組織が既に存在するかチェック
    SELECT id INTO default_org_id
    FROM public.organizations
    WHERE slug = 'default-organization'
    LIMIT 1;

    -- 存在しない場合は作成
    IF default_org_id IS NULL THEN
        -- 最初の admin ユーザーを探す（組織オーナーとして設定）
        SELECT id INTO admin_user_id
        FROM public.profiles
        WHERE role = 'admin'
        ORDER BY created_at ASC
        LIMIT 1;

        -- デフォルト組織を作成
        INSERT INTO public.organizations (
            name,
            slug,
            description,
            plan,
            max_members,
            max_partners,
            owner_id
        ) VALUES (
            'Default Organization',
            'default-organization',
            'Automatically created default organization for existing data migration',
            'free',
            1000,  -- 既存データ対応のため大きめに設定
            10000,
            admin_user_id
        )
        RETURNING id INTO default_org_id;

        RAISE NOTICE 'Created default organization with id: %', default_org_id;
    ELSE
        RAISE NOTICE 'Default organization already exists with id: %', default_org_id;
    END IF;

    -- =============================================================================
    -- 2. 既存プロフィールの organization_id を更新
    -- =============================================================================

    UPDATE public.profiles
    SET organization_id = default_org_id
    WHERE organization_id IS NULL;

    RAISE NOTICE 'Updated profiles with default organization';

    -- =============================================================================
    -- 3. 既存ユーザーを organization_members に追加
    -- =============================================================================

    -- admin ユーザーを owner として追加
    INSERT INTO public.organization_members (
        organization_id,
        user_id,
        role,
        is_primary
    )
    SELECT
        default_org_id,
        id,
        'owner',
        true
    FROM public.profiles
    WHERE role = 'admin'
    ON CONFLICT (organization_id, user_id) DO UPDATE
    SET role = 'owner', is_primary = true;

    RAISE NOTICE 'Added admin users as organization owners';

    -- manager ユーザーを admin として追加
    INSERT INTO public.organization_members (
        organization_id,
        user_id,
        role,
        is_primary
    )
    SELECT
        default_org_id,
        id,
        'admin',
        true
    FROM public.profiles
    WHERE role = 'manager'
    ON CONFLICT (organization_id, user_id) DO NOTHING;

    RAISE NOTICE 'Added manager users as organization admins';

    -- その他のユーザーを member として追加
    INSERT INTO public.organization_members (
        organization_id,
        user_id,
        role,
        is_primary
    )
    SELECT
        default_org_id,
        id,
        'member',
        true
    FROM public.profiles
    WHERE role NOT IN ('admin', 'manager')
    ON CONFLICT (organization_id, user_id) DO NOTHING;

    RAISE NOTICE 'Added remaining users as organization members';

    -- =============================================================================
    -- 4. 既存パートナーの organization_id を更新
    -- =============================================================================

    UPDATE public.partners
    SET organization_id = default_org_id
    WHERE organization_id IS NULL;

    RAISE NOTICE 'Updated partners with default organization';

END $$;

-- =============================================================================
-- 5. 移行結果の確認用クエリ
-- =============================================================================

-- 組織の確認
SELECT
    'Organizations' as table_name,
    COUNT(*) as total_count
FROM public.organizations;

-- 組織メンバーの確認
SELECT
    'Organization Members' as table_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN role = 'owner' THEN 1 END) as owners,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
    COUNT(CASE WHEN role = 'member' THEN 1 END) as members
FROM public.organization_members;

-- プロフィールの organization_id 設定状況
SELECT
    'Profiles' as table_name,
    COUNT(*) as total_count,
    COUNT(organization_id) as with_org,
    COUNT(*) - COUNT(organization_id) as without_org
FROM public.profiles;

-- パートナーの organization_id 設定状況
SELECT
    'Partners' as table_name,
    COUNT(*) as total_count,
    COUNT(organization_id) as with_org,
    COUNT(*) - COUNT(organization_id) as without_org
FROM public.partners;

COMMIT;

-- =============================================================================
-- ロールバック用SQL（必要に応じて手動で実行）
-- =============================================================================
/*
BEGIN;

-- organization_members からデフォルト組織のメンバーを削除
DELETE FROM public.organization_members
WHERE organization_id = (
    SELECT id FROM public.organizations WHERE slug = 'default-organization'
);

-- profiles の organization_id をクリア
UPDATE public.profiles SET organization_id = NULL;

-- partners の organization_id をクリア
UPDATE public.partners SET organization_id = NULL;

-- デフォルト組織を削除
DELETE FROM public.organizations WHERE slug = 'default-organization';

COMMIT;
*/
