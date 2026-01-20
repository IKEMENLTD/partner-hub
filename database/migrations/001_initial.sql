-- =============================================================================
-- Migration: 001_initial
-- Description: Initial database schema for Partner Collaboration Platform
-- Created: 2026-01-19
-- =============================================================================

-- Migration metadata
-- @version: 001
-- @name: initial
-- @description: Create all initial tables, indexes, triggers and views

BEGIN;

-- =============================================================================
-- Step 1: Enable required extensions
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- Step 2: Create ENUM types
-- =============================================================================

DO $$
BEGIN
    -- project_type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_type') THEN
        CREATE TYPE project_type AS ENUM (
            'joint_development',
            'sales_partnership',
            'technology_license',
            'reseller_agreement',
            'consulting',
            'other'
        );
    END IF;

    -- company_role
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_role') THEN
        CREATE TYPE company_role AS ENUM (
            'prime',
            'subcontractor',
            'partner',
            'client'
        );
    END IF;

    -- project_status
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status') THEN
        CREATE TYPE project_status AS ENUM (
            'draft',
            'planning',
            'in_progress',
            'on_hold',
            'completed',
            'cancelled'
        );
    END IF;

    -- task_status
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
        CREATE TYPE task_status AS ENUM (
            'not_started',
            'in_progress',
            'waiting',
            'completed',
            'cancelled'
        );
    END IF;

    -- stakeholder_tier
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stakeholder_tier') THEN
        CREATE TYPE stakeholder_tier AS ENUM (
            'tier1',
            'tier2',
            'tier3',
            'tier4'
        );
    END IF;

    -- organization_type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organization_type') THEN
        CREATE TYPE organization_type AS ENUM (
            'corporation',
            'individual_business',
            'government',
            'nonprofit',
            'other'
        );
    END IF;

    -- notification_channel
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_channel') THEN
        CREATE TYPE notification_channel AS ENUM (
            'email',
            'slack',
            'teams',
            'webhook',
            'in_app'
        );
    END IF;

    -- notification_status
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_status') THEN
        CREATE TYPE notification_status AS ENUM (
            'pending',
            'sent',
            'delivered',
            'failed',
            'cancelled'
        );
    END IF;

    -- reminder_trigger_type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reminder_trigger_type') THEN
        CREATE TYPE reminder_trigger_type AS ENUM (
            'before_due',
            'after_due',
            'on_status_change',
            'periodic'
        );
    END IF;
END$$;

-- =============================================================================
-- Step 3: Create tables
-- =============================================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(200),
    department VARCHAR(200),
    position VARCHAR(200),
    phone VARCHAR(50),
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(500) NOT NULL,
    name_kana VARCHAR(500),
    short_name VARCHAR(200),
    organization_type organization_type NOT NULL DEFAULT 'corporation',
    corporate_number VARCHAR(13),
    postal_code VARCHAR(10),
    address TEXT,
    phone VARCHAR(50),
    fax VARCHAR(50),
    website_url TEXT,
    industry VARCHAR(200),
    employee_count INTEGER,
    annual_revenue BIGINT,
    fiscal_year_end INTEGER,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Persons table
CREATE TABLE IF NOT EXISTS persons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    email VARCHAR(255),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    first_name_kana VARCHAR(100),
    last_name_kana VARCHAR(100),
    display_name VARCHAR(200),
    department VARCHAR(200),
    position VARCHAR(200),
    phone VARCHAR(50),
    mobile_phone VARCHAR(50),
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Templates table
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(500) NOT NULL,
    description TEXT,
    project_type project_type NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    version INTEGER NOT NULL DEFAULT 1,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Template phases table
CREATE TABLE IF NOT EXISTS template_phases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    default_duration_days INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Template tasks table
CREATE TABLE IF NOT EXISTS template_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_phase_id UUID NOT NULL REFERENCES template_phases(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    default_duration_days INTEGER,
    is_milestone BOOLEAN NOT NULL DEFAULT false,
    reminder_config JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(500) NOT NULL,
    code VARCHAR(100),
    description TEXT,
    project_type project_type NOT NULL,
    company_role company_role NOT NULL,
    status project_status NOT NULL DEFAULT 'draft',
    health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),
    start_date DATE,
    end_date DATE,
    actual_end_date DATE,
    budget BIGINT,
    actual_cost BIGINT,
    template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
    owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    custom_fields JSONB DEFAULT '{}',
    tags VARCHAR(100)[],
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT chk_projects_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

