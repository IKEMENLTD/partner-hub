-- =============================================================================
-- Migration: 018 - Create Missing Tables
-- Date: 2026-02-03
-- Description: エンティティに定義されているがDBに存在しないテーブルを作成
-- =============================================================================

-- =============================================================================
-- 1. ENUM型の作成
-- =============================================================================

-- file_category
DO $$ BEGIN
    CREATE TYPE file_category AS ENUM ('document', 'image', 'spreadsheet', 'presentation', 'archive', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- escalation_action
DO $$ BEGIN
    CREATE TYPE escalation_action AS ENUM ('notify_owner', 'notify_stakeholders', 'escalate_to_manager');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- escalation_trigger_type
DO $$ BEGIN
    CREATE TYPE escalation_trigger_type AS ENUM ('days_before_due', 'days_after_due', 'progress_below');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- escalation_rule_status
DO $$ BEGIN
    CREATE TYPE escalation_rule_status AS ENUM ('active', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- escalation_log_status
DO $$ BEGIN
    CREATE TYPE escalation_log_status AS ENUM ('pending', 'executed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- progress_report_status
DO $$ BEGIN
    CREATE TYPE progress_report_status AS ENUM ('pending', 'submitted', 'reviewed', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- notification_channel_type
DO $$ BEGIN
    CREATE TYPE notification_channel_type AS ENUM ('email', 'slack', 'teams', 'line', 'sms', 'webhook', 'in_app');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- report_period
DO $$ BEGIN
    CREATE TYPE report_period AS ENUM ('weekly', 'monthly');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- report_config_status
DO $$ BEGIN
    CREATE TYPE report_config_status AS ENUM ('active', 'paused', 'deleted');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- generated_report_status
DO $$ BEGIN
    CREATE TYPE generated_report_status AS ENUM ('pending', 'generated', 'sent', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- schedule_frequency
DO $$ BEGIN
    CREATE TYPE schedule_frequency AS ENUM ('daily', 'weekly', 'biweekly', 'monthly');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- request_status
DO $$ BEGIN
    CREATE TYPE request_status AS ENUM ('pending', 'submitted', 'overdue', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- 2. project_files テーブル
-- =============================================================================

CREATE TABLE IF NOT EXISTS project_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    uploader_id UUID NOT NULL REFERENCES profiles(id),
    file_name VARCHAR(500) NOT NULL,
    original_name VARCHAR(500) NOT NULL,
    mime_type VARCHAR(200) NOT NULL,
    file_size BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    public_url TEXT,
    category VARCHAR(50) DEFAULT 'other',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_task_id ON project_files(task_id);
CREATE INDEX IF NOT EXISTS idx_project_files_uploader_id ON project_files(uploader_id);

-- =============================================================================
-- 3. notification_settings テーブル
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    digest_enabled BOOLEAN DEFAULT true,
    digest_time VARCHAR(5) DEFAULT '07:00',
    deadline_notification BOOLEAN DEFAULT true,
    assignee_change_notification BOOLEAN DEFAULT true,
    mention_notification BOOLEAN DEFAULT true,
    status_change_notification BOOLEAN DEFAULT true,
    reminder_max_count INTEGER DEFAULT 3,
    email_notification BOOLEAN DEFAULT true,
    push_notification BOOLEAN DEFAULT true,
    in_app_notification BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);

-- =============================================================================
-- 4. notification_channels テーブル
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50) DEFAULT 'in_app',
    is_active BOOLEAN DEFAULT true,
    channel_id VARCHAR(500),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    config JSONB,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_channels_project_id ON notification_channels(project_id);
CREATE INDEX IF NOT EXISTS idx_notification_channels_user_id ON notification_channels(user_id);

-- =============================================================================
-- 5. in_app_notifications テーブル
-- =============================================================================

CREATE TABLE IF NOT EXISTS in_app_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(20) DEFAULT 'system',
    title VARCHAR(500) NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    link_url VARCHAR(1000),
    task_id UUID,
    project_id UUID,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user_id ON in_app_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user_is_read ON in_app_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user_created ON in_app_notifications(user_id, created_at DESC);

-- =============================================================================
-- 6. escalation_rules テーブル
-- =============================================================================

CREATE TABLE IF NOT EXISTS escalation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    trigger_type VARCHAR(50) DEFAULT 'days_after_due',
    trigger_value INTEGER DEFAULT 1,
    action VARCHAR(50) DEFAULT 'notify_owner',
    status VARCHAR(20) DEFAULT 'active',
    priority INTEGER DEFAULT 1,
    notify_emails TEXT[] DEFAULT '{}',
    escalate_to_user_id UUID REFERENCES profiles(id),
    metadata JSONB,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escalation_rules_project_id ON escalation_rules(project_id);
CREATE INDEX IF NOT EXISTS idx_escalation_rules_status ON escalation_rules(status);

-- =============================================================================
-- 7. escalation_logs テーブル
-- =============================================================================

CREATE TABLE IF NOT EXISTS escalation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES escalation_rules(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    action_detail TEXT,
    notified_users TEXT[] DEFAULT '{}',
    escalated_to_user_id UUID REFERENCES profiles(id),
    error_message TEXT,
    executed_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escalation_logs_rule_id ON escalation_logs(rule_id);
CREATE INDEX IF NOT EXISTS idx_escalation_logs_task_id ON escalation_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_escalation_logs_project_id ON escalation_logs(project_id);

-- =============================================================================
-- 8. progress_reports テーブル
-- =============================================================================

CREATE TABLE IF NOT EXISTS progress_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    reporter_name VARCHAR(200) NOT NULL,
    reporter_email VARCHAR(255) NOT NULL,
    progress INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    comment TEXT,
    attachment_urls JSONB,
    report_token VARCHAR(255) NOT NULL UNIQUE,
    token_expires_at TIMESTAMPTZ NOT NULL,
    is_submitted BOOLEAN DEFAULT false,
    reviewer_id UUID REFERENCES profiles(id),
    reviewer_comment TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_progress_reports_task_id ON progress_reports(task_id);
CREATE INDEX IF NOT EXISTS idx_progress_reports_report_token ON progress_reports(report_token);

-- =============================================================================
-- 9. partner_invitations テーブル
-- =============================================================================

CREATE TABLE IF NOT EXISTS partner_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_invitations_partner_id ON partner_invitations(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_invitations_token ON partner_invitations(token);
CREATE INDEX IF NOT EXISTS idx_partner_invitations_email ON partner_invitations(email);

-- =============================================================================
-- 10. custom_field_templates テーブル
-- =============================================================================

CREATE TABLE IF NOT EXISTS custom_field_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    fields JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    organization_id UUID,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_field_templates_organization_id ON custom_field_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_templates_is_active ON custom_field_templates(is_active);

-- =============================================================================
-- 11. report_configs テーブル
-- =============================================================================

CREATE TABLE IF NOT EXISTS report_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    period VARCHAR(20) DEFAULT 'weekly',
    status VARCHAR(20) DEFAULT 'active',
    schedule_cron VARCHAR(100),
    day_of_week INTEGER DEFAULT 1,
    day_of_month INTEGER DEFAULT 1,
    send_time VARCHAR(10) DEFAULT '09:00',
    recipients TEXT[] DEFAULT '{}',
    include_project_summary BOOLEAN DEFAULT true,
    include_task_summary BOOLEAN DEFAULT true,
    include_partner_performance BOOLEAN DEFAULT true,
    include_highlights BOOLEAN DEFAULT true,
    project_ids TEXT[],
    partner_ids TEXT[],
    last_generated_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id),
    organization_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_report_configs_organization_id ON report_configs(organization_id);
CREATE INDEX IF NOT EXISTS idx_report_configs_status ON report_configs(status);

-- =============================================================================
-- 12. generated_reports テーブル
-- =============================================================================

CREATE TABLE IF NOT EXISTS generated_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_config_id UUID REFERENCES report_configs(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    period VARCHAR(20) NOT NULL,
    date_range_start DATE NOT NULL,
    date_range_end DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    report_data JSONB NOT NULL,
    sent_to TEXT[] DEFAULT '{}',
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    is_manual BOOLEAN DEFAULT false,
    generated_by UUID REFERENCES profiles(id),
    organization_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_reports_report_config_id ON generated_reports(report_config_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_organization_id ON generated_reports(organization_id);

-- =============================================================================
-- 13. report_schedules テーブル
-- =============================================================================

CREATE TABLE IF NOT EXISTS report_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    organization_id UUID,
    partner_id UUID REFERENCES partners(id),
    project_id UUID REFERENCES projects(id),
    frequency VARCHAR(20) NOT NULL,
    day_of_week INTEGER,
    day_of_month INTEGER,
    time_of_day TIME DEFAULT '09:00:00',
    deadline_days INTEGER DEFAULT 3,
    is_active BOOLEAN DEFAULT true,
    last_sent_at TIMESTAMPTZ,
    next_send_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_report_schedules_organization_id ON report_schedules(organization_id);
CREATE INDEX IF NOT EXISTS idx_report_schedules_partner_id ON report_schedules(partner_id);
CREATE INDEX IF NOT EXISTS idx_report_schedules_is_active ON report_schedules(is_active);

-- =============================================================================
-- 14. report_requests テーブル
-- =============================================================================

CREATE TABLE IF NOT EXISTS report_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    schedule_id UUID REFERENCES report_schedules(id),
    partner_id UUID NOT NULL REFERENCES partners(id),
    project_id UUID REFERENCES projects(id),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    deadline_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    report_id UUID,
    reminder_count INTEGER DEFAULT 0,
    last_reminder_at TIMESTAMPTZ,
    escalation_level INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_requests_schedule_id ON report_requests(schedule_id);
CREATE INDEX IF NOT EXISTS idx_report_requests_partner_id ON report_requests(partner_id);
CREATE INDEX IF NOT EXISTS idx_report_requests_status ON report_requests(status);

-- =============================================================================
-- 15. partner_reports テーブル（存在しない場合のみ作成）
-- =============================================================================

CREATE TABLE IF NOT EXISTS partner_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    report_type VARCHAR(50) NOT NULL,
    progress_status VARCHAR(50),
    content TEXT,
    weekly_accomplishments TEXT,
    next_week_plan TEXT,
    attachments JSONB DEFAULT '[]',
    source VARCHAR(50) NOT NULL,
    source_reference VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    read_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    organization_id UUID
);

CREATE INDEX IF NOT EXISTS idx_partner_reports_partner_id ON partner_reports(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_reports_project_id ON partner_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_partner_reports_organization_id ON partner_reports(organization_id);

-- =============================================================================
-- 16. partner_report_tokens テーブル（存在しない場合のみ作成）
-- =============================================================================

CREATE TABLE IF NOT EXISTS partner_report_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN DEFAULT false,
    used_at TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_report_tokens_partner_id ON partner_report_tokens(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_report_tokens_token ON partner_report_tokens(token);

-- =============================================================================
-- 17. updated_at トリガーの設定
-- =============================================================================

-- notification_settings
DROP TRIGGER IF EXISTS update_notification_settings_updated_at ON notification_settings;
CREATE TRIGGER update_notification_settings_updated_at
    BEFORE UPDATE ON notification_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- notification_channels
DROP TRIGGER IF EXISTS update_notification_channels_updated_at ON notification_channels;
CREATE TRIGGER update_notification_channels_updated_at
    BEFORE UPDATE ON notification_channels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- escalation_rules
DROP TRIGGER IF EXISTS update_escalation_rules_updated_at ON escalation_rules;
CREATE TRIGGER update_escalation_rules_updated_at
    BEFORE UPDATE ON escalation_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- progress_reports
DROP TRIGGER IF EXISTS update_progress_reports_updated_at ON progress_reports;
CREATE TRIGGER update_progress_reports_updated_at
    BEFORE UPDATE ON progress_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- partner_invitations
DROP TRIGGER IF EXISTS update_partner_invitations_updated_at ON partner_invitations;
CREATE TRIGGER update_partner_invitations_updated_at
    BEFORE UPDATE ON partner_invitations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- custom_field_templates
DROP TRIGGER IF EXISTS update_custom_field_templates_updated_at ON custom_field_templates;
CREATE TRIGGER update_custom_field_templates_updated_at
    BEFORE UPDATE ON custom_field_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- report_configs
DROP TRIGGER IF EXISTS update_report_configs_updated_at ON report_configs;
CREATE TRIGGER update_report_configs_updated_at
    BEFORE UPDATE ON report_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- report_schedules
DROP TRIGGER IF EXISTS update_report_schedules_updated_at ON report_schedules;
CREATE TRIGGER update_report_schedules_updated_at
    BEFORE UPDATE ON report_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 完了メッセージ
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Migration 018 completed!';
    RAISE NOTICE 'Created tables:';
    RAISE NOTICE '  - project_files';
    RAISE NOTICE '  - notification_settings';
    RAISE NOTICE '  - notification_channels';
    RAISE NOTICE '  - in_app_notifications';
    RAISE NOTICE '  - escalation_rules';
    RAISE NOTICE '  - escalation_logs';
    RAISE NOTICE '  - progress_reports';
    RAISE NOTICE '  - partner_invitations';
    RAISE NOTICE '  - custom_field_templates';
    RAISE NOTICE '  - report_configs';
    RAISE NOTICE '  - generated_reports';
    RAISE NOTICE '  - report_schedules';
    RAISE NOTICE '  - report_requests';
    RAISE NOTICE '  - partner_reports';
    RAISE NOTICE '  - partner_report_tokens';
    RAISE NOTICE '==========================================';
END $$;
