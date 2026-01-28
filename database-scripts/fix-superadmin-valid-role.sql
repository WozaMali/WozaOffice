-- ============================================================================
-- FIX SUPERADMIN WITH VALID ROLE
-- ============================================================================
-- This script fixes the superadmin setup using a valid role value

-- Step 1: Check what roles are currently valid
SELECT 'Current roles in users table:' as info;
SELECT DISTINCT role, COUNT(*) as count
FROM public.users 
WHERE role IS NOT NULL
GROUP BY role
ORDER BY role;

-- Step 2: Update the user to have a valid role (try 'admin' first)
UPDATE public.users 
SET 
    role = 'admin',  -- Use 'admin' instead of 'SUPER_ADMIN'
    role_id = NULL,  -- Clear the invalid role_id
    status = 'active',
    updated_at = NOW()
WHERE email = 'superadmin@wozamali.co.za';

-- Step 3: Create user_profiles entry if it doesn't exist
INSERT INTO public.user_profiles (user_id, role)
SELECT 
    u.id,
    'admin'  -- Use 'admin' role
FROM public.users u
WHERE u.email = 'superadmin@wozamali.co.za'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_profiles up WHERE up.user_id = u.id
  );

-- Step 4: Verification
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