-- Project phases table
CREATE TABLE IF NOT EXISTS project_phases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    template_phase_id UUID REFERENCES template_phases(id) ON DELETE SET NULL,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    status project_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Project stakeholders table
CREATE TABLE IF NOT EXISTS project_stakeholders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    tier stakeholder_tier NOT NULL DEFAULT 'tier1',
    parent_stakeholder_id UUID REFERENCES project_stakeholders(id) ON DELETE SET NULL,
    role_description VARCHAR(500),
    contract_amount BIGINT,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_project_stakeholders UNIQUE (project_id, organization_id)
);

-- Stakeholder contacts table
CREATE TABLE IF NOT EXISTS stakeholder_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_stakeholder_id UUID NOT NULL REFERENCES project_stakeholders(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    role VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_stakeholder_contacts UNIQUE (project_stakeholder_id, person_id)
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    project_phase_id UUID REFERENCES project_phases(id) ON DELETE SET NULL,
    template_task_id UUID REFERENCES template_tasks(id) ON DELETE SET NULL,
    parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    status task_status NOT NULL DEFAULT 'not_started',
    priority INTEGER NOT NULL DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
    assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assignee_stakeholder_id UUID REFERENCES project_stakeholders(id) ON DELETE SET NULL,
    due_date DATE,
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    estimated_hours DECIMAL(10, 2),
    actual_hours DECIMAL(10, 2),
    is_milestone BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    reminder_config JSONB,
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Reminder configs table
CREATE TABLE IF NOT EXISTS reminder_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(500) NOT NULL,
    description TEXT,
    trigger_type reminder_trigger_type NOT NULL,
    trigger_value INTEGER,
    channels notification_channel[] NOT NULL DEFAULT '{email}',
    message_template TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Task reminders table
CREATE TABLE IF NOT EXISTS task_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    reminder_config_id UUID NOT NULL REFERENCES reminder_configs(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    next_trigger_at TIMESTAMP WITH TIME ZONE,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_task_reminders UNIQUE (task_id, reminder_config_id)
);

-- Notification logs table
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    reminder_config_id UUID REFERENCES reminder_configs(id) ON DELETE SET NULL,
    recipient_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    recipient_person_id UUID REFERENCES persons(id) ON DELETE SET NULL,
    recipient_email VARCHAR(255),
    channel notification_channel NOT NULL,
    status notification_status NOT NULL DEFAULT 'pending',
    subject VARCHAR(1000),
    message TEXT,
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Task comments table
CREATE TABLE IF NOT EXISTS task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    person_id UUID REFERENCES persons(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Attachments table
CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    task_comment_id UUID REFERENCES task_comments(id) ON DELETE CASCADE,
    file_name VARCHAR(500) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(200),
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT chk_attachments_parent CHECK (
        (task_id IS NOT NULL)::int +
        (project_id IS NOT NULL)::int +
        (task_comment_id IS NOT NULL)::int = 1
    )
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- =============================================================================
-- Step 4: Create indexes
-- =============================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active) WHERE deleted_at IS NULL;

-- Organizations indexes
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_corporate_number ON organizations(corporate_number) WHERE deleted_at IS NULL AND corporate_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON organizations(is_active) WHERE deleted_at IS NULL;

-- Persons indexes
CREATE INDEX IF NOT EXISTS idx_persons_organization_id ON persons(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_persons_email ON persons(email) WHERE deleted_at IS NULL AND email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_persons_name ON persons(last_name, first_name) WHERE deleted_at IS NULL;

-- Templates indexes
CREATE INDEX IF NOT EXISTS idx_templates_project_type ON templates(project_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_templates_is_default ON templates(is_default) WHERE deleted_at IS NULL AND is_default = true;

-- Template phases indexes
CREATE INDEX IF NOT EXISTS idx_template_phases_template_id ON template_phases(template_id);

-- Template tasks indexes
CREATE INDEX IF NOT EXISTS idx_template_tasks_template_phase_id ON template_tasks(template_phase_id);

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_project_type ON projects(project_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_owner_user_id ON projects(owner_user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_code ON projects(code) WHERE deleted_at IS NULL AND code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_start_date ON projects(start_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_end_date ON projects(end_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_health_score ON projects(health_score) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_tags ON projects USING GIN(tags) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_custom_fields ON projects USING GIN(custom_fields) WHERE deleted_at IS NULL;

-- Project phases indexes
CREATE INDEX IF NOT EXISTS idx_project_phases_project_id ON project_phases(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_project_phases_status ON project_phases(status) WHERE deleted_at IS NULL;

-- Project stakeholders indexes
CREATE INDEX IF NOT EXISTS idx_project_stakeholders_project_id ON project_stakeholders(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_project_stakeholders_organization_id ON project_stakeholders(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_project_stakeholders_tier ON project_stakeholders(tier) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_project_stakeholders_parent ON project_stakeholders(parent_stakeholder_id) WHERE deleted_at IS NULL;

-- Stakeholder contacts indexes
CREATE INDEX IF NOT EXISTS idx_stakeholder_contacts_stakeholder ON stakeholder_contacts(project_stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_stakeholder_contacts_person ON stakeholder_contacts(person_id);

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_project_phase_id ON tasks(project_phase_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_is_milestone ON tasks(is_milestone) WHERE deleted_at IS NULL AND is_milestone = true;

-- Reminder configs indexes
CREATE INDEX IF NOT EXISTS idx_reminder_configs_trigger_type ON reminder_configs(trigger_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reminder_configs_is_active ON reminder_configs(is_active) WHERE deleted_at IS NULL;

-- Task reminders indexes
CREATE INDEX IF NOT EXISTS idx_task_reminders_task_id ON task_reminders(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reminders_next_trigger ON task_reminders(next_trigger_at) WHERE is_enabled = true;

-- Notification logs indexes
CREATE INDEX IF NOT EXISTS idx_notification_logs_task_id ON notification_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_project_id ON notification_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_recipient_user ON notification_logs(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_channel ON notification_logs(channel);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at);

-- Task comments indexes
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON task_comments(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON task_comments(created_at) WHERE deleted_at IS NULL;

-- Attachments indexes
CREATE INDEX IF NOT EXISTS idx_attachments_task_id ON attachments(task_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_attachments_project_id ON attachments(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_attachments_task_comment_id ON attachments(task_comment_id) WHERE deleted_at IS NULL;

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_by ON audit_logs(changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_at ON audit_logs(changed_at);

-- =============================================================================
-- Step 5: Create functions and triggers
-- =============================================================================

-- updated_at auto-update function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables
DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'users', 'organizations', 'persons', 'templates', 'template_phases',
        'template_tasks', 'projects', 'project_phases', 'project_stakeholders',
        'stakeholder_contacts', 'tasks', 'reminder_configs', 'task_reminders',
        'task_comments'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%s_updated_at ON %s;
            CREATE TRIGGER update_%s_updated_at
            BEFORE UPDATE ON %s
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        ', tbl, tbl, tbl, tbl);
    END LOOP;
END$$;

-- =============================================================================
-- Step 6: Create views
-- =============================================================================

-- Active projects view
CREATE OR REPLACE VIEW v_active_projects AS
SELECT
    p.*,
    u.display_name AS owner_name,
    u.email AS owner_email,
    t.name AS template_name,
    (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.deleted_at IS NULL) AS total_tasks,
    (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'completed' AND t.deleted_at IS NULL) AS completed_tasks,
    (SELECT COUNT(*) FROM project_stakeholders ps WHERE ps.project_id = p.id AND ps.deleted_at IS NULL) AS stakeholder_count
FROM projects p
LEFT JOIN users u ON p.owner_user_id = u.id
LEFT JOIN templates t ON p.template_id = t.id
WHERE p.deleted_at IS NULL
  AND p.status NOT IN ('completed', 'cancelled');

-- Overdue tasks view
CREATE OR REPLACE VIEW v_overdue_tasks AS
SELECT
    t.*,
    p.name AS project_name,
    p.code AS project_code,
    u.display_name AS assignee_name,
    u.email AS assignee_email
FROM tasks t
JOIN projects p ON t.project_id = p.id
LEFT JOIN users u ON t.assignee_id = u.id
WHERE t.deleted_at IS NULL
  AND t.status NOT IN ('completed', 'cancelled')
  AND t.due_date < CURRENT_DATE;

-- Stakeholder hierarchy view
CREATE OR REPLACE VIEW v_stakeholder_hierarchy AS
WITH RECURSIVE stakeholder_tree AS (
    SELECT
        ps.id,
        ps.project_id,
        ps.organization_id,
        ps.tier,
        ps.parent_stakeholder_id,
        o.name AS organization_name,
        1 AS depth,
        ARRAY[ps.id] AS path
    FROM project_stakeholders ps
    JOIN organizations o ON ps.organization_id = o.id
    WHERE ps.parent_stakeholder_id IS NULL
      AND ps.deleted_at IS NULL

    UNION ALL

    SELECT
        ps.id,
        ps.project_id,
        ps.organization_id,
        ps.tier,
        ps.parent_stakeholder_id,
        o.name AS organization_name,
        st.depth + 1,
        st.path || ps.id
    FROM project_stakeholders ps
    JOIN organizations o ON ps.organization_id = o.id
    JOIN stakeholder_tree st ON ps.parent_stakeholder_id = st.id
    WHERE ps.deleted_at IS NULL
)
SELECT * FROM stakeholder_tree;

-- =============================================================================
-- Step 7: Add table and column comments
-- =============================================================================

COMMENT ON TABLE users IS '自社ユーザー情報';
COMMENT ON COLUMN users.display_name IS '表示名（姓名結合など）';

COMMENT ON TABLE organizations IS 'パートナー企業・組織情報';
COMMENT ON COLUMN organizations.corporate_number IS '法人番号（国税庁発行の13桁）';

COMMENT ON TABLE persons IS 'パートナー企業の担当者情報';

COMMENT ON TABLE templates IS '案件種別ごとのテンプレート（フェーズ・タスクの雛形）';

COMMENT ON TABLE template_phases IS 'テンプレートのフェーズ定義';

COMMENT ON TABLE template_tasks IS 'テンプレートのタスク定義';
COMMENT ON COLUMN template_tasks.reminder_config IS 'リマインド設定のJSON（期限前通知日数など）';

COMMENT ON TABLE projects IS '案件情報';
COMMENT ON COLUMN projects.health_score IS '案件の健全性スコア（0-100）';
COMMENT ON COLUMN projects.custom_fields IS 'カスタムフィールド（JSON形式）';

COMMENT ON TABLE project_phases IS '案件のフェーズ';

COMMENT ON TABLE project_stakeholders IS '案件に参加する関係者（組織）';
COMMENT ON COLUMN project_stakeholders.tier IS '関係者階層（Tier1=直接取引先）';
COMMENT ON COLUMN project_stakeholders.parent_stakeholder_id IS '親関係者（階層構造用）';

COMMENT ON TABLE stakeholder_contacts IS '案件関係者の担当者（窓口）';

COMMENT ON TABLE tasks IS 'タスク情報';
COMMENT ON COLUMN tasks.priority IS '優先度（1:最高 〜 5:最低）';
COMMENT ON COLUMN tasks.assignee_stakeholder_id IS '外部関係者への割り当て';
COMMENT ON COLUMN tasks.reminder_config IS 'リマインド設定JSON';

COMMENT ON TABLE reminder_configs IS 'リマインド設定のマスター';
COMMENT ON COLUMN reminder_configs.trigger_value IS 'トリガー値（before_due/after_dueの場合は日数）';

COMMENT ON TABLE task_reminders IS 'タスクに適用されたリマインド設定';

COMMENT ON TABLE notification_logs IS '通知送信履歴';

COMMENT ON TABLE task_comments IS 'タスクに対するコメント';
COMMENT ON COLUMN task_comments.is_internal IS '社内向けコメント（パートナーには非公開）';

COMMENT ON TABLE attachments IS '添付ファイル情報';

COMMENT ON TABLE audit_logs IS '変更履歴（監査ログ）';

COMMENT ON VIEW v_active_projects IS 'アクティブな案件の一覧（完了・キャンセル以外）';
COMMENT ON VIEW v_overdue_tasks IS '期限切れタスクの一覧';
COMMENT ON VIEW v_stakeholder_hierarchy IS '関係者の階層構造（再帰CTE）';

-- =============================================================================
-- Migration complete
-- =============================================================================

COMMIT;
