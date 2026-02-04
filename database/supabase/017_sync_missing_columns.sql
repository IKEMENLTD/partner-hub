-- =============================================================================
-- Migration: 017 - Sync Missing Columns
-- Date: 2026-02-03
-- Description: エンティティ定義とDBスキーマの同期（冪等性保証）
--
-- このスクリプトは何度実行しても安全です（IF NOT EXISTS使用）
-- =============================================================================

-- =============================================================================
-- 1. Projects テーブル
-- =============================================================================

-- organization_id
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- custom_slack_webhook_url
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS custom_slack_webhook_url VARCHAR(500);

-- deleted_at (soft delete)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- template_id
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS template_id UUID;

-- code
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS code VARCHAR(100);

-- =============================================================================
-- 2. Partners テーブル
-- =============================================================================

-- organization_id
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- preferred_channel
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS preferred_channel VARCHAR(20) DEFAULT 'email';

-- line_user_id
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS line_user_id VARCHAR(255);

-- sms_phone_number
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS sms_phone_number VARCHAR(50);

-- contact_setup_completed
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS contact_setup_completed BOOLEAN DEFAULT false;

-- contact_setup_token
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS contact_setup_token VARCHAR(255);

-- contact_setup_token_expires_at
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS contact_setup_token_expires_at TIMESTAMPTZ;

-- login_enabled
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS login_enabled BOOLEAN DEFAULT false;

-- deleted_at (soft delete)
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- =============================================================================
-- 3. Tasks テーブル
-- =============================================================================

-- deleted_at (soft delete)
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- =============================================================================
-- 4. Profiles テーブル
-- =============================================================================

-- organization_id
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- department
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS department VARCHAR(200);

-- position
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS position VARCHAR(200);

-- phone
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- =============================================================================
-- 5. インデックス追加（存在しない場合のみ）
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_partners_organization_id ON partners(organization_id);
CREATE INDEX IF NOT EXISTS idx_partners_deleted_at ON partners(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_partners_preferred_channel ON partners(preferred_channel);
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON profiles(organization_id);

-- =============================================================================
-- 完了通知
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Migration 017 completed successfully!';
    RAISE NOTICE 'All missing columns have been synchronized.';
    RAISE NOTICE '===========================================';
END $$;
