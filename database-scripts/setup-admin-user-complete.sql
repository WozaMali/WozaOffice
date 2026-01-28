-- ============================================================================
-- COMPLETE ADMIN USER SETUP FOR WOZA MALI ADMIN PORTAL
-- ============================================================================
-- This script creates a complete admin user setup for admin@wozamali.com
-- Run this in your Supabase SQL Editor

-- Step 1: Clean up any existing admin user
DELETE FROM public.profiles WHERE email = 'admin@wozamali.com';

-- Step 2: Create the admin profile
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  role,
  is_active,
  created_at
) VALUES (
  '0ce1a2bc-294e-4bdf-a6d2-b3e8ddec6540', -- Fixed UUID for consistency
  'admin@wozamali.com',
  'Woza Mali Administrator',
  'admin',
  true,
  NOW()
);

-- Step 3: Verify the profile was created
SELECT 
  id,
  email,
  full_name,
  role,
  is_active,
  created_at
FROM public.profiles 
WHERE email = 'admin@wozamali.com';

-- Step 4: Check if profiles table has proper permissions
SELECT 
  table_name,
  privilege_type
FROM information_schema.table_privileges 
WHERE table_name = 'profiles' 
AND grantee = 'authenticated';

-- ============================================================================
-- AUTH USER SETUP INSTRUCTIONS
-- ============================================================================
-- After running this SQL script, you need to create the auth user:
--
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to Authentication > Users
-- 3. Click "Add User"
-- 4. Fill in the details:
--    - Email: admin@wozamali.com
--    - Password: admin123
--    - Email confirmed: ✅ (Check this box)
-- 5. Click "Create User"
-- 6. After creation, click on the user to edit
-- 7. Change the User ID to: 0ce1a2bc-294e-4bdf-a6d2-b3e8ddec6540
-- 8. Save the changes
--
-- This ensures the auth user ID matches the profile ID for proper authentication.
-- ============================================================================

-- Step 5: Test query to verify admin user setup
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.is_active,
  CASE 
    WHEN p.role = 'admin' THEN '✅ Admin privileges configured'
    ELSE '❌ Admin privileges not configured'
  END as admin_status
FROM public.profiles p
WHERE p.email = 'admin@wozamali.com';
