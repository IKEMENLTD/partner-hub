-- =============================================================================
-- ADDITIONAL TABLES MIGRATION
-- Description: 追加エンティティのマイグレーション
--
-- 対象テーブル:
--   - progress_reports (進捗報告)
--   - partner_evaluations (パートナー評価)
--   - project_files (プロジェクトファイル)
--   - escalation_rules (エスカレーションルール)
--   - escalation_logs (エスカレーションログ)
--   - notification_channels (通知チャンネル)
--   - notification_logs_v2 (通知ログ - 新構造)
--
-- 注意:
--   このスクリプトは何度実行しても安全です（冪等性保証）
--   既存のCOMPLETE_MIGRATION.sqlの後に実行してください
-- =============================================================================

-- =============================================================================
-- 1. ENUM型定義
-- =============================================================================

-- progress_report_status
DO $$ BEGIN
    CREATE TYPE public.progress_report_status AS ENUM (
        'pending',
        'reviewed',
        'rejected'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- file_category
DO $$ BEGIN
    CREATE TYPE public.file_category AS ENUM (
        'document',
        'image',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- escalation_action
DO $$ BEGIN
    CREATE TYPE public.escalation_action AS ENUM (
        'notify_owner',
        'notify_stakeholders',
        'escalate_to_manager'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- escalation_trigger_type
DO $$ BEGIN
    CREATE TYPE public.escalation_trigger_type AS ENUM (
        'days_before_due',
        'days_after_due',
        'progress_below'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- escalation_rule_status
DO $$ BEGIN
    CREATE TYPE public.escalation_rule_status AS ENUM (
        'active',
        'inactive'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- escalation_log_status
DO $$ BEGIN
    CREATE TYPE public.escalation_log_status AS ENUM (
        'pending',
        'executed',
        'failed'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- notification_channel_type
DO $$ BEGIN
    CREATE TYPE public.notification_channel_type AS ENUM (
        'email',
        'slack',
        'in_app',
        'webhook'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- notification_status
DO $$ BEGIN
    CREATE TYPE public.notification_status AS ENUM (
        'pending',
        'sent',
        'failed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- notification_type
DO $$ BEGIN
    CREATE TYPE public.notification_type AS ENUM (
        'reminder',
        'escalation',
        'task_update',
        'project_update',
        'system'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- 2. テーブル作成
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 2.1 progress_reports テーブル (進捗報告)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.progress_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    reporter_name VARCHAR(255) NOT NULL,
    reporter_email VARCHAR(255) NOT NULL,
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    status public.progress_report_status NOT NULL DEFAULT 'pending',
    comment TEXT,
    attachment_urls JSONB,
    report_token VARCHAR(255) NOT NULL UNIQUE,
    token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_submitted BOOLEAN NOT NULL DEFAULT false,
    reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewer_comment TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_progress_reports_task_id ON public.progress_reports(task_id);
CREATE INDEX IF NOT EXISTS idx_progress_reports_status ON public.progress_reports(status);
CREATE INDEX IF NOT EXISTS idx_progress_reports_report_token ON public.progress_reports(report_token);
CREATE INDEX IF NOT EXISTS idx_progress_reports_reviewer_id ON public.progress_reports(reviewer_id) WHERE reviewer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_progress_reports_is_submitted ON public.progress_reports(is_submitted);
CREATE INDEX IF NOT EXISTS idx_progress_reports_token_expires_at ON public.progress_reports(token_expires_at);

-- RLS無効化
ALTER TABLE public.progress_reports DISABLE ROW LEVEL SECURITY;

-- トリガー
DROP TRIGGER IF EXISTS update_progress_reports_updated_at ON public.progress_reports;
CREATE TRIGGER update_progress_reports_updated_at
    BEFORE UPDATE ON public.progress_reports
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.progress_reports IS '進捗報告情報';
COMMENT ON COLUMN public.progress_reports.report_token IS '外部報告用のユニークトークン';
COMMENT ON COLUMN public.progress_reports.attachment_urls IS '添付ファイルURLの配列（JSONB）';

-- -----------------------------------------------------------------------------
-- 2.2 partner_evaluations テーブル (パートナー評価)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
    evaluator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    communication INTEGER NOT NULL DEFAULT 0 CHECK (communication >= 0 AND communication <= 5),
    deliverable_quality INTEGER NOT NULL DEFAULT 0 CHECK (deliverable_quality >= 0 AND deliverable_quality <= 5),
    response_speed INTEGER NOT NULL DEFAULT 0 CHECK (response_speed >= 0 AND response_speed <= 5),
    reliability INTEGER NOT NULL DEFAULT 0 CHECK (reliability >= 0 AND reliability <= 5),
    comment TEXT,
    evaluation_period_start DATE,
    evaluation_period_end DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_partner_evaluations_partner_id ON public.partner_evaluations(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_evaluations_evaluator_id ON public.partner_evaluations(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_partner_evaluations_created_at ON public.partner_evaluations(created_at);

-- RLS無効化
ALTER TABLE public.partner_evaluations DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.partner_evaluations IS 'パートナー評価情報';
COMMENT ON COLUMN public.partner_evaluations.communication IS 'コミュニケーション評価（1-5）';
COMMENT ON COLUMN public.partner_evaluations.deliverable_quality IS '成果物品質評価（1-5）';
COMMENT ON COLUMN public.partner_evaluations.response_speed IS '対応速度評価（1-5）';
COMMENT ON COLUMN public.partner_evaluations.reliability IS '信頼性評価（1-5）';

-- -----------------------------------------------------------------------------
-- 2.3 project_files テーブル (プロジェクトファイル)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    uploader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    file_name VARCHAR(500) NOT NULL,
    original_name VARCHAR(500) NOT NULL,
    mime_type VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    storage_path VARCHAR(1000) NOT NULL,
    public_url VARCHAR(2000),
    category public.file_category NOT NULL DEFAULT 'other',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON public.project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_task_id ON public.project_files(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_project_files_uploader_id ON public.project_files(uploader_id);
CREATE INDEX IF NOT EXISTS idx_project_files_category ON public.project_files(category);
CREATE INDEX IF NOT EXISTS idx_project_files_created_at ON public.project_files(created_at);

-- RLS無効化
ALTER TABLE public.project_files DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.project_files IS 'プロジェクト関連ファイル';
COMMENT ON COLUMN public.project_files.storage_path IS 'ストレージ内のファイルパス';
COMMENT ON COLUMN public.project_files.public_url IS '公開URL（該当する場合）';

-- -----------------------------------------------------------------------------
-- 2.4 escalation_rules テーブル (エスカレーションルール)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.escalation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    trigger_type public.escalation_trigger_type NOT NULL DEFAULT 'days_after_due',
    trigger_value INTEGER NOT NULL DEFAULT 1,
    action public.escalation_action NOT NULL DEFAULT 'notify_owner',
    status public.escalation_rule_status NOT NULL DEFAULT 'active',
    priority INTEGER NOT NULL DEFAULT 1,
    notify_emails TEXT,
    escalate_to_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    metadata JSONB,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_escalation_rules_project_id ON public.escalation_rules(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_escalation_rules_status ON public.escalation_rules(status);
CREATE INDEX IF NOT EXISTS idx_escalation_rules_trigger_type ON public.escalation_rules(trigger_type);
CREATE INDEX IF NOT EXISTS idx_escalation_rules_created_by ON public.escalation_rules(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_escalation_rules_escalate_to_user_id ON public.escalation_rules(escalate_to_user_id) WHERE escalate_to_user_id IS NOT NULL;

-- RLS無効化
ALTER TABLE public.escalation_rules DISABLE ROW LEVEL SECURITY;

-- トリガー
DROP TRIGGER IF EXISTS update_escalation_rules_updated_at ON public.escalation_rules;
CREATE TRIGGER update_escalation_rules_updated_at
    BEFORE UPDATE ON public.escalation_rules
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.escalation_rules IS 'エスカレーションルール定義';
COMMENT ON COLUMN public.escalation_rules.trigger_type IS 'トリガー種別（期限前日数、期限後日数、進捗率下回り）';
COMMENT ON COLUMN public.escalation_rules.trigger_value IS 'トリガー値（日数または進捗率）';
COMMENT ON COLUMN public.escalation_rules.notify_emails IS '通知先メールアドレス（カンマ区切り）';

-- -----------------------------------------------------------------------------
-- 2.5 escalation_logs テーブル (エスカレーションログ)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.escalation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES public.escalation_rules(id) ON DELETE SET NULL,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    action public.escalation_action NOT NULL,
    status public.escalation_log_status NOT NULL DEFAULT 'pending',
    action_detail TEXT,
    notified_users TEXT,
    escalated_to_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    error_message TEXT,
    executed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_escalation_logs_rule_id ON public.escalation_logs(rule_id) WHERE rule_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_escalation_logs_task_id ON public.escalation_logs(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_escalation_logs_project_id ON public.escalation_logs(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_escalation_logs_status ON public.escalation_logs(status);
CREATE INDEX IF NOT EXISTS idx_escalation_logs_action ON public.escalation_logs(action);
CREATE INDEX IF NOT EXISTS idx_escalation_logs_created_at ON public.escalation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_escalation_logs_escalated_to_user_id ON public.escalation_logs(escalated_to_user_id) WHERE escalated_to_user_id IS NOT NULL;

-- RLS無効化
ALTER TABLE public.escalation_logs DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.escalation_logs IS 'エスカレーション実行ログ';
COMMENT ON COLUMN public.escalation_logs.notified_users IS '通知されたユーザーID（カンマ区切り）';

-- -----------------------------------------------------------------------------
-- 2.6 notification_channels テーブル (通知チャンネル)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type public.notification_channel_type NOT NULL DEFAULT 'in_app',
    is_active BOOLEAN NOT NULL DEFAULT true,
    channel_id VARCHAR(500),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    config JSONB,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_notification_channels_type ON public.notification_channels(type);
CREATE INDEX IF NOT EXISTS idx_notification_channels_is_active ON public.notification_channels(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_notification_channels_project_id ON public.notification_channels(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notification_channels_user_id ON public.notification_channels(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notification_channels_created_by ON public.notification_channels(created_by) WHERE created_by IS NOT NULL;

-- RLS無効化
ALTER TABLE public.notification_channels DISABLE ROW LEVEL SECURITY;

-- トリガー
DROP TRIGGER IF EXISTS update_notification_channels_updated_at ON public.notification_channels;
CREATE TRIGGER update_notification_channels_updated_at
    BEFORE UPDATE ON public.notification_channels
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.notification_channels IS '通知チャンネル設定';
COMMENT ON COLUMN public.notification_channels.channel_id IS 'SlackチャンネルID、メールアドレス、WebhookURL等';
COMMENT ON COLUMN public.notification_channels.config IS '追加設定（Slackワークスペース情報等）';

-- -----------------------------------------------------------------------------
-- 2.7 notification_logs_v2 テーブル (通知ログ - 新構造)
-- 注: 既存のnotification_logsテーブルとは異なる構造のため、別名で作成
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_logs_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type public.notification_type NOT NULL DEFAULT 'system',
    channel_type public.notification_channel_type NOT NULL,
    status public.notification_status NOT NULL DEFAULT 'pending',
    recipient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    channel_id UUID REFERENCES public.notification_channels(id) ON DELETE SET NULL,
    subject VARCHAR(500) NOT NULL,
    message TEXT,
    payload JSONB,
    external_id VARCHAR(500),
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    sent_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_notification_logs_v2_type ON public.notification_logs_v2(type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_v2_channel_type ON public.notification_logs_v2(channel_type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_v2_status ON public.notification_logs_v2(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_v2_recipient_id ON public.notification_logs_v2(recipient_id) WHERE recipient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notification_logs_v2_channel_id ON public.notification_logs_v2(channel_id) WHERE channel_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notification_logs_v2_created_at ON public.notification_logs_v2(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_v2_sent_at ON public.notification_logs_v2(sent_at) WHERE sent_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notification_logs_v2_pending ON public.notification_logs_v2(created_at) WHERE status = 'pending';

-- RLS無効化
ALTER TABLE public.notification_logs_v2 DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.notification_logs_v2 IS '通知送信ログ（新構造）';
COMMENT ON COLUMN public.notification_logs_v2.payload IS 'メッセージペイロード（Slackブロック、HTML等）';
COMMENT ON COLUMN public.notification_logs_v2.external_id IS '外部サービスのID（Slackメッセージts等）';

-- =============================================================================
-- 3. ビュー
-- =============================================================================

-- パートナー評価サマリービュー
CREATE OR REPLACE VIEW public.v_partner_evaluation_summary AS
SELECT
    p.id AS partner_id,
    p.name AS partner_name,
    p.company_name,
    COUNT(pe.id) AS evaluation_count,
    ROUND(AVG(pe.communication)::numeric, 2) AS avg_communication,
    ROUND(AVG(pe.deliverable_quality)::numeric, 2) AS avg_deliverable_quality,
    ROUND(AVG(pe.response_speed)::numeric, 2) AS avg_response_speed,
    ROUND(AVG(pe.reliability)::numeric, 2) AS avg_reliability,
    ROUND(
        (AVG(pe.communication) + AVG(pe.deliverable_quality) +
         AVG(pe.response_speed) + AVG(pe.reliability))::numeric / 4,
        2
    ) AS overall_avg_score
FROM public.partners p
LEFT JOIN public.partner_evaluations pe ON p.id = pe.partner_id
GROUP BY p.id, p.name, p.company_name;

COMMENT ON VIEW public.v_partner_evaluation_summary IS 'パートナー評価サマリー';

-- 未処理エスカレーションビュー
CREATE OR REPLACE VIEW public.v_pending_escalations AS
SELECT
    el.*,
    er.name AS rule_name,
    er.trigger_type,
    er.trigger_value,
    t.title AS task_title,
    t.due_date AS task_due_date,
    p.name AS project_name,
    pr.first_name || ' ' || pr.last_name AS escalated_to_name
FROM public.escalation_logs el
LEFT JOIN public.escalation_rules er ON el.rule_id = er.id
LEFT JOIN public.tasks t ON el.task_id = t.id
LEFT JOIN public.projects p ON el.project_id = p.id
LEFT JOIN public.profiles pr ON el.escalated_to_user_id = pr.id
WHERE el.status = 'pending';

COMMENT ON VIEW public.v_pending_escalations IS '未処理エスカレーション一覧';

-- =============================================================================
-- マイグレーション完了
-- =============================================================================
