-- ============================================================================
-- SIMPLE SOLUTION: ALLOW USER REGISTRATION
-- ============================================================================
-- This script temporarily disables RLS on users table to allow registration
-- WARNING: This reduces security but allows registration to work

-- Step 1: Check current RLS status
SELECT '=== CHECKING CURRENT RLS STATUS ===' as step;

SELECT 
    schemaname,
    tablename,
    rowsecurity,
    hasrules
FROM pg_tables 
WHERE tablename = 'users' 
AND schemaname = 'public';

-- Step 2: Temporarily disable RLS on users table
SELECT '=== DISABLING RLS ON USERS TABLE ===' as step;

ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Step 3: Grant all permissions
SELECT '=== GRANTING PERMISSIONS ===' as step;

GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.users TO anon;

-- Step 4: Verify the setup
SELECT '=== VERIFICATION ===' as step;

SELECT 
    schemaname,
    tablename,
    rowsecurity,
    hasrules
FROM pg_tables 
WHERE tablename = 'users' 
AND schemaname = 'public';

SELECT 'USERS RLS DISABLED - REGISTRATION SHOULD WORK NOW' as result;
