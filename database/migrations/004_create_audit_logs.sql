-- Audit Logs テーブルを作成
-- 実行: Supabase SQL Editor

-- Create enum type for audit action
DO $$ BEGIN
  CREATE TYPE "audit_action_enum" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'SOFT_DELETE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "user_id" uuid,
  "user_email" varchar,
  "action" "audit_action_enum" NOT NULL,
  "entity_name" varchar NOT NULL,
  "entity_id" varchar NOT NULL,
  "old_value" jsonb,
  "new_value" jsonb,
  "metadata" jsonb,
  "ip_address" varchar,
  "user_agent" text,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "IDX_audit_logs_entity" ON "audit_logs" ("entity_name", "entity_id");
CREATE INDEX IF NOT EXISTS "IDX_audit_logs_user_id" ON "audit_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "IDX_audit_logs_action" ON "audit_logs" ("action");
CREATE INDEX IF NOT EXISTS "IDX_audit_logs_created_at" ON "audit_logs" ("created_at");

-- Enable RLS
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;

-- Service role bypass (drop if exists to avoid duplicate error)
DROP POLICY IF EXISTS "Service role has full access to audit_logs" ON "audit_logs";
CREATE POLICY "Service role has full access to audit_logs" ON "audit_logs"
  FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON "audit_logs" TO service_role;

-- 投入確認
SELECT COUNT(*) as count FROM audit_logs;
