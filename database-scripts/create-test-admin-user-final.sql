-- ============================================================================
-- CREATE TEST ADMIN USER FOR WOZA MALI ADMIN PORTAL (FINAL VERSION)
-- ============================================================================
-- Run this in your Supabase SQL Editor to create a test admin account
-- Using the specific UUID: 0ce1a2bc-294e-4bdf-a6d2-b3e8ddec6540

-- First, delete any existing profile with this email (to avoid duplicates)
DELETE FROM public.profiles WHERE email = 'admin@wozamali.com';

-- Insert admin profile with the specific UUID
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  role,
  is_active,
  created_at
) VALUES (
  '0ce1a2bc-294e-4bdf-a6d2-b3e8ddec6540',
  'admin@wozamali.com',
  'Admin User',
  'admin',
  true,
  NOW()
);

-- Verify the profile was created
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
-- IMPORTANT: Now you need to update the auth user to match this profile ID
-- ============================================================================
-- 1. Go to Authentication > Users in your Supabase dashboard
-- 2. Find the user with email 'admin@wozamali.com'
-- 3. Click on the user to edit
-- 4. Change the User ID to: 0ce1a2bc-294e-4bdf-a6d2-b3e8ddec6540
-- 5. Save the changes
-- ============================================================================
