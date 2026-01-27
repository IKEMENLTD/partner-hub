-- =============================================================================
-- Supabase Migration: Complete Schema Setup
-- Description: すべてのマイグレーションを順番に実行
-- =============================================================================

-- 実行方法:
-- 1. Supabase Dashboard > SQL Editor を開く
-- 2. このファイルの内容をコピー&ペースト
-- 3. 「Run」をクリック
--
-- または、各ファイルを個別に順番に実行:
-- 001_profiles_and_auth.sql
-- 002_partners.sql
-- 003_projects.sql
-- 004_tasks.sql
-- 005_reminders.sql
-- 006_audit_logs.sql
-- 007_views_and_functions.sql
-- 008_data_migration.sql (必要に応じて)
-- 009_seed_data.sql (開発環境のみ)
-- 010_add_metadata_column.sql
-- 011_add_soft_delete.sql
-- 012_create_organizations.sql (マルチテナント対応)
-- 012_fix_organizations.sql (ポリシー重複修正)
-- 013_migrate_to_organizations.sql (既存データ移行)
-- 014_fix_existing_data.sql (既存データ修正)
-- 015_partner_reports.sql (パートナー報告システム)

-- =============================================================================
-- 注意事項
-- =============================================================================
-- - このスクリプトは新規Supabaseプロジェクトで実行してください
-- - 既存のテーブルがある場合はエラーになる可能性があります
-- - 本番環境では十分なテストを行ってから実行してください

-- =============================================================================
-- 実行確認
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Partner Hub - Supabase Migration Starting';
    RAISE NOTICE '===========================================';
END $$;

-- 各SQLファイルの内容をここに含める場合は、
-- 以下のように各ファイルの内容を順番にコピーしてください。

-- 注: Supabase SQL Editor では \i コマンドが使えないため、
-- 各ファイルの内容を手動でこのファイルに統合するか、
-- 個別に実行する必要があります。

-- =============================================================================
-- 完了確認
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Migration Complete!';
    RAISE NOTICE 'Please verify the following:';
    RAISE NOTICE '1. All tables created successfully';
    RAISE NOTICE '2. RLS policies are enabled';
    RAISE NOTICE '3. Triggers are set up';
    RAISE NOTICE '===========================================';
END $$;

-- テーブル一覧確認
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
