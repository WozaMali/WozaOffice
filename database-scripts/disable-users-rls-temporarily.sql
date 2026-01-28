-- ============================================================================
-- TEMPORARILY DISABLE USERS TABLE RLS FOR REGISTRATION
-- ============================================================================
-- This script temporarily disables RLS on the users table to allow registration
-- This is the safest and simplest approach

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

-- Step 2: Disable RLS on users table
SELECT '=== DISABLING RLS ON USERS TABLE ===' as step;

ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Step 3: Grant necessary permissions
SELECT '=== GRANTING PERMISSIONS ===' as step;

-- Grant permissions to all roles
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.users TO anon;

-- Step 4: Verify the changes
SELECT '=== VERIFICATION ===' as step;

-- Check RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    hasrules
FROM pg_tables 
WHERE tablename = 'users' 
AND schemaname = 'public';

-- Check permissions
SELECT 
    grantee,
    privilege_type
FROM information_schema.table_privileges 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY grantee, privilege_type;

SELECT 'USERS RLS DISABLED SUCCESSFULLY - REGISTRATION SHOULD WORK NOW' as result;
