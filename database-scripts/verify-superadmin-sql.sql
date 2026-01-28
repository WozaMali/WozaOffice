-- ============================================================================
-- VERIFY SUPERADMIN SETUP
-- ============================================================================
-- Run this in Supabase SQL Editor to verify the superadmin setup

-- Step 1: Check if SUPER_ADMIN role exists
SELECT '=== CHECKING SUPER_ADMIN ROLE ===' as info;
SELECT 
    id,
    name,
    description,
    permissions
FROM public.roles 
WHERE name = 'SUPER_ADMIN';

-- Step 2: Check if user exists in users table
SELECT '=== CHECKING USER IN USERS TABLE ===' as info;
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.status,
    r.name as role_name,
    r.permissions
FROM public.users u
LEFT JOIN public.roles r ON u.role_id::text = r.id::text
WHERE u.email = 'superadmin@wozamali.co.za';

-- Step 3: Check if user exists in auth.users
SELECT '=== CHECKING AUTH USER ===' as info;
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

-- Step 4: Check user_profiles table (if it exists)
SELECT '=== CHECKING USER_PROFILES TABLE ===' as info;
SELECT 
    up.user_id,
    up.role,
    au.email
FROM public.user_profiles up
LEFT JOIN auth.users au ON up.user_id = au.id
WHERE au.email = 'superadmin@wozamali.co.za';

-- Step 5: Show all available roles
SELECT '=== ALL AVAILABLE ROLES ===' as info;
SELECT id, name, description FROM public.roles ORDER BY name;

-- Step 6: Show all users with their roles
SELECT '=== ALL USERS WITH ROLES ===' as info;
SELECT 
    u.email,
    u.full_name,
    u.role,
    u.status,
    r.name as role_name
FROM public.users u
LEFT JOIN public.roles r ON u.role_id::text = r.id::text
ORDER BY u.email;
