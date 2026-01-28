-- ============================================================================
-- SUPABASE DATABASE SETUP FOR WOZA MALI
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROFILES TABLE (User Management)
-- ============================================================================

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'STAFF', 'COLLECTOR', 'CUSTOMER')),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (only if they don't exist)
DO $$
BEGIN
  -- Users can view their own profile
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view their own profile'
  ) THEN
    CREATE POLICY "Users can view their own profile" ON profiles
      FOR SELECT USING (auth.uid() = id);
  END IF;

  -- Admins can view all profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Admins can view all profiles'
  ) THEN
    CREATE POLICY "Admins can view all profiles" ON profiles
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
        )
      );
  END IF;

  -- Admins can insert profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Admins can insert profiles'
  ) THEN
    CREATE POLICY "Admins can insert profiles" ON profiles
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
        )
      );
  END IF;

  -- Admins can update profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Admins can update profiles'
  ) THEN
    CREATE POLICY "Admins can update profiles" ON profiles
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
        )
      );
  END IF;
END $$;

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Insert a default admin user (you can modify these details)
INSERT INTO profiles (id, email, username, first_name, last_name, role, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@wozamali.com',
  'admin',
  'System',
  'Administrator',
  'ADMIN',
  true
) ON CONFLICT (email) DO NOTHING;

-- Insert a default collector user
INSERT INTO profiles (id, email, username, first_name, last_name, role, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'col001@wozamali.com',
  'col001',
  'John',
  'Smith',
  'COLLECTOR',
  true
) ON CONFLICT (email) DO NOTHING;

-- Insert a default staff user
INSERT INTO profiles (id, email, username, first_name, last_name, role, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  'manager@wozamali.com',
  'manager',
  'Sarah',
  'Johnson',
  'STAFF',
  true
) ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- FUNCTIONS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at'
  ) THEN
    CREATE TRIGGER update_profiles_updated_at 
      BEFORE UPDATE ON profiles 
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================================
-- VIEWS FOR DASHBOARD DATA
-- ============================================================================

-- Create a view for user statistics
CREATE OR REPLACE VIEW user_stats AS
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN role = 'ADMIN' THEN 1 END) as admin_count,
  COUNT(CASE WHEN role = 'STAFF' THEN 1 END) as staff_count,
  COUNT(CASE WHEN role = 'COLLECTOR' THEN 1 END) as collector_count,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
  COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_users
FROM profiles;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated users
GRANT SELECT ON profiles TO authenticated;
GRANT SELECT ON user_stats TO authenticated;

-- Grant permissions to service role (for admin operations)
GRANT ALL ON profiles TO service_role;
GRANT ALL ON user_stats TO service_role;
