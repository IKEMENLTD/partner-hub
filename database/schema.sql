-- =============================================================================
-- パートナー協業プラットフォーム データベーススキーマ
-- PostgreSQL 14+
-- =============================================================================

-- 拡張機能の有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ENUM型定義
-- =============================================================================

-- 案件種別
CREATE TYPE project_type AS ENUM (
    'joint_development',      -- 共同開発
    'sales_partnership',      -- 販売提携
    'technology_license',     -- 技術ライセンス
    'reseller_agreement',     -- 再販契約
    'consulting',             -- コンサルティング
    'other'                   -- その他
);

-- 会社の役割
CREATE TYPE company_role AS ENUM (
    'prime',                  -- 主契約者（プライム）
    'subcontractor',          -- 下請け
    'partner',                -- パートナー（対等）
    'client'                  -- クライアント
);

-- 案件ステータス
CREATE TYPE project_status AS ENUM (
    'draft',                  -- 下書き
    'planning',               -- 計画中
    'in_progress',            -- 進行中
    'on_hold',                -- 保留
    'completed',              -- 完了
    'cancelled'               -- キャンセル
);

-- タスクステータス
CREATE TYPE task_status AS ENUM (
    'not_started',            -- 未着手
    'in_progress',            -- 進行中
    'waiting',                -- 待機中
    'completed',              -- 完了
    'cancelled'               -- キャンセル
);

-- 関係者階層（Tier）
CREATE TYPE stakeholder_tier AS ENUM (
    'tier1',                  -- 1次（直接取引先）
    'tier2',                  -- 2次
    'tier3',                  -- 3次
    'tier4'                   -- 4次以降
);

-- 組織種別
CREATE TYPE organization_type AS ENUM (
    'corporation',            -- 法人
    'individual_business',    -- 個人事業主
    'government',             -- 官公庁
    'nonprofit',              -- 非営利団体
    'other'                   -- その他
);

-- 通知チャネル
CREATE TYPE notification_channel AS ENUM (
    'email',                  -- メール
    'slack',                  -- Slack
    'teams',                  -- Microsoft Teams
    'webhook',                -- Webhook
    'in_app'                  -- アプリ内通知
);

-- 通知ステータス
CREATE TYPE notification_status AS ENUM (
    'pending',                -- 送信待ち
    'sent',                   -- 送信済み
    'delivered',              -- 配信済み
    'failed',                 -- 失敗
    'cancelled'               -- キャンセル
);

-- リマインドトリガー種別
CREATE TYPE reminder_trigger_type AS ENUM (
    'before_due',             -- 期限前
    'after_due',              -- 期限後
    'on_status_change',       -- ステータス変更時
    'periodic'                -- 定期的
);

