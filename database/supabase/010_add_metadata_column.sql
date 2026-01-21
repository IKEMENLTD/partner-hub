-- =============================================
-- Supabase Migration: Add metadata column to profiles
-- =============================================
--
-- Purpose: Add JSONB metadata column to profiles table
-- Issue: QueryFailedError: column Reminder__Reminder_user.metadata does not exist
--
-- Run this in Supabase Dashboard > SQL Editor
-- =============================================

-- Add metadata column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.metadata IS 'JSONB field for storing additional user profile data';

-- Create index for JSONB queries (optional, for performance)
CREATE INDEX IF NOT EXISTS idx_profiles_metadata ON public.profiles USING GIN (metadata);
