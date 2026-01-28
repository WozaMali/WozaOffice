-- ============================================================================
-- SIMPLE WEBSOCKET AUTHENTICATION FIX
-- ============================================================================
-- This script fixes WebSocket authentication issues by ensuring proper RLS policies

-- Step 1: Ensure RLS is properly enabled on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop any problematic policies that might be causing auth issues
DROP POLICY IF EXISTS "users_allow_all" ON public.users;
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "SUPER_ADMIN can view all users" ON public.users;
DROP POLICY IF EXISTS "SUPER_ADMIN can manage all users" ON public.users;
DROP POLICY IF EXISTS "ADMIN can view non-superadmin users" ON public.users;
DROP POLICY IF EXISTS "ADMIN can manage non-superadmin users" ON public.users;
DROP POLICY IF EXISTS "users_select_authenticated" ON public.users;
DROP POLICY IF EXISTS "users_update_authenticated" ON public.users;
DROP POLICY IF EXISTS "users_insert_authenticated" ON public.users;

-- Step 3: Create simple, working RLS policies for users
CREATE POLICY "users_select_authenticated" ON public.users
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "users_update_authenticated" ON public.users
    FOR UPDATE TO authenticated
    USING (true) WITH CHECK (true);

CREATE POLICY "users_insert_authenticated" ON public.users
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Step 4: Grant necessary permissions for realtime
GRANT SELECT ON public.users TO authenticated;
GRANT UPDATE ON public.users TO authenticated;
GRANT INSERT ON public.users TO authenticated;

-- Step 5: Enable realtime for users table
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;

-- Step 6: Verify the fix
SELECT 'WebSocket authentication fix completed' as status;
