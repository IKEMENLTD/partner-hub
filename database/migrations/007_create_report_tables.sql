-- Migration: Create Report Tables for Automatic Report Generation
-- Run this SQL in Supabase SQL Editor to create the report tables

-- Enable uuid-ossp extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types for report period
DO $$ BEGIN
  CREATE TYPE "report_period_enum" AS ENUM ('weekly', 'monthly');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum types for report config status
DO $$ BEGIN
  CREATE TYPE "report_config_status_enum" AS ENUM ('active', 'paused', 'deleted');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum types for generated report status
DO $$ BEGIN
  CREATE TYPE "generated_report_status_enum" AS ENUM ('pending', 'generated', 'sent', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create report_configs table
CREATE TABLE IF NOT EXISTS "report_configs" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "name" varchar NOT NULL,
  "description" text,
  "period" "report_period_enum" NOT NULL DEFAULT 'weekly',
  "status" "report_config_status_enum" NOT NULL DEFAULT 'active',
  "schedule_cron" varchar,
  "day_of_week" integer NOT NULL DEFAULT 1,
  "day_of_month" integer NOT NULL DEFAULT 1,
  "send_time" varchar NOT NULL DEFAULT '09:00',
  "recipients" text[] NOT NULL DEFAULT '{}',
  "include_project_summary" boolean NOT NULL DEFAULT true,
  "include_task_summary" boolean NOT NULL DEFAULT true,
  "include_partner_performance" boolean NOT NULL DEFAULT true,
  "include_highlights" boolean NOT NULL DEFAULT true,
  "project_ids" text[],
  "partner_ids" text[],
  "last_generated_at" TIMESTAMP,
  "next_run_at" TIMESTAMP,
  "created_by" uuid,
  "organization_id" uuid,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
  "deleted_at" TIMESTAMP,
  CONSTRAINT "PK_report_configs" PRIMARY KEY ("id"),
  CONSTRAINT "FK_report_configs_created_by" FOREIGN KEY ("created_by") REFERENCES "profiles"("id") ON DELETE SET NULL
);

-- Create generated_reports table
CREATE TABLE IF NOT EXISTS "generated_reports" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "report_config_id" uuid,
  "title" varchar NOT NULL,
  "period" "report_period_enum" NOT NULL,
  "date_range_start" date NOT NULL,
  "date_range_end" date NOT NULL,
  "status" "generated_report_status_enum" NOT NULL DEFAULT 'pending',
  "report_data" jsonb NOT NULL,
  "sent_to" text[] NOT NULL DEFAULT '{}',
  "sent_at" TIMESTAMP,
  "error_message" text,
  "is_manual" boolean NOT NULL DEFAULT false,
  "generated_by" uuid,
  "organization_id" uuid,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_generated_reports" PRIMARY KEY ("id"),
  CONSTRAINT "FK_generated_reports_config" FOREIGN KEY ("report_config_id") REFERENCES "report_configs"("id") ON DELETE SET NULL,
  CONSTRAINT "FK_generated_reports_generated_by" FOREIGN KEY ("generated_by") REFERENCES "profiles"("id") ON DELETE SET NULL
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS "IDX_report_configs_status" ON "report_configs" ("status");
CREATE INDEX IF NOT EXISTS "IDX_report_configs_period" ON "report_configs" ("period");
CREATE INDEX IF NOT EXISTS "IDX_report_configs_next_run_at" ON "report_configs" ("next_run_at");
CREATE INDEX IF NOT EXISTS "IDX_report_configs_created_by" ON "report_configs" ("created_by");
CREATE INDEX IF NOT EXISTS "IDX_report_configs_organization_id" ON "report_configs" ("organization_id");

CREATE INDEX IF NOT EXISTS "IDX_generated_reports_config_id" ON "generated_reports" ("report_config_id");
CREATE INDEX IF NOT EXISTS "IDX_generated_reports_period" ON "generated_reports" ("period");
CREATE INDEX IF NOT EXISTS "IDX_generated_reports_status" ON "generated_reports" ("status");
CREATE INDEX IF NOT EXISTS "IDX_generated_reports_created_at" ON "generated_reports" ("created_at");
CREATE INDEX IF NOT EXISTS "IDX_generated_reports_generated_by" ON "generated_reports" ("generated_by");
CREATE INDEX IF NOT EXISTS "IDX_generated_reports_organization_id" ON "generated_reports" ("organization_id");

-- Enable Row Level Security (RLS) for Supabase
ALTER TABLE "report_configs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "generated_reports" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for report_configs
-- Users can view report configs they created
CREATE POLICY "Users can view their own report configs" ON "report_configs"
  FOR SELECT USING (created_by = auth.uid());

-- Users can create report configs
CREATE POLICY "Users can create report configs" ON "report_configs"
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- Users can update their own report configs
CREATE POLICY "Users can update their own report configs" ON "report_configs"
  FOR UPDATE USING (created_by = auth.uid());

-- Users can delete their own report configs
CREATE POLICY "Users can delete their own report configs" ON "report_configs"
  FOR DELETE USING (created_by = auth.uid());

-- Service role has full access to report_configs
CREATE POLICY "Service role has full access to report_configs" ON "report_configs"
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for generated_reports
-- Users can view reports they generated or reports from configs they created
CREATE POLICY "Users can view their generated reports" ON "generated_reports"
  FOR SELECT USING (
    generated_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM report_configs
      WHERE report_configs.id = generated_reports.report_config_id
      AND report_configs.created_by = auth.uid()
    )
  );

-- Users can create generated reports
CREATE POLICY "Users can create generated reports" ON "generated_reports"
  FOR INSERT WITH CHECK (generated_by = auth.uid() OR auth.role() = 'service_role');

-- Service role has full access to generated_reports
CREATE POLICY "Service role has full access to generated_reports" ON "generated_reports"
  FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON "report_configs" TO authenticated;
GRANT SELECT, INSERT ON "generated_reports" TO authenticated;

-- Grant full permissions to service_role
GRANT ALL ON "report_configs" TO service_role;
GRANT ALL ON "generated_reports" TO service_role;

-- Create trigger to update updated_at for report_configs
CREATE OR REPLACE FUNCTION update_report_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_report_configs_updated_at ON report_configs;
CREATE TRIGGER trigger_update_report_configs_updated_at
  BEFORE UPDATE ON report_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_report_configs_updated_at();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Report tables created successfully!';
END $$;
