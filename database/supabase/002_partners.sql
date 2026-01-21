-- =============================================================================
-- Supabase Migration: 002 - Partners Table
-- Description: パートナー企業・担当者テーブル
-- =============================================================================

-- =============================================================================
-- ENUM型定義
-- =============================================================================

-- パートナー種別
CREATE TYPE public.partner_type AS ENUM (
    'company',              -- 企業
    'individual'            -- 個人事業主
);

-- パートナーステータス
CREATE TYPE public.partner_status AS ENUM (
    'pending',              -- 審査中
    'active',               -- アクティブ
    'inactive',             -- 非アクティブ
    'suspended'             -- 一時停止
);

-- =============================================================================
-- partners テーブル
-- =============================================================================

CREATE TABLE public.partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 基本情報
    name VARCHAR(500) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),

    -- 企業情報（type = 'company' の場合）
    company_name VARCHAR(500),
    corporate_number VARCHAR(13),       -- 法人番号（13桁）

    -- 種別とステータス
    type public.partner_type NOT NULL DEFAULT 'individual',
    status public.partner_status NOT NULL DEFAULT 'pending',

    -- 詳細情報
    description TEXT,
    skills TEXT[],                      -- スキルタグ配列
    address TEXT,
    country VARCHAR(100) DEFAULT 'Japan',
    timezone VARCHAR(50) DEFAULT 'Asia/Tokyo',

    -- 評価・実績
    rating DECIMAL(3, 2) DEFAULT 0,
    total_projects INTEGER DEFAULT 0,
    completed_projects INTEGER DEFAULT 0,

    -- メタデータ
    metadata JSONB DEFAULT '{}',

    -- 関連ユーザー（パートナーがシステムにログインする場合）
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- 作成者
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX idx_partners_email ON public.partners(email);
CREATE INDEX idx_partners_type ON public.partners(type);
CREATE INDEX idx_partners_status ON public.partners(status);
CREATE INDEX idx_partners_company_name ON public.partners(company_name) WHERE company_name IS NOT NULL;
CREATE INDEX idx_partners_user_id ON public.partners(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_partners_skills ON public.partners USING GIN(skills);

-- コメント
COMMENT ON TABLE public.partners IS 'パートナー企業・担当者情報';
COMMENT ON COLUMN public.partners.corporate_number IS '法人番号（国税庁発行の13桁）';
COMMENT ON COLUMN public.partners.skills IS 'スキルタグ配列';

-- updated_at トリガー
CREATE TRIGGER update_partners_updated_at
    BEFORE UPDATE ON public.partners
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- Row Level Security (RLS) for partners
-- =============================================================================

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- ポリシー: 認証済みユーザーは全パートナーを閲覧可能
CREATE POLICY "partners_select_policy" ON public.partners
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- ポリシー: admin/manager はパートナーを作成可能
CREATE POLICY "partners_insert_policy" ON public.partners
    FOR INSERT
    WITH CHECK (public.is_manager_or_above());

-- ポリシー: admin/manager はパートナーを更新可能
CREATE POLICY "partners_update_policy" ON public.partners
    FOR UPDATE
    USING (public.is_manager_or_above())
    WITH CHECK (public.is_manager_or_above());

-- ポリシー: admin のみパートナーを削除可能
CREATE POLICY "partners_delete_policy" ON public.partners
    FOR DELETE
    USING (public.is_admin());
