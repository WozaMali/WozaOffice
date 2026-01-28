-- ============================================================================
-- FIX USERS TABLE RLS FOR COLLECTOR REGISTRATION
-- ============================================================================
-- This script fixes RLS policies to allow collector registration
-- while maintaining security

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

-- Step 2: Check existing policies
SELECT '=== CHECKING EXISTING POLICIES ===' as step;

SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'users' 
AND schemaname = 'public';

-- Step 3: Drop existing policies that might be blocking registration
SELECT '=== DROPPING EXISTING POLICIES ===' as step;

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all existing policies on users table
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'users' 
        AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.users';
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- Step 4: Create new RLS policies for users table
SELECT '=== CREATING NEW RLS POLICIES ===' as step;

-- Policy 1: Allow users to insert their own record during registration
CREATE POLICY "Allow user registration" ON public.users
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Policy 2: Allow users to read their own data
CREATE POLICY "Users can read own data" ON public.users
    FOR SELECT
    USING (auth.uid() = id);

-- Policy 3: Allow users to update their own data
CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Policy 4: Allow service role to read all users (for admin functions)
CREATE POLICY "Service role can read all users" ON public.users
    FOR SELECT
    TO service_role
    USING (true);

-- Policy 5: Allow service role to insert users (for admin functions)
CREATE POLICY "Service role can insert users" ON public.users
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Policy 6: Allow service role to update users (for admin functions)
CREATE POLICY "Service role can update users" ON public.users
    FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Step 5: Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 6: Grant necessary permissions
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.users TO anon;

-- Step 7: Verify the setup
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

-- Check policies
SELECT 
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'users' 
AND schemaname = 'public'
ORDER BY policyname;

SELECT 'USERS RLS POLICIES CREATED SUCCESSFULLY' as result;
