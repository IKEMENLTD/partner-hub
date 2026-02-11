-- 012: system_settings テーブル作成
-- 組織レベルのSlack/LINE/SMS連携設定を管理

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,

  -- Slack設定
  slack_webhook_url TEXT,
  slack_channel_name VARCHAR(100),
  slack_notify_escalation BOOLEAN NOT NULL DEFAULT true,
  slack_notify_daily_summary BOOLEAN NOT NULL DEFAULT true,
  slack_notify_all_reminders BOOLEAN NOT NULL DEFAULT false,

  -- LINE設定
  line_channel_access_token TEXT,
  line_channel_secret TEXT,

  -- SMS設定（Twilio）
  twilio_account_sid TEXT,
  twilio_auth_token TEXT,
  twilio_phone_number TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS有効化
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- 管理者のみアクセス可能
CREATE POLICY "system_settings_admin_access" ON system_settings
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- インデックス
CREATE INDEX IF NOT EXISTS idx_system_settings_organization_id ON system_settings(organization_id);

-- updated_at自動更新トリガー
CREATE OR REPLACE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
