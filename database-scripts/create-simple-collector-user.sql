-- ============================================================================
-- CREATE SIMPLE COLLECTOR USER FOR TESTING
-- ============================================================================
-- This script creates a basic collector profile for testing the collector app

-- First, let's check what we're working with
SELECT 'CURRENT PROFILES TABLE STRUCTURE:' as info;
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Create a simple collector profile
INSERT INTO profiles (
  id,
  email,
  full_name,
  phone,
  role,
  is_active,
  created_at
) VALUES (
  gen_random_uuid(), -- Generate a new UUID
  'col001@wozamali.com',
  'John Smith',
  '+27 123 456 789',
  'collector', -- Use lowercase role
  true,
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  created_at = NOW();

-- Show the created profile
SELECT 'COLLECTOR PROFILE CREATED:' as status;
SELECT 
  id,
  email,
  full_name,
  role,
  is_active,
  created_at
FROM profiles 
WHERE email = 'col001@wozamali.com';

-- Create a simple admin profile as well
INSERT INTO profiles (
  id,
  email,
  full_name,
  phone,
  role,
  is_active,
  created_at
) VALUES (
  gen_random_uuid(),
  'admin@wozamali.com',
  'Admin User',
  '+27 111 222 333',
  'admin', -- Use lowercase role
  true,
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  created_at = NOW();

-- Show all created profiles
SELECT 'ALL PROFILES CREATED:' as status;
SELECT 
  id,
  email,
  full_name,
  role,
  is_active,
  created_at
FROM profiles 
WHERE email IN ('col001@wozamali.com', 'admin@wozamali.com');

-- Note: To use these accounts, you'll need to:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Create users with the emails above
-- 3. Set passwords (e.g., 'collector123' for col001@wozamali.com)
-- 4. The profiles will automatically link to the auth users
