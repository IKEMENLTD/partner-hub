-- 013_align_enums.sql
-- DB/TS enum不整合の修正マイグレーション
-- 実行日: 2026-02-11

-- ============================================================
-- B-1. company_role に4値追加
-- ============================================================
ALTER TYPE company_role ADD VALUE IF NOT EXISTS 'orderer';
ALTER TYPE company_role ADD VALUE IF NOT EXISTS 'prime_contractor';
ALTER TYPE company_role ADD VALUE IF NOT EXISTS 'sales_lead';
ALTER TYPE company_role ADD VALUE IF NOT EXISTS 'service_provider';

-- ============================================================
-- B-2. project_type に3値追加
-- ============================================================
ALTER TYPE project_type ADD VALUE IF NOT EXISTS 'service';
ALTER TYPE project_type ADD VALUE IF NOT EXISTS 'maintenance';
ALTER TYPE project_type ADD VALUE IF NOT EXISTS 'support';

-- ============================================================
-- C-1. 重複する _enum サフィックス付きenumを削除
-- （TypeORM が自動生成した重複enum）
-- ============================================================
DROP TYPE IF EXISTS notification_channel_type_enum;
DROP TYPE IF EXISTS notification_status_enum;
DROP TYPE IF EXISTS notification_type_enum;
