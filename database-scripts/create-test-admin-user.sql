-- ============================================================================
-- CREATE TEST ADMIN USER FOR WOZA MALI ADMIN PORTAL
-- ============================================================================
-- Run this in your Supabase SQL Editor to create a test admin account

-- IMPORTANT: You must first create the user in Supabase Auth, then use that User ID here
-- 1. Go to Authentication > Users > Add User
-- 2. Email: admin@wozamali.com, Password: admin123, Email confirmed: ✓
-- 3. Copy the User ID (UUID) from the created user
-- 4. Replace 'REPLACE_WITH_ACTUAL_USER_ID' below with the actual UUID

-- Insert admin profile
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  role,
  is_active,
  created_at
) VALUES (
  'REPLACE_WITH_ACTUAL_USER_ID', -- Replace this with the actual User ID from Supabase Auth
  'admin@wozamali.com',
  'Admin User',
  'admin',
  true,
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  role = 'admin',
  is_active = true,
  created_at = NOW();

-- Check the created profile
SELECT 
  id,
  email,
  full_name,
  role,
  is_active,
  created_at
FROM public.profiles 
WHERE email = 'admin@wozamali.com';
