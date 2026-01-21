-- =============================================================================
-- Supabase Migration: 003 - Projects and Related Tables
-- Description: 案件、関係者、テンプレートテーブル
-- =============================================================================

-- =============================================================================
-- ENUM型定義
-- =============================================================================

-- 案件種別
CREATE TYPE public.project_type AS ENUM (
    'joint_development',    -- 共同開発
    'sales_partnership',    -- 販売提携
    'technology_license',   -- 技術ライセンス
    'reseller_agreement',   -- 再販契約
    'consulting',           -- コンサルティング
    'other'                 -- その他
);

-- 会社の役割
CREATE TYPE public.company_role AS ENUM (
    'prime',                -- 主契約者（プライム）
    'subcontractor',        -- 下請け
    'partner',              -- パートナー（対等）
    'client'                -- クライアント
);

-- 案件ステータス
CREATE TYPE public.project_status AS ENUM (
    'draft',                -- 下書き
    'planning',             -- 計画中
    'in_progress',          -- 進行中
    'on_hold',              -- 保留
    'completed',            -- 完了
    'cancelled'             -- キャンセル
);

-- 案件優先度
CREATE TYPE public.project_priority AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);

-- 関係者階層（Tier）
CREATE TYPE public.stakeholder_tier AS ENUM (
    'tier1',                -- 1次（直接取引先）
    'tier2',                -- 2次
    'tier3',                -- 3次
    'tier4'                 -- 4次以降
);

-- =============================================================================
-- project_templates テーブル（案件テンプレート）
-- =============================================================================

CREATE TABLE public.project_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(500) NOT NULL,
    description TEXT,
    project_type public.project_type,

    -- フェーズとタスクの定義（JSONB）
    phases JSONB DEFAULT '[]',
    -- 構造例:
    -- [
    --   {
    --     "name": "企画",
    --     "order": 1,
    --     "tasks": [
    --       { "name": "要件定義", "description": "...", "estimatedDays": 7, "order": 1 }
    --     ]
    --   }
    -- ]

    is_active BOOLEAN NOT NULL DEFAULT true,

    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_templates_project_type ON public.project_templates(project_type);
CREATE INDEX idx_project_templates_is_active ON public.project_templates(is_active) WHERE is_active = true;

COMMENT ON TABLE public.project_templates IS '案件テンプレート（フェーズ・タスクの雛形）';

CREATE TRIGGER update_project_templates_updated_at
    BEFORE UPDATE ON public.project_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- projects テーブル（案件）
-- =============================================================================

CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 基本情報
    name VARCHAR(500) NOT NULL,
    code VARCHAR(100),                  -- 案件コード（社内管理用）
    description TEXT,

    -- 種別とステータス
    project_type public.project_type NOT NULL DEFAULT 'other',
    company_role public.company_role,
    status public.project_status NOT NULL DEFAULT 'draft',
    priority public.project_priority NOT NULL DEFAULT 'medium',

    -- 日程
    start_date DATE,
    end_date DATE,
    actual_end_date DATE,

    -- 予算
    budget DECIMAL(15, 2),
    actual_cost DECIMAL(15, 2) DEFAULT 0,

    -- 進捗・健全性
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    health_score INTEGER DEFAULT 100 CHECK (health_score >= 0 AND health_score <= 100),

    -- 担当者
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- テンプレート
    template_id UUID REFERENCES public.project_templates(id) ON DELETE SET NULL,

    -- メタデータ
    tags TEXT[],
    metadata JSONB DEFAULT '{}',

    -- 作成者
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    -- 制約
    CONSTRAINT chk_projects_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

-- インデックス
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_project_type ON public.projects(project_type);
CREATE INDEX idx_projects_owner_id ON public.projects(owner_id);
CREATE INDEX idx_projects_manager_id ON public.projects(manager_id) WHERE manager_id IS NOT NULL;
CREATE INDEX idx_projects_code ON public.projects(code) WHERE code IS NOT NULL;
CREATE INDEX idx_projects_start_date ON public.projects(start_date);
CREATE INDEX idx_projects_end_date ON public.projects(end_date);
CREATE INDEX idx_projects_tags ON public.projects USING GIN(tags);
CREATE INDEX idx_projects_metadata ON public.projects USING GIN(metadata);

