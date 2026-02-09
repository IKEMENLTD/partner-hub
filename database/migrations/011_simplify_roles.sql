-- Migration: Simplify roles from 4 (admin/manager/member/partner) to 2 (admin/member)
-- Date: 2026-02-09
-- Description: Remove MANAGER and PARTNER roles, promote existing managers to admin,
--              convert existing partners to member.

-- 1. Promote all existing 'manager' users to 'admin'
UPDATE profiles
SET role = 'admin', updated_at = NOW()
WHERE role = 'manager';

-- 2. Deactivate all existing 'partner' users (external partners use token access only)
UPDATE profiles
SET role = 'member', is_active = false, updated_at = NOW()
WHERE role = 'partner';

-- 3. Update the is_manager_or_above() function to only check for admin
-- (if the function exists in your Supabase setup)
CREATE OR REPLACE FUNCTION is_manager_or_above()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT role = 'admin'
    FROM profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: PostgreSQL ENUMs don't easily support value removal.
-- The application now only uses 'admin' and 'member' values.
-- The old enum values ('manager', 'partner') remain in the DB type
-- but are no longer used by the application.

-- Verify migration results
-- SELECT role, COUNT(*) FROM profiles GROUP BY role;
