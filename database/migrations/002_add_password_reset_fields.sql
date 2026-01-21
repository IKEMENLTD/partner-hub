-- Migration: Add password reset fields to users table
-- Created at: 2026-01-20

-- Add password reset token and expiration columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP;

-- Create index for faster token lookup
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);

-- Add comment for documentation
COMMENT ON COLUMN users.password_reset_token IS 'Hashed token for password reset (bcrypt)';
COMMENT ON COLUMN users.password_reset_expires IS 'Expiration timestamp for password reset token';
