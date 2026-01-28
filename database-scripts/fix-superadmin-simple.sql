-- ============================================================================
-- SIMPLE SUPERADMIN FIX
-- ============================================================================
-- This script fixes the superadmin setup by ensuring the user has the correct role

-- Step 1: Update the user to have the correct role
UPDATE public.users 
SET 
    role = 'SUPER_ADMIN',
    role_id = NULL,  -- Clear the invalid role_id
    status = 'active',
    updated_at = NOW()
WHERE email = 'superadmin@wozamali.co.za';

-- Step 2: Create user_profiles entry if it doesn't exist
INSERT INTO public.user_profiles (user_id, role)
SELECT 
    u.id,
    'SUPER_ADMIN'
FROM public.users u
WHERE u.email = 'superadmin@wozamali.co.za'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_profiles up WHERE up.user_id = u.id
  );

-- Step 3: Verification
SELECT '=== VERIFICATION ===' as info;

-- Check user in users table
SELECT 'User in users table:' as info;
SELECT 
    id,
    email,
    full_name,
    role,
    status
FROM public.users 
WHERE email = 'superadmin@wozamali.co.za';

-- Check user in user_profiles table
SELECT 'User in user_profiles table:' as info;
SELECT 
    up.user_id,
    up.role,
    u.email
FROM public.user_profiles up
JOIN public.users u ON up.user_id = u.id
WHERE u.email = 'superadmin@wozamali.co.za';

-- Check auth user
SELECT 'Auth user status:' as info;
SELECT 
    id, 
    email, 
    created_at,
    CASE 
        WHEN encrypted_password IS NOT NULL THEN 'Password set'
        ELSE 'No password'
    END as password_status
FROM auth.users 
WHERE email = 'superadmin@wozamali.co.za';
