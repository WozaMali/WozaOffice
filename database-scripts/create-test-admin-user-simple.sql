-- ============================================================================
-- CREATE TEST ADMIN USER FOR WOZA MALI ADMIN PORTAL (SIMPLE VERSION)
-- ============================================================================
-- Run this in your Supabase SQL Editor to create a test admin account

-- This script will create a profile with a new UUID and then you can update the auth user
-- to match this profile ID

-- First, delete any existing profile with this email (to avoid duplicates)
DELETE FROM public.profiles WHERE email = 'admin@wozamali.com';

-- Insert admin profile with a new UUID
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  role,
  is_active,
  created_at
) VALUES (
  gen_random_uuid(), -- Generate a new UUID
  'admin@wozamali.com',
  'Admin User',
  'admin',
  true,
  NOW()
);

-- Get the profile ID that was created
SELECT 
  id,
  email,
  full_name,
  role,
  is_active,
  created_at
FROM public.profiles 
WHERE email = 'admin@wozamali.com';

-- ============================================================================
-- IMPORTANT: After running this script, you need to:
-- ============================================================================
-- 1. Copy the 'id' value from the result above
-- 2. Go to Authentication > Users in your Supabase dashboard
-- 3. Find the user with email 'admin@wozamali.com'
-- 4. Click on the user to edit
-- 5. Change the User ID to match the profile ID you copied
-- 6. Save the changes
-- ============================================================================
