-- Migration: Add soft delete (deleted_at) columns to main entities
-- Date: 2026-01-22
-- Description: Adds deleted_at column for logical deletion (soft delete) support

-- Add deleted_at column to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add deleted_at column to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add deleted_at column to partners table
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create indexes for efficient filtering of non-deleted records
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_partners_deleted_at ON partners(deleted_at) WHERE deleted_at IS NULL;

-- Create indexes for finding deleted records (for admin restore functionality)
CREATE INDEX IF NOT EXISTS idx_projects_deleted ON projects(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_deleted ON tasks(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_partners_deleted ON partners(deleted_at) WHERE deleted_at IS NOT NULL;

-- Update RLS policies to exclude soft-deleted records (if RLS is enabled)
-- Note: These policies should be adjusted based on your actual RLS setup

-- Comment for reference:
-- TypeORM automatically filters out records where deleted_at IS NOT NULL
-- when using the @DeleteDateColumn decorator.
-- To include deleted records in queries, use the withDeleted option:
--   repository.find({ withDeleted: true })
--   queryBuilder.withDeleted()
