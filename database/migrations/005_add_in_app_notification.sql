-- Migration: Add in-app notification support
-- Date: 2026-01-23

-- 1. notification_settings に in_app_notification カラムを追加
ALTER TABLE notification_settings
ADD COLUMN IF NOT EXISTS in_app_notification BOOLEAN DEFAULT true;

-- 2. in_app_notifications テーブルを作成
CREATE TABLE IF NOT EXISTS in_app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL DEFAULT 'system',
  title VARCHAR(255) NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  link_url VARCHAR(500),
  task_id UUID,
  project_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. インデックス作成
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user_read
ON in_app_notifications(user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user_created
ON in_app_notifications(user_id, created_at DESC);
