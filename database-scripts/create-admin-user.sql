-- ============================================================================
-- CREATE ADMIN USER FOR WOZA MALI ADMIN PORTAL
-- ============================================================================
-- Run this in your Supabase SQL Editor to create a test admin account

-- First, delete any existing profile with this email (to avoid duplicates)
DELETE FROM public.profiles WHERE email = 'admin@wozamali.com';

-- Insert admin profile
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  role,
  is_active,
  created_at
) VALUES (
  gen_random_uuid(),
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
-- IMPORTANT: Now you need to create the auth user in Supabase Auth
-- ============================================================================
-- 1. Go to Authentication > Users in your Supabase dashboard
-- 2. Click "Add User"
-- 3. Fill in:
--    - Email: admin@wozamali.com
--    - Password: admin123
--    - Email confirmed: ✅ (Check this box)
-- 4. Click "Create User"
-- 5. Copy the User ID that gets generated
-- 6. Update the profile with the correct User ID:
-- ============================================================================

-- After creating the auth user, update the profile with the correct User ID
-- Replace 'YOUR_AUTH_USER_ID' with the actual User ID from step 5 above
-- UPDATE public.profiles 
-- SET id = 'YOUR_AUTH_USER_ID'
-- WHERE email = 'admin@wozamali.com';

-- ============================================================================
-- ALTERNATIVE: Create auth user via SQL (if you have service role access)
-- ============================================================================
-- Note: This requires service role permissions
-- INSERT INTO auth.users (
--   id,
--   email,
--   encrypted_password,
--   email_confirmed_at,
--   created_at,
--   updated_at
-- ) VALUES (
--   gen_random_uuid(),
--   'admin@wozamali.com',
--   crypt('admin123', gen_salt('bf')),
--   NOW(),
--   NOW(),
--   NOW()
-- );
-- ============================================================================
