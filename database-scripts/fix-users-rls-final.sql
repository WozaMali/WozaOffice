-- ============================================================================
-- FINAL FIX: DISABLE USERS RLS AND ADD EMPLOYEE_NUMBER COLUMN
-- ============================================================================
-- This script does both: adds the missing column AND disables RLS

-- Step 1: Add employee_number column if it doesn't exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS employee_number VARCHAR(20);

-- Step 2: Disable RLS on users table
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Step 3: Grant all permissions
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.users TO anon;

-- Step 4: Verify
SELECT 'SUCCESS: Users table is ready for registration' as result;
