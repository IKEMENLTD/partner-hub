-- =============================================================================
-- COMPLETE MIGRATION SCRIPT
-- Description: 統合マイグレーションスクリプト（冪等性保証）
--
-- 使用方法:
--   service_role キーを使用してSupabaseに対して実行してください。
--   RLSは無効化されているため、service_roleキーが必要です。
--
-- 注意:
--   このスクリプトは何度実行しても安全です（冪等性保証）
-- =============================================================================

-- =============================================================================
-- 1. 拡張機能
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 2. ENUM型定義（IF NOT EXISTS パターン）
-- =============================================================================

-- user_role
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('admin', 'manager', 'member', 'partner');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- partner_type
DO $$ BEGIN
    CREATE TYPE public.partner_type AS ENUM (
        'company',
        'individual'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- partner_status
DO $$ BEGIN
    CREATE TYPE public.partner_status AS ENUM (
        'pending',
        'active',
        'inactive',
        'suspended'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- project_type
DO $$ BEGIN
    CREATE TYPE public.project_type AS ENUM (
        'joint_development',
        'sales_partnership',
        'technology_license',
        'reseller_agreement',
        'consulting',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- company_role
DO $$ BEGIN
    CREATE TYPE public.company_role AS ENUM (
        'prime',
        'subcontractor',
        'partner',
        'client'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- project_status
DO $$ BEGIN
    CREATE TYPE public.project_status AS ENUM (
        'draft',
        'planning',
        'in_progress',
        'on_hold',
        'completed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- project_priority
DO $$ BEGIN
    CREATE TYPE public.project_priority AS ENUM (
        'low',
        'medium',
        'high',
        'critical'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- stakeholder_tier
DO $$ BEGIN
    CREATE TYPE public.stakeholder_tier AS ENUM (
        'tier1',
        'tier2',
        'tier3',
        'tier4'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- task_status
DO $$ BEGIN
    CREATE TYPE public.task_status AS ENUM (
        'todo',
        'in_progress',
        'waiting',
        'review',
        'completed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- task_priority
DO $$ BEGIN
    CREATE TYPE public.task_priority AS ENUM (
        'low',
        'medium',
        'high',
        'critical'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- task_type
DO $$ BEGIN
    CREATE TYPE public.task_type AS ENUM (
        'task',
        'feature',
        'bug',
        'improvement',
        'documentation',
        'research',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- reminder_type
DO $$ BEGIN
    CREATE TYPE public.reminder_type AS ENUM (
        'due_date',
        'follow_up',
        'status_change',
        'custom'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- reminder_status
DO $$ BEGIN
    CREATE TYPE public.reminder_status AS ENUM (
        'pending',
        'sent',
        'delivered',
        'failed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- reminder_channel
DO $$ BEGIN
    CREATE TYPE public.reminder_channel AS ENUM (
        'email',
        'in_app',
        'slack',
        'teams',
        'webhook'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- 3. ヘルパー関数（テーブル作成前に必要）
-- =============================================================================

-- updated_at 自動更新関数
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- updated_at 自動更新関数（別名）
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- =============================================================================
-- 4. テーブル作成
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 4.1 profiles テーブル
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT DEFAULT '',
    last_name TEXT DEFAULT '',
    role public.user_role DEFAULT 'member',
    is_active BOOLEAN DEFAULT true,
    avatar_url TEXT,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

-- RLS無効化（service_roleキーを使用するため）
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- トリガー
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- -----------------------------------------------------------------------------
-- 4.2 partners テーブル
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(500) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    company_name VARCHAR(500),
    type public.partner_type NOT NULL DEFAULT 'individual',
    status public.partner_status NOT NULL DEFAULT 'pending',
    description TEXT,
    skills TEXT[],
    address TEXT,
    country VARCHAR(100) DEFAULT 'Japan',
    timezone VARCHAR(50) DEFAULT 'Asia/Tokyo',
    rating DECIMAL(3, 2) DEFAULT 0,
    total_projects INTEGER DEFAULT 0,
    completed_projects INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_partners_email ON public.partners(email);
CREATE INDEX IF NOT EXISTS idx_partners_type ON public.partners(type);
CREATE INDEX IF NOT EXISTS idx_partners_status ON public.partners(status);
CREATE INDEX IF NOT EXISTS idx_partners_company_name ON public.partners(company_name) WHERE company_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_partners_user_id ON public.partners(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_partners_skills ON public.partners USING GIN(skills);

-- RLS無効化
ALTER TABLE public.partners DISABLE ROW LEVEL SECURITY;

-- トリガー
DROP TRIGGER IF EXISTS update_partners_updated_at ON public.partners;
CREATE TRIGGER update_partners_updated_at
    BEFORE UPDATE ON public.partners
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 4.3 project_templates テーブル
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(500) NOT NULL,
    description TEXT,
    project_type public.project_type,
    phases JSONB DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_project_templates_project_type ON public.project_templates(project_type);
CREATE INDEX IF NOT EXISTS idx_project_templates_is_active ON public.project_templates(is_active) WHERE is_active = true;

-- RLS無効化
ALTER TABLE public.project_templates DISABLE ROW LEVEL SECURITY;

-- トリガー
DROP TRIGGER IF EXISTS update_project_templates_updated_at ON public.project_templates;
CREATE TRIGGER update_project_templates_updated_at
    BEFORE UPDATE ON public.project_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 4.4 projects テーブル
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(500) NOT NULL,
    description TEXT,
    project_type public.project_type NOT NULL DEFAULT 'other',
    company_role public.company_role,
    status public.project_status NOT NULL DEFAULT 'draft',
    priority public.project_priority NOT NULL DEFAULT 'medium',
    start_date DATE,
    end_date DATE,
    actual_end_date DATE,
    budget DECIMAL(15, 2),
    actual_cost DECIMAL(15, 2) DEFAULT 0,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    health_score INTEGER DEFAULT 100 CHECK (health_score >= 0 AND health_score <= 100),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT chk_projects_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_project_type ON public.projects(project_type);
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_manager_id ON public.projects(manager_id) WHERE manager_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_start_date ON public.projects(start_date);
CREATE INDEX IF NOT EXISTS idx_projects_end_date ON public.projects(end_date);
CREATE INDEX IF NOT EXISTS idx_projects_tags ON public.projects USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_projects_metadata ON public.projects USING GIN(metadata);

-- RLS無効化
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;

-- トリガー
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 4.5 project_partners 中間テーブル
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT uq_project_partners UNIQUE (project_id, partner_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_project_partners_project_id ON public.project_partners(project_id);
CREATE INDEX IF NOT EXISTS idx_project_partners_partner_id ON public.project_partners(partner_id);

-- RLS無効化
ALTER TABLE public.project_partners DISABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 4.6 project_stakeholders テーブル
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_stakeholders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    tier INTEGER NOT NULL DEFAULT 1 CHECK (tier >= 1 AND tier <= 4),
    parent_stakeholder_id UUID REFERENCES public.project_stakeholders(id) ON DELETE SET NULL,
    role_description VARCHAR(500),
    contract_amount DECIMAL(15, 2),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_project_stakeholders_project_id ON public.project_stakeholders(project_id);
CREATE INDEX IF NOT EXISTS idx_project_stakeholders_partner_id ON public.project_stakeholders(partner_id);
CREATE INDEX IF NOT EXISTS idx_project_stakeholders_tier ON public.project_stakeholders(tier);
CREATE INDEX IF NOT EXISTS idx_project_stakeholders_parent ON public.project_stakeholders(parent_stakeholder_id);

-- RLS無効化
ALTER TABLE public.project_stakeholders DISABLE ROW LEVEL SECURITY;

-- トリガー
DROP TRIGGER IF EXISTS update_project_stakeholders_updated_at ON public.project_stakeholders;
CREATE TRIGGER update_project_stakeholders_updated_at
    BEFORE UPDATE ON public.project_stakeholders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 4.7 tasks テーブル
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status public.task_status NOT NULL DEFAULT 'todo',
    priority public.task_priority NOT NULL DEFAULT 'medium',
    type public.task_type NOT NULL DEFAULT 'task',
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    due_date DATE,
    start_date DATE,
    completed_at DATE,
    estimated_hours INTEGER DEFAULT 0,
    actual_hours INTEGER DEFAULT 0,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    reminder_config JSONB DEFAULT NULL,
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_partner_id ON public.tasks(partner_id) WHERE partner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON public.tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON public.tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_tags ON public.tasks USING GIN(tags);
-- idx_tasks_overdue は CURRENT_DATE が IMMUTABLE でないため削除
-- 期限切れタスクのクエリには idx_tasks_due_date と idx_tasks_status を使用してください

-- RLS無効化
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;

-- トリガー
DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 4.8 task_comments テーブル
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON public.task_comments(user_id);

-- RLS無効化
ALTER TABLE public.task_comments DISABLE ROW LEVEL SECURITY;

-- トリガー
DROP TRIGGER IF EXISTS update_task_comments_updated_at ON public.task_comments;
CREATE TRIGGER update_task_comments_updated_at
    BEFORE UPDATE ON public.task_comments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 4.9 reminders テーブル
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    message TEXT,
    type public.reminder_type NOT NULL DEFAULT 'custom',
    status public.reminder_status NOT NULL DEFAULT 'pending',
    channel public.reminder_channel NOT NULL DEFAULT 'in_app',
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    is_read BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON public.reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_task_id ON public.reminders(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reminders_project_id ON public.reminders(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reminders_status ON public.reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled_at ON public.reminders(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_reminders_is_read ON public.reminders(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_reminders_pending ON public.reminders(scheduled_at) WHERE status = 'pending';

-- RLS無効化
ALTER TABLE public.reminders DISABLE ROW LEVEL SECURITY;

-- トリガー
DROP TRIGGER IF EXISTS update_reminders_updated_at ON public.reminders;
CREATE TRIGGER update_reminders_updated_at
    BEFORE UPDATE ON public.reminders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 4.10 notification_logs テーブル
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reminder_id UUID REFERENCES public.reminders(id) ON DELETE SET NULL,
    task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    recipient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    recipient_email VARCHAR(255),
    channel public.reminder_channel NOT NULL,
    status public.reminder_status NOT NULL DEFAULT 'pending',
    subject VARCHAR(1000),
    message TEXT,
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_notification_logs_reminder_id ON public.notification_logs(reminder_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_task_id ON public.notification_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_project_id ON public.notification_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_recipient_id ON public.notification_logs(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON public.notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_channel ON public.notification_logs(channel);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON public.notification_logs(created_at);

-- RLS無効化
ALTER TABLE public.notification_logs DISABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 5. 追加のヘルパー関数
-- =============================================================================

-- 現在ユーザーのロールを取得
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- 現在ユーザーがadminかどうか
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
$$;

-- 現在ユーザーがmanager以上かどうか
CREATE OR REPLACE FUNCTION public.is_manager_or_above()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
$$;

-- 未読通知数を取得
CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
RETURNS INTEGER AS $$
DECLARE
    count INTEGER;
BEGIN
    SELECT COUNT(*) INTO count
    FROM public.reminders
    WHERE user_id = auth.uid()
      AND channel = 'in_app'
      AND is_read = false;

    RETURN COALESCE(count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================================================
-- 6. 新規ユーザー作成時のトリガー
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, first_name, last_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', '')
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 7. コメント
-- =============================================================================

COMMENT ON TABLE public.profiles IS 'ユーザープロファイル情報';
COMMENT ON TABLE public.partners IS 'パートナー企業・担当者情報';
COMMENT ON COLUMN public.partners.skills IS 'スキルタグ配列';
COMMENT ON TABLE public.project_templates IS '案件テンプレート（フェーズ・タスクの雛形）';
COMMENT ON TABLE public.projects IS '案件情報';
COMMENT ON COLUMN public.projects.health_score IS '案件の健全性スコア（0-100）';
COMMENT ON TABLE public.project_stakeholders IS '案件に参加する関係者';
COMMENT ON COLUMN public.project_stakeholders.tier IS '関係者階層（1=直接取引先）';
COMMENT ON TABLE public.tasks IS 'タスク情報';
COMMENT ON COLUMN public.tasks.reminder_config IS 'リマインダー設定（JSON形式）';
COMMENT ON TABLE public.task_comments IS 'タスクに対するコメント';
COMMENT ON COLUMN public.task_comments.is_internal IS '社内向けコメント（パートナーには非公開）';
COMMENT ON TABLE public.reminders IS 'リマインダー・通知情報';
COMMENT ON TABLE public.notification_logs IS '通知送信履歴';

-- =============================================================================
-- 8. ビュー（オプション）
-- =============================================================================

-- 期限切れタスクビュー
CREATE OR REPLACE VIEW public.v_overdue_tasks AS
SELECT
    t.*,
    p.name AS project_name,
    pr.first_name || ' ' || pr.last_name AS assignee_name,
    pr.email AS assignee_email
FROM public.tasks t
LEFT JOIN public.projects p ON t.project_id = p.id
LEFT JOIN public.profiles pr ON t.assignee_id = pr.id
WHERE t.status NOT IN ('completed', 'cancelled')
  AND t.due_date < CURRENT_DATE;

COMMENT ON VIEW public.v_overdue_tasks IS '期限切れタスクの一覧';

-- =============================================================================
-- マイグレーション完了
-- =============================================================================