-- =============================================================================
-- テーブル定義
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ユーザー（自社ユーザー）
-- -----------------------------------------------------------------------------
CREATE TABLE users (
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

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_is_active ON users(is_active) WHERE deleted_at IS NULL;

COMMENT ON TABLE users IS '自社ユーザー情報';
COMMENT ON COLUMN users.display_name IS '表示名（姓名結合など）';

-- -----------------------------------------------------------------------------
-- 組織（パートナー企業）
-- -----------------------------------------------------------------------------
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(500) NOT NULL,
    name_kana VARCHAR(500),
    short_name VARCHAR(200),
    organization_type organization_type NOT NULL DEFAULT 'corporation',
    corporate_number VARCHAR(13),          -- 法人番号（13桁）
    postal_code VARCHAR(10),
    address TEXT,
    phone VARCHAR(50),
    fax VARCHAR(50),
    website_url TEXT,
    industry VARCHAR(200),
    employee_count INTEGER,
    annual_revenue BIGINT,                 -- 年間売上（円）
    fiscal_year_end INTEGER,               -- 決算月（1-12）
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_organizations_name ON organizations(name) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizations_corporate_number ON organizations(corporate_number) WHERE deleted_at IS NULL AND corporate_number IS NOT NULL;
CREATE INDEX idx_organizations_is_active ON organizations(is_active) WHERE deleted_at IS NULL;

COMMENT ON TABLE organizations IS 'パートナー企業・組織情報';
COMMENT ON COLUMN organizations.corporate_number IS '法人番号（国税庁発行の13桁）';

-- -----------------------------------------------------------------------------
-- 個人（パートナー担当者）
-- -----------------------------------------------------------------------------
CREATE TABLE persons (
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

CREATE INDEX idx_persons_organization_id ON persons(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_persons_email ON persons(email) WHERE deleted_at IS NULL AND email IS NOT NULL;
CREATE INDEX idx_persons_name ON persons(last_name, first_name) WHERE deleted_at IS NULL;

COMMENT ON TABLE persons IS 'パートナー企業の担当者情報';

-- -----------------------------------------------------------------------------
-- テンプレート（案件種別ごとのフェーズ・タスク雛形）
-- -----------------------------------------------------------------------------
CREATE TABLE templates (
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

CREATE INDEX idx_templates_project_type ON templates(project_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_templates_is_default ON templates(is_default) WHERE deleted_at IS NULL AND is_default = true;

COMMENT ON TABLE templates IS '案件種別ごとのテンプレート（フェーズ・タスクの雛形）';

-- -----------------------------------------------------------------------------
-- テンプレートフェーズ
-- -----------------------------------------------------------------------------
CREATE TABLE template_phases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    default_duration_days INTEGER,         -- 標準所要日数
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_template_phases_template_id ON template_phases(template_id);

COMMENT ON TABLE template_phases IS 'テンプレートのフェーズ定義';

-- -----------------------------------------------------------------------------
-- テンプレートタスク
-- -----------------------------------------------------------------------------
CREATE TABLE template_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_phase_id UUID NOT NULL REFERENCES template_phases(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    default_duration_days INTEGER,         -- 標準所要日数
    is_milestone BOOLEAN NOT NULL DEFAULT false,
    reminder_config JSONB,                 -- リマインド設定（JSON）
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_template_tasks_template_phase_id ON template_tasks(template_phase_id);

COMMENT ON TABLE template_tasks IS 'テンプレートのタスク定義';
COMMENT ON COLUMN template_tasks.reminder_config IS 'リマインド設定のJSON（期限前通知日数など）';

-- -----------------------------------------------------------------------------
-- 案件（Project）
-- -----------------------------------------------------------------------------
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(500) NOT NULL,
    code VARCHAR(100),                     -- 案件コード（社内管理用）
    description TEXT,
    project_type project_type NOT NULL,
    company_role company_role NOT NULL,
    status project_status NOT NULL DEFAULT 'draft',
    health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),
    start_date DATE,
    end_date DATE,
    actual_end_date DATE,
    budget BIGINT,                         -- 予算（円）
    actual_cost BIGINT,                    -- 実績コスト（円）
    template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
    owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    custom_fields JSONB DEFAULT '{}',      -- カスタムフィールド
    tags VARCHAR(100)[],                   -- タグ配列
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT chk_projects_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_projects_status ON projects(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_project_type ON projects(project_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_owner_user_id ON projects(owner_user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_code ON projects(code) WHERE deleted_at IS NULL AND code IS NOT NULL;
CREATE INDEX idx_projects_start_date ON projects(start_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_end_date ON projects(end_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_health_score ON projects(health_score) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_tags ON projects USING GIN(tags) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_custom_fields ON projects USING GIN(custom_fields) WHERE deleted_at IS NULL;

COMMENT ON TABLE projects IS '案件情報';
COMMENT ON COLUMN projects.health_score IS '案件の健全性スコア（0-100）';
COMMENT ON COLUMN projects.custom_fields IS 'カスタムフィールド（JSON形式）';

-- -----------------------------------------------------------------------------
-- 案件フェーズ
-- -----------------------------------------------------------------------------
CREATE TABLE project_phases (
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

CREATE INDEX idx_project_phases_project_id ON project_phases(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_project_phases_status ON project_phases(status) WHERE deleted_at IS NULL;

COMMENT ON TABLE project_phases IS '案件のフェーズ';

-- -----------------------------------------------------------------------------
-- 案件関係者（ProjectStakeholder）
-- -----------------------------------------------------------------------------
CREATE TABLE project_stakeholders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    tier stakeholder_tier NOT NULL DEFAULT 'tier1',
    parent_stakeholder_id UUID REFERENCES project_stakeholders(id) ON DELETE SET NULL,
    role_description VARCHAR(500),          -- この案件での役割説明
    contract_amount BIGINT,                 -- 契約金額（円）
    is_primary BOOLEAN NOT NULL DEFAULT false, -- 主要関係者フラグ
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT uq_project_stakeholders UNIQUE (project_id, organization_id)
);

CREATE INDEX idx_project_stakeholders_project_id ON project_stakeholders(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_project_stakeholders_organization_id ON project_stakeholders(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_project_stakeholders_tier ON project_stakeholders(tier) WHERE deleted_at IS NULL;
CREATE INDEX idx_project_stakeholders_parent ON project_stakeholders(parent_stakeholder_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE project_stakeholders IS '案件に参加する関係者（組織）';
COMMENT ON COLUMN project_stakeholders.tier IS '関係者階層（Tier1=直接取引先）';
COMMENT ON COLUMN project_stakeholders.parent_stakeholder_id IS '親関係者（階層構造用）';

-- -----------------------------------------------------------------------------
-- 関係者担当者（Stakeholder - Person 中間テーブル）
-- -----------------------------------------------------------------------------
CREATE TABLE stakeholder_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_stakeholder_id UUID NOT NULL REFERENCES project_stakeholders(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT false, -- 主担当者フラグ
    role VARCHAR(200),                      -- 担当役割
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_stakeholder_contacts UNIQUE (project_stakeholder_id, person_id)
);

CREATE INDEX idx_stakeholder_contacts_stakeholder ON stakeholder_contacts(project_stakeholder_id);
CREATE INDEX idx_stakeholder_contacts_person ON stakeholder_contacts(person_id);

COMMENT ON TABLE stakeholder_contacts IS '案件関係者の担当者（窓口）';

-- -----------------------------------------------------------------------------
-- タスク（Task）
-- -----------------------------------------------------------------------------
CREATE TABLE tasks (
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
    reminder_config JSONB,                  -- リマインド設定
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_tasks_project_id ON tasks(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_project_phase_id ON tasks(project_phase_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_parent_task_id ON tasks(parent_task_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_status ON tasks(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_priority ON tasks(priority) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_is_milestone ON tasks(is_milestone) WHERE deleted_at IS NULL AND is_milestone = true;

COMMENT ON TABLE tasks IS 'タスク情報';
COMMENT ON COLUMN tasks.priority IS '優先度（1:最高 〜 5:最低）';
COMMENT ON COLUMN tasks.assignee_stakeholder_id IS '外部関係者への割り当て';
COMMENT ON COLUMN tasks.reminder_config IS 'リマインド設定JSON';

-- -----------------------------------------------------------------------------
-- リマインド設定（ReminderConfig）
-- -----------------------------------------------------------------------------
CREATE TABLE reminder_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(500) NOT NULL,
    description TEXT,
    trigger_type reminder_trigger_type NOT NULL,
    trigger_value INTEGER,                  -- トリガー値（日数など）
    channels notification_channel[] NOT NULL DEFAULT '{email}',
    message_template TEXT,                  -- メッセージテンプレート
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_reminder_configs_trigger_type ON reminder_configs(trigger_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_reminder_configs_is_active ON reminder_configs(is_active) WHERE deleted_at IS NULL;

COMMENT ON TABLE reminder_configs IS 'リマインド設定のマスター';
COMMENT ON COLUMN reminder_configs.trigger_value IS 'トリガー値（before_due/after_dueの場合は日数）';

-- -----------------------------------------------------------------------------
-- タスクリマインド設定（中間テーブル）
-- -----------------------------------------------------------------------------
CREATE TABLE task_reminders (
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

CREATE INDEX idx_task_reminders_task_id ON task_reminders(task_id);
CREATE INDEX idx_task_reminders_next_trigger ON task_reminders(next_trigger_at) WHERE is_enabled = true;

COMMENT ON TABLE task_reminders IS 'タスクに適用されたリマインド設定';

-- -----------------------------------------------------------------------------
-- 通知ログ（NotificationLog）
-- -----------------------------------------------------------------------------
CREATE TABLE notification_logs (
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
    metadata JSONB DEFAULT '{}',            -- 追加メタデータ
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notification_logs_task_id ON notification_logs(task_id);
CREATE INDEX idx_notification_logs_project_id ON notification_logs(project_id);
CREATE INDEX idx_notification_logs_recipient_user ON notification_logs(recipient_user_id);
CREATE INDEX idx_notification_logs_status ON notification_logs(status);
CREATE INDEX idx_notification_logs_channel ON notification_logs(channel);
CREATE INDEX idx_notification_logs_created_at ON notification_logs(created_at);

COMMENT ON TABLE notification_logs IS '通知送信履歴';

-- -----------------------------------------------------------------------------
-- タスクコメント
-- -----------------------------------------------------------------------------
CREATE TABLE task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    person_id UUID REFERENCES persons(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT false, -- 社内向けフラグ
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_task_comments_task_id ON task_comments(task_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_task_comments_user_id ON task_comments(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_task_comments_created_at ON task_comments(created_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE task_comments IS 'タスクに対するコメント';
COMMENT ON COLUMN task_comments.is_internal IS '社内向けコメント（パートナーには非公開）';

-- -----------------------------------------------------------------------------
-- 添付ファイル
-- -----------------------------------------------------------------------------
CREATE TABLE attachments (
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

CREATE INDEX idx_attachments_task_id ON attachments(task_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_attachments_project_id ON attachments(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_attachments_task_comment_id ON attachments(task_comment_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE attachments IS '添付ファイル情報';

-- -----------------------------------------------------------------------------
-- 監査ログ
-- -----------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL,            -- INSERT, UPDATE, DELETE
    old_values JSONB,
    new_values JSONB,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_changed_by ON audit_logs(changed_by);
CREATE INDEX idx_audit_logs_changed_at ON audit_logs(changed_at);

COMMENT ON TABLE audit_logs IS '変更履歴（監査ログ）';

-- =============================================================================
-- 関数・トリガー定義
-- =============================================================================

-- updated_at 自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 各テーブルにupdated_atトリガーを設定
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_persons_updated_at BEFORE UPDATE ON persons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_phases_updated_at BEFORE UPDATE ON template_phases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_tasks_updated_at BEFORE UPDATE ON template_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_phases_updated_at BEFORE UPDATE ON project_phases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_stakeholders_updated_at BEFORE UPDATE ON project_stakeholders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stakeholder_contacts_updated_at BEFORE UPDATE ON stakeholder_contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminder_configs_updated_at BEFORE UPDATE ON reminder_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_reminders_updated_at BEFORE UPDATE ON task_reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_comments_updated_at BEFORE UPDATE ON task_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ビュー定義
-- =============================================================================

-- アクティブな案件一覧ビュー
CREATE VIEW v_active_projects AS
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

COMMENT ON VIEW v_active_projects IS 'アクティブな案件の一覧（完了・キャンセル以外）';

-- 期限切れタスクビュー
CREATE VIEW v_overdue_tasks AS
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

COMMENT ON VIEW v_overdue_tasks IS '期限切れタスクの一覧';

-- 関係者階層ビュー
CREATE VIEW v_stakeholder_hierarchy AS
WITH RECURSIVE stakeholder_tree AS (
    -- 基点：Tier1の関係者
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

    -- 再帰：子関係者
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

COMMENT ON VIEW v_stakeholder_hierarchy IS '関係者の階層構造（再帰CTE）';
