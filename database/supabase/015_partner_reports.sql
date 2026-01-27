-- =============================================================================
-- 015_partner_reports.sql
-- パートナー報告システム（ログイン不要の報告機能）
-- =============================================================================

-- 1. パートナー報告用トークンテーブル
-- パートナーがログインなしで報告できるようにするためのトークン
CREATE TABLE IF NOT EXISTS partner_report_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,  -- NULL = 全案件対象
    token VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ,  -- NULL = 無期限
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    organization_id UUID REFERENCES organizations(id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_partner_report_tokens_token ON partner_report_tokens(token);
CREATE INDEX IF NOT EXISTS idx_partner_report_tokens_partner ON partner_report_tokens(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_report_tokens_org ON partner_report_tokens(organization_id);

-- 2. パートナー報告テーブル
CREATE TABLE IF NOT EXISTS partner_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('progress', 'issue', 'completion', 'general')),
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    source VARCHAR(50) NOT NULL CHECK (source IN ('web_form', 'email', 'line', 'teams', 'api')),
    source_reference VARCHAR(255),  -- メールID、LINE message ID等
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    read_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    organization_id UUID REFERENCES organizations(id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_partner_reports_partner ON partner_reports(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_reports_project ON partner_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_partner_reports_org ON partner_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_partner_reports_created ON partner_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_reports_unread ON partner_reports(is_read) WHERE is_read = false;

-- 3. partners テーブルに login_enabled カラム追加
ALTER TABLE partners ADD COLUMN IF NOT EXISTS login_enabled BOOLEAN DEFAULT false;

-- 既存のuser_idが設定されているパートナーはlogin_enabled = trueに
UPDATE partners SET login_enabled = true WHERE user_id IS NOT NULL;

-- =============================================================================
-- RLS ポリシー
-- =============================================================================

-- partner_report_tokens
ALTER TABLE partner_report_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partner_report_tokens_select" ON partner_report_tokens;
CREATE POLICY "partner_report_tokens_select" ON partner_report_tokens
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "partner_report_tokens_insert" ON partner_report_tokens;
CREATE POLICY "partner_report_tokens_insert" ON partner_report_tokens
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "partner_report_tokens_update" ON partner_report_tokens;
CREATE POLICY "partner_report_tokens_update" ON partner_report_tokens
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "partner_report_tokens_delete" ON partner_report_tokens;
CREATE POLICY "partner_report_tokens_delete" ON partner_report_tokens
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- partner_reports
ALTER TABLE partner_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partner_reports_select" ON partner_reports;
CREATE POLICY "partner_reports_select" ON partner_reports
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "partner_reports_insert" ON partner_reports;
CREATE POLICY "partner_reports_insert" ON partner_reports
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
        OR
        -- トークン経由での挿入を許可（service_roleで実行）
        TRUE
    );

DROP POLICY IF EXISTS "partner_reports_update" ON partner_reports;
CREATE POLICY "partner_reports_update" ON partner_reports
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- =============================================================================
-- トリガー: updated_at 自動更新
-- =============================================================================

CREATE OR REPLACE FUNCTION update_partner_report_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_partner_report_tokens_updated_at ON partner_report_tokens;
CREATE TRIGGER trigger_update_partner_report_tokens_updated_at
    BEFORE UPDATE ON partner_report_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_partner_report_tokens_updated_at();

-- =============================================================================
-- 確認
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Partner reports tables created successfully!';
    RAISE NOTICE 'Tables: partner_report_tokens, partner_reports';
    RAISE NOTICE 'Column added: partners.login_enabled';
END $$;
