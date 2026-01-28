-- ============================================================================
-- SIMPLE PASSWORD RESET FOR SUPERADMIN
-- ============================================================================
-- Run this in Supabase SQL Editor to set superadmin password to 123456

-- Check if superadmin exists
SELECT 'Current superadmin status:' as info;
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at,
    last_sign_in_at
FROM auth.users 
WHERE email = 'superadmin@wozamali.co.za';

-- Update password to 123456
UPDATE auth.users 
SET 
    encrypted_password = crypt('123456', gen_salt('bf')),
    updated_at = now()
WHERE email = 'superadmin@wozamali.co.za';

-- Verify password was updated
SELECT 'Password updated - verification:' as info;
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at,
    last_sign_in_at,
    encrypted_password IS NOT NULL as has_password,
    updated_at
FROM auth.users 
WHERE email = 'superadmin@wozamali.co.za';

-- If superadmin doesn't exist, you'll need to create it first
-- Go to Supabase Dashboard > Authentication > Users > Add User
-- Email: superadmin@wozamali.co.za
-- Password: 123456
-- Confirm email: Yes
