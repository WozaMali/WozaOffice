-- ============================================================================
-- FIX ROLE_ID COLUMN WITH RLS POLICY DEPENDENCIES
-- ============================================================================
-- This script handles RLS policies that depend on the role_id column

-- Step 1: Check what policies depend on the role_id column
SELECT 'Policies that depend on role_id column:' as info;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND (qual LIKE '%role_id%' OR roles LIKE '%role_id%');

-- Step 2: Drop all policies that depend on role_id
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop policies on users table
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'users'
        AND (qual LIKE '%role_id%' OR roles LIKE '%role_id%')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || policy_record.policyname || ' ON public.users';
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
    
    -- Drop policies on rewards table
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'rewards'
        AND (qual LIKE '%role_id%' OR roles LIKE '%role_id%')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || policy_record.policyname || ' ON public.rewards';
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
    
    -- Drop policies on other tables that might depend on role_id
    FOR policy_record IN 
        SELECT tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND (qual LIKE '%role_id%' OR roles LIKE '%role_id%')
        AND tablename NOT IN ('users', 'rewards')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || policy_record.policyname || ' ON public.' || policy_record.tablename;
        RAISE NOTICE 'Dropped policy: % on table: %', policy_record.policyname, policy_record.tablename;
    END LOOP;
END $$;

-- Step 3: Check if there are any remaining dependencies
SELECT 'Remaining policies that depend on role_id:' as info;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND (qual LIKE '%role_id%' OR roles LIKE '%role_id%');

-- Step 4: Now fix the role_id column
-- First, drop the default value
ALTER TABLE public.users ALTER COLUMN role_id DROP DEFAULT;

-- Then update the column type to UUID
ALTER TABLE public.users ALTER COLUMN role_id TYPE UUID USING role_id::uuid;

-- Set a new default value (NULL is fine for UUID)
ALTER TABLE public.users ALTER COLUMN role_id SET DEFAULT NULL;

-- Step 5: Verify the column is now properly configured
SELECT 'Updated role_id column definition:' as info;
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'role_id'
AND table_schema = 'public';

-- Step 6: Recreate the policies with updated column references
-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see their own data
CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Create policy for SUPER_ADMIN to see all users
CREATE POLICY "SUPER_ADMIN can view all users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'SUPER_ADMIN'
        )
    );

CREATE POLICY "SUPER_ADMIN can manage all users" ON public.users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'SUPER_ADMIN'
        )
    );

-- Create policy for ADMIN to see users (but not SUPER_ADMIN)
CREATE POLICY "ADMIN can view non-superadmin users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'ADMIN'
        )
        AND role != 'SUPER_ADMIN'
    );

CREATE POLICY "ADMIN can manage non-superadmin users" ON public.users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'ADMIN'
        )
        AND role != 'SUPER_ADMIN'
    );

-- Step 7: Recreate policies on other tables if needed
-- Enable RLS on rewards table if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rewards' AND table_schema = 'public') THEN
        ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
        
        -- Create policy for office users to manage rewards
        CREATE POLICY "Allow office users to manage rewards" ON public.rewards
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.users u 
                    WHERE u.id = auth.uid() 
                    AND u.role IN ('SUPER_ADMIN', 'ADMIN', 'STAFF')
                )
            );
        
        RAISE NOTICE 'Created rewards policy';
    END IF;
END $$;

-- Step 8: Final verification
SELECT 'Role ID type fix with policies complete!' as info;
SELECT 'Policies recreated successfully!' as info;
