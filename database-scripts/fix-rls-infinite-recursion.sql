-- ============================================================================
-- FIX RLS INFINITE RECURSION ISSUES
-- ============================================================================
-- This script fixes the infinite recursion in RLS policies by removing
-- circular dependencies and creating simpler, more efficient policies

-- Step 1: Check current RLS status and policies
SELECT '=== CHECKING CURRENT RLS STATUS ===' as step;

SELECT 
    schemaname,
    tablename,
    rowsecurity,
    hasrules
FROM pg_tables 
WHERE tablename IN ('users', 'profiles', 'unified_collections') 
AND schemaname = 'public';

-- Step 2: Check existing policies that might cause recursion
SELECT '=== CHECKING EXISTING POLICIES ===' as step;

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('users', 'profiles', 'unified_collections')
AND schemaname = 'public'
ORDER BY tablename, policyname;

-- Step 3: Drop all problematic policies
SELECT '=== DROPPING PROBLEMATIC POLICIES ===' as step;

-- Drop all policies on users table
DO $$
DECLARE
    policy_record RECORD;
BEGIN
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

-- Drop all policies on profiles table
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.profiles';
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- Drop all policies on unified_collections table
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'unified_collections' 
        AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.unified_collections';
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- Step 4: Create simple, non-recursive RLS policies for users table
SELECT '=== CREATING SIMPLE USERS POLICIES ===' as step;

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Simple policy: Users can read their own data
CREATE POLICY "users_select_own" ON public.users
    FOR SELECT
    USING (auth.uid() = id);

-- Simple policy: Users can update their own data
CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Simple policy: Users can insert their own data (for registration)
CREATE POLICY "users_insert_own" ON public.users
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Service role can do everything (for admin functions)
CREATE POLICY "users_service_role_all" ON public.users
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Step 5: Create simple RLS policies for profiles table
SELECT '=== CREATING SIMPLE PROFILES POLICIES ===' as step;

-- Enable RLS on profiles table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        
        -- Simple policy: Users can read their own profile
        CREATE POLICY "profiles_select_own" ON public.profiles
            FOR SELECT
            USING (auth.uid() = user_id);
        
        -- Simple policy: Users can update their own profile
        CREATE POLICY "profiles_update_own" ON public.profiles
            FOR UPDATE
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
        
        -- Simple policy: Users can insert their own profile
        CREATE POLICY "profiles_insert_own" ON public.profiles
            FOR INSERT
            WITH CHECK (auth.uid() = user_id);
        
        -- Service role can do everything
        CREATE POLICY "profiles_service_role_all" ON public.profiles
            FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

-- Step 6: Create simple RLS policies for unified_collections table
SELECT '=== CREATING SIMPLE UNIFIED_COLLECTIONS POLICIES ===' as step;

-- Enable RLS on unified_collections table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'unified_collections' AND table_schema = 'public') THEN
        ALTER TABLE public.unified_collections ENABLE ROW LEVEL SECURITY;
        
        -- Simple policy: Authenticated users can read all collections
        CREATE POLICY "unified_collections_select_all" ON public.unified_collections
            FOR SELECT
            TO authenticated
            USING (true);
        
        -- Simple policy: Authenticated users can insert collections
        CREATE POLICY "unified_collections_insert_all" ON public.unified_collections
            FOR INSERT
            TO authenticated
            WITH CHECK (true);
        
        -- Simple policy: Authenticated users can update collections
        CREATE POLICY "unified_collections_update_all" ON public.unified_collections
            FOR UPDATE
            TO authenticated
            USING (true)
            WITH CHECK (true);
        
        -- Service role can do everything
        CREATE POLICY "unified_collections_service_role_all" ON public.unified_collections
            FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

-- Step 7: Grant necessary permissions
SELECT '=== GRANTING PERMISSIONS ===' as step;

-- Grant permissions on users table
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.users TO anon;

-- Grant permissions on profiles table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
        GRANT ALL ON public.profiles TO authenticated;
        GRANT ALL ON public.profiles TO service_role;
        GRANT ALL ON public.profiles TO anon;
    END IF;
END $$;

-- Grant permissions on unified_collections table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'unified_collections' AND table_schema = 'public') THEN
        GRANT ALL ON public.unified_collections TO authenticated;
        GRANT ALL ON public.unified_collections TO service_role;
        GRANT ALL ON public.unified_collections TO anon;
    END IF;
END $$;

-- Step 8: Verify the setup
SELECT '=== VERIFICATION ===' as step;

-- Check RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    hasrules
FROM pg_tables 
WHERE tablename IN ('users', 'profiles', 'unified_collections') 
AND schemaname = 'public';

-- Check policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('users', 'profiles', 'unified_collections')
AND schemaname = 'public'
ORDER BY tablename, policyname;

SELECT 'RLS INFINITE RECURSION FIX COMPLETED SUCCESSFULLY' as result;
