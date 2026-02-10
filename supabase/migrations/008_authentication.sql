-- Authentication System
-- Create fafa_users table for app authentication

CREATE TABLE IF NOT EXISTS fafa_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add updated_at trigger
CREATE TRIGGER update_fafa_users_updated_at
  BEFORE UPDATE ON fafa_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Create index on mobile for faster lookups
CREATE INDEX idx_fafa_users_mobile ON fafa_users(mobile);
CREATE INDEX idx_fafa_users_role ON fafa_users(role);
