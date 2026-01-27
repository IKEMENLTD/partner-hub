-- =============================================================================
-- 014_fix_existing_data.sql
-- 既存データの修正（マルチテナント・ステータス問題対応）
-- =============================================================================

-- 1. 既存のパートナーユーザーにorganization_idを設定
-- パートナーレコードに紐付いているユーザーで、organization_idが未設定のものを修正
UPDATE profiles p
SET organization_id = par.organization_id
FROM partners par
WHERE p.id = par.user_id
  AND p.organization_id IS NULL
  AND par.organization_id IS NOT NULL;

-- 2. 招待から登録済みのパートナーをアクティブに変更
-- user_idが設定されている = 登録完了済み
UPDATE partners
SET status = 'active'
WHERE user_id IS NOT NULL
  AND status = 'pending';

-- =============================================================================
-- 確認クエリ
-- =============================================================================

-- 修正結果の確認
SELECT
    'profiles' as table_name,
    COUNT(*) as total,
    COUNT(organization_id) as with_org_id,
    COUNT(*) - COUNT(organization_id) as without_org_id
FROM profiles
WHERE id IN (SELECT user_id FROM partners WHERE user_id IS NOT NULL)

UNION ALL

SELECT
    'partners' as table_name,
    COUNT(*) as total,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
    COUNT(CASE WHEN status = 'pending' AND user_id IS NOT NULL THEN 1 END) as pending_with_user
FROM partners;

-- =============================================================================
-- 完了
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Existing data fixed successfully!';
END $$;
