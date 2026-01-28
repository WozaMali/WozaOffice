-- ============================================================================
-- TEST ADMIN PERMISSIONS AND PICKUP UPDATES
-- ============================================================================
-- Run this in your Supabase SQL Editor to test admin permissions

-- 1. Check if admin user exists in auth.users
SELECT 
    id,
    email,
    created_at
FROM auth.users 
WHERE email = 'admin@wozamali.com';

-- 2. Check if admin profile exists
SELECT 
    id,
    first_name,
    last_name,
    role,
    created_at
FROM public.profiles 
WHERE email = 'admin@wozamali.com';

-- 3. Check if admin user ID matches profile ID
SELECT 
    au.id as auth_user_id,
    p.id as profile_id,
    au.email,
    p.role,
    p.first_name,
    p.last_name
FROM auth.users au
JOIN public.profiles p ON au.id = p.id
WHERE au.email = 'admin@wozamali.com';

-- 4. Check current pickup statuses
SELECT 
    id,
    status,
    approval_note,
    created_at,
    updated_at
FROM public.pickups 
ORDER BY created_at DESC 
LIMIT 5;

-- 5. Test updating a pickup status (replace 'PICKUP_ID_HERE' with actual ID)
-- First, let's see what pickups exist:
SELECT 
    id,
    status,
    customer_id,
    collector_id,
    total_kg,
    created_at
FROM public.pickups 
WHERE status = 'submitted'
LIMIT 3;

-- 6. Check RLS policies on pickups table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'pickups';

-- 7. Check table permissions for authenticated users
SELECT 
    grantee,
    table_name,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'pickups' 
AND grantee IN ('authenticated', 'anon');

-- 8. Test a simple update (uncomment and modify the ID below)
-- UPDATE public.pickups 
-- SET status = 'test_approved', approval_note = 'Test approval'
-- WHERE id = 'REPLACE_WITH_ACTUAL_PICKUP_ID'
-- RETURNING id, status, approval_note, updated_at;
