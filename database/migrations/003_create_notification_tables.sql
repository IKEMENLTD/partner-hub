-- Migration: Create Notification Tables
-- Run this SQL in Supabase SQL Editor to create the notification tables

-- Enable uuid-ossp extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types (if not exists)
DO $$ BEGIN
  CREATE TYPE "notification_channel_type_enum" AS ENUM ('email', 'slack', 'in_app', 'webhook');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "notification_status_enum" AS ENUM ('pending', 'sent', 'failed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "notification_type_enum" AS ENUM ('reminder', 'escalation', 'task_update', 'project_update', 'system');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create notification_settings table
CREATE TABLE IF NOT EXISTS "notification_settings" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "user_id" uuid NOT NULL,
  "digest_enabled" boolean NOT NULL DEFAULT true,
  "digest_time" varchar(5) NOT NULL DEFAULT '07:00',
  "deadline_notification" boolean NOT NULL DEFAULT true,
  "assignee_change_notification" boolean NOT NULL DEFAULT true,
  "mention_notification" boolean NOT NULL DEFAULT true,
  "status_change_notification" boolean NOT NULL DEFAULT true,
  "reminder_max_count" integer NOT NULL DEFAULT 3,
  "email_notification" boolean NOT NULL DEFAULT true,
  "push_notification" boolean NOT NULL DEFAULT true,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_notification_settings" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_notification_settings_user_id" UNIQUE ("user_id"),
  CONSTRAINT "FK_notification_settings_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Create notification_channels table
CREATE TABLE IF NOT EXISTS "notification_channels" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "name" varchar NOT NULL,
  "type" "notification_channel_type_enum" NOT NULL DEFAULT 'in_app',
  "is_active" boolean NOT NULL DEFAULT true,
  "channel_id" varchar,
  "project_id" uuid,
  "user_id" uuid,
  "config" jsonb,
  "created_by" uuid,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_notification_channels" PRIMARY KEY ("id"),
  CONSTRAINT "FK_notification_channels_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_notification_channels_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "FK_notification_channels_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
);

-- Create notification_logs table
CREATE TABLE IF NOT EXISTS "notification_logs" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "type" "notification_type_enum" NOT NULL DEFAULT 'system',
  "channelType" "notification_channel_type_enum" NOT NULL,
  "status" "notification_status_enum" NOT NULL DEFAULT 'pending',
  "recipient_id" uuid,
  "channel_id" uuid,
  "subject" varchar NOT NULL,
  "message" text,
  "payload" jsonb,
  "external_id" varchar,
  "error_message" text,
  "retry_count" integer NOT NULL DEFAULT 0,
  "sent_at" TIMESTAMP,
  "metadata" jsonb,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_notification_logs" PRIMARY KEY ("id"),
  CONSTRAINT "FK_notification_logs_recipient" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "FK_notification_logs_channel" FOREIGN KEY ("channel_id") REFERENCES "notification_channels"("id") ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "IDX_notification_settings_user_id" ON "notification_settings" ("user_id");
CREATE INDEX IF NOT EXISTS "IDX_notification_channels_project_id" ON "notification_channels" ("project_id");
CREATE INDEX IF NOT EXISTS "IDX_notification_channels_user_id" ON "notification_channels" ("user_id");
CREATE INDEX IF NOT EXISTS "IDX_notification_logs_recipient_id" ON "notification_logs" ("recipient_id");
CREATE INDEX IF NOT EXISTS "IDX_notification_logs_status" ON "notification_logs" ("status");
CREATE INDEX IF NOT EXISTS "IDX_notification_logs_created_at" ON "notification_logs" ("created_at");

-- Enable Row Level Security (RLS) for Supabase
ALTER TABLE "notification_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification_channels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification_logs" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_settings
CREATE POLICY "Users can view their own notification settings" ON "notification_settings"
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings" ON "notification_settings"
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings" ON "notification_settings"
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role bypass for notification_settings
CREATE POLICY "Service role has full access to notification_settings" ON "notification_settings"
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for notification_channels
CREATE POLICY "Users can view notification channels they created or are assigned to" ON "notification_channels"
  FOR SELECT USING (created_by = auth.uid() OR user_id = auth.uid());

CREATE POLICY "Service role has full access to notification_channels" ON "notification_channels"
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for notification_logs
CREATE POLICY "Users can view their own notification logs" ON "notification_logs"
  FOR SELECT USING (recipient_id = auth.uid());

CREATE POLICY "Service role has full access to notification_logs" ON "notification_logs"
  FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON "notification_settings" TO authenticated;
GRANT SELECT ON "notification_channels" TO authenticated;
GRANT SELECT ON "notification_logs" TO authenticated;

-- Grant full permissions to service_role
GRANT ALL ON "notification_settings" TO service_role;
GRANT ALL ON "notification_channels" TO service_role;
GRANT ALL ON "notification_logs" TO service_role;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Notification tables created successfully!';
END $$;