COMMENT ON TABLE public.projects IS '案件情報';
COMMENT ON COLUMN public.projects.health_score IS '案件の健全性スコア（0-100）';

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- project_partners 中間テーブル（案件とパートナーの関連）
-- =============================================================================

CREATE TABLE public.project_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    CONSTRAINT uq_project_partners UNIQUE (project_id, partner_id)
);

CREATE INDEX idx_project_partners_project_id ON public.project_partners(project_id);
CREATE INDEX idx_project_partners_partner_id ON public.project_partners(partner_id);

-- =============================================================================
-- project_stakeholders テーブル（案件関係者）
-- =============================================================================

CREATE TABLE public.project_stakeholders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,

    -- 階層と親関係
    tier INTEGER NOT NULL DEFAULT 1 CHECK (tier >= 1 AND tier <= 4),
    parent_stakeholder_id UUID REFERENCES public.project_stakeholders(id) ON DELETE SET NULL,

    -- 役割と契約
    role_description VARCHAR(500),
    contract_amount DECIMAL(15, 2),
    is_primary BOOLEAN NOT NULL DEFAULT false,

    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_stakeholders_project_id ON public.project_stakeholders(project_id);
CREATE INDEX idx_project_stakeholders_partner_id ON public.project_stakeholders(partner_id);
CREATE INDEX idx_project_stakeholders_tier ON public.project_stakeholders(tier);
CREATE INDEX idx_project_stakeholders_parent ON public.project_stakeholders(parent_stakeholder_id);

COMMENT ON TABLE public.project_stakeholders IS '案件に参加する関係者';
COMMENT ON COLUMN public.project_stakeholders.tier IS '関係者階層（1=直接取引先）';

CREATE TRIGGER update_project_stakeholders_updated_at
    BEFORE UPDATE ON public.project_stakeholders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================

-- project_templates
ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_templates_select_policy" ON public.project_templates
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "project_templates_insert_policy" ON public.project_templates
    FOR INSERT WITH CHECK (public.is_manager_or_above());

CREATE POLICY "project_templates_update_policy" ON public.project_templates
    FOR UPDATE USING (public.is_manager_or_above());

CREATE POLICY "project_templates_delete_policy" ON public.project_templates
    FOR DELETE USING (public.is_admin());

-- projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_select_policy" ON public.projects
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "projects_insert_policy" ON public.projects
    FOR INSERT WITH CHECK (public.is_manager_or_above());

CREATE POLICY "projects_update_policy" ON public.projects
    FOR UPDATE USING (
        owner_id = auth.uid()
        OR manager_id = auth.uid()
        OR public.is_admin()
    );

CREATE POLICY "projects_delete_policy" ON public.projects
    FOR DELETE USING (public.is_admin());

-- project_partners
ALTER TABLE public.project_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_partners_select_policy" ON public.project_partners
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "project_partners_insert_policy" ON public.project_partners
    FOR INSERT WITH CHECK (public.is_manager_or_above());

CREATE POLICY "project_partners_delete_policy" ON public.project_partners
    FOR DELETE USING (public.is_manager_or_above());

-- project_stakeholders
ALTER TABLE public.project_stakeholders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_stakeholders_select_policy" ON public.project_stakeholders
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "project_stakeholders_insert_policy" ON public.project_stakeholders
    FOR INSERT WITH CHECK (public.is_manager_or_above());

CREATE POLICY "project_stakeholders_update_policy" ON public.project_stakeholders
    FOR UPDATE USING (public.is_manager_or_above());

CREATE POLICY "project_stakeholders_delete_policy" ON public.project_stakeholders
    FOR DELETE USING (public.is_manager_or_above());
