-- =============================================================================
-- 016_partner_reports_quick_status.sql
-- パートナー報告システム - クイックステータス機能追加
-- =============================================================================

-- 1. partner_reports テーブルに新カラム追加
ALTER TABLE partner_reports ADD COLUMN IF NOT EXISTS progress_status VARCHAR(50);
ALTER TABLE partner_reports ADD COLUMN IF NOT EXISTS weekly_accomplishments TEXT;
ALTER TABLE partner_reports ADD COLUMN IF NOT EXISTS next_week_plan TEXT;

-- content を nullable に変更（クイック報告では不要な場合がある）
ALTER TABLE partner_reports ALTER COLUMN content DROP NOT NULL;

-- progress_status の CHECK 制約
ALTER TABLE partner_reports DROP CONSTRAINT IF EXISTS partner_reports_progress_status_check;
ALTER TABLE partner_reports ADD CONSTRAINT partner_reports_progress_status_check
  CHECK (progress_status IS NULL OR progress_status IN ('on_track', 'slightly_delayed', 'has_issues'));

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_partner_reports_progress_status ON partner_reports(progress_status);
CREATE INDEX IF NOT EXISTS idx_partner_reports_is_read ON partner_reports(is_read);

-- =============================================================================
-- 2. 報告リクエストスケジュールテーブル
-- =============================================================================

CREATE TABLE IF NOT EXISTS report_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    organization_id UUID REFERENCES organizations(id),

    -- スケジュール対象
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

    -- スケジュール設定
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly')),
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),  -- 0=日曜, 6=土曜
    day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
    time_of_day TIME DEFAULT '09:00:00',

    -- 期限設定
    deadline_days INTEGER DEFAULT 3,  -- 報告期限（リクエスト送信からの日数）

    -- ステータス
    is_active BOOLEAN DEFAULT true,
    last_sent_at TIMESTAMPTZ,
    next_send_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES profiles(id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_report_schedules_org ON report_schedules(organization_id);
CREATE INDEX IF NOT EXISTS idx_report_schedules_partner ON report_schedules(partner_id);
CREATE INDEX IF NOT EXISTS idx_report_schedules_project ON report_schedules(project_id);
CREATE INDEX IF NOT EXISTS idx_report_schedules_next_send ON report_schedules(next_send_at) WHERE is_active = true;

-- =============================================================================
-- 3. 報告リクエストテーブル（送信済みリクエストの追跡）
-- =============================================================================

CREATE TABLE IF NOT EXISTS report_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    schedule_id UUID REFERENCES report_schedules(id) ON DELETE SET NULL,
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

    -- リクエスト情報
    requested_at TIMESTAMPTZ DEFAULT now(),
    deadline_at TIMESTAMPTZ NOT NULL,

    -- ステータス
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'overdue', 'cancelled')),
    report_id UUID REFERENCES partner_reports(id) ON DELETE SET NULL,  -- 提出された報告

    -- リマインダー追跡
    reminder_count INTEGER DEFAULT 0,
    last_reminder_at TIMESTAMPTZ,
    escalation_level INTEGER DEFAULT 0,  -- 0=なし, 1=1日超過, 2=3日超過, 3=7日超過, 4=14日超過

    created_at TIMESTAMPTZ DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_report_requests_org ON report_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_report_requests_partner ON report_requests(partner_id);
CREATE INDEX IF NOT EXISTS idx_report_requests_status ON report_requests(status);
CREATE INDEX IF NOT EXISTS idx_report_requests_deadline ON report_requests(deadline_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_report_requests_overdue ON report_requests(deadline_at) WHERE status = 'overdue';

-- =============================================================================
-- RLS ポリシー
-- =============================================================================

-- report_schedules
ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "report_schedules_select" ON report_schedules;
CREATE POLICY "report_schedules_select" ON report_schedules
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "report_schedules_insert" ON report_schedules;
CREATE POLICY "report_schedules_insert" ON report_schedules
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "report_schedules_update" ON report_schedules;
CREATE POLICY "report_schedules_update" ON report_schedules
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "report_schedules_delete" ON report_schedules;
CREATE POLICY "report_schedules_delete" ON report_schedules
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- report_requests
ALTER TABLE report_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "report_requests_select" ON report_requests;
CREATE POLICY "report_requests_select" ON report_requests
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "report_requests_insert" ON report_requests;
CREATE POLICY "report_requests_insert" ON report_requests
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
        OR TRUE  -- service_role での挿入を許可
    );

DROP POLICY IF EXISTS "report_requests_update" ON report_requests;
CREATE POLICY "report_requests_update" ON report_requests
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
        OR TRUE  -- service_role での更新を許可
    );

-- =============================================================================
-- トリガー
-- =============================================================================

CREATE OR REPLACE FUNCTION update_report_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_report_schedules_updated_at ON report_schedules;
CREATE TRIGGER trigger_update_report_schedules_updated_at
    BEFORE UPDATE ON report_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_report_schedules_updated_at();

-- =============================================================================
-- 確認
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Quick status columns added to partner_reports!';
    RAISE NOTICE 'New tables: report_schedules, report_requests';
END $$;
