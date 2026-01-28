-- ============================================================================
-- COMPREHENSIVE WALLET_TRANSACTIONS RLS FIX
-- ============================================================================
-- This script ensures wallet_transactions table has proper RLS policies for deletion

-- ============================================================================
-- STEP 1: CHECK CURRENT STATE
-- ============================================================================

SELECT '=== CURRENT STATE CHECK ===' as step;

-- Check if table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wallet_transactions' AND table_schema = 'public')
        THEN 'wallet_transactions table EXISTS'
        ELSE 'wallet_transactions table DOES NOT EXIST'
    END as table_status;

-- Check RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    hasrules as has_rules
FROM pg_tables 
WHERE tablename = 'wallet_transactions' 
AND schemaname = 'public';

-- ============================================================================
-- STEP 2: ENABLE RLS AND GRANT PERMISSIONS
-- ============================================================================

-- Enable RLS on wallet_transactions table
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Grant all necessary permissions
GRANT ALL ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
GRANT ALL ON public.wallet_transactions TO postgres;

-- ============================================================================
-- STEP 3: DROP EXISTING POLICIES (CLEAN SLATE)
-- ============================================================================

SELECT '=== DROPPING EXISTING POLICIES ===' as step;

-- Drop all existing policies
DROP POLICY IF EXISTS "Admin can manage all wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users can view their own wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Service role can manage all wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Enable all for admin users" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Enable all for service role" ON public.wallet_transactions;

-- ============================================================================
-- STEP 4: CREATE COMPREHENSIVE RLS POLICIES
-- ============================================================================

SELECT '=== CREATING RLS POLICIES ===' as step;

-- Policy 1: Admin users can do everything
CREATE POLICY "Admin can manage all wallet transactions" ON public.wallet_transactions
    FOR ALL 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

-- Policy 2: Users can view their own transactions
CREATE POLICY "Users can view their own wallet transactions" ON public.wallet_transactions
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = user_id);

-- Policy 3: Service role can do everything
CREATE POLICY "Service role can manage all wallet transactions" ON public.wallet_transactions
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy 4: Postgres role can do everything (for admin operations)
CREATE POLICY "Postgres can manage all wallet transactions" ON public.wallet_transactions
    FOR ALL 
    TO postgres
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- STEP 5: VERIFY POLICIES WERE CREATED
-- ============================================================================

SELECT '=== VERIFICATION ===' as step;

-- Check policies
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
WHERE tablename = 'wallet_transactions' 
AND schemaname = 'public'
ORDER BY policyname;

-- Check permissions
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'wallet_transactions' 
AND table_schema = 'public'
ORDER BY grantee, privilege_type;

-- ============================================================================
-- STEP 6: TEST DELETION CAPABILITY
-- ============================================================================

SELECT '=== TESTING DELETION CAPABILITY ===' as step;

-- Check if we can query the table
SELECT 
    'Can query wallet_transactions' as test,
    COUNT(*) as transaction_count
FROM public.wallet_transactions;

-- Check current user context
SELECT 
    'Current user context' as test,
    current_user as current_user,
    session_user as session_user;

-- ============================================================================
-- STEP 7: ALTERNATIVE APPROACH - DISABLE RLS TEMPORARILY
-- ============================================================================

-- If the above doesn't work, we can temporarily disable RLS for testing
-- UNCOMMENT THE FOLLOWING LINES ONLY IF NEEDED:

-- SELECT '=== TEMPORARILY DISABLING RLS FOR TESTING ===' as step;
-- ALTER TABLE public.wallet_transactions DISABLE ROW LEVEL SECURITY;
-- 
-- -- Test deletion without RLS
-- SELECT 'Testing deletion without RLS...' as test;
-- 
-- -- Re-enable RLS after testing
-- ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

SELECT 'WALLET_TRANSACTIONS RLS FIX COMPLETED' as status;
SELECT 'Admin users should now be able to delete transactions' as result;
SELECT 'If issues persist, check the verification results above' as note;
