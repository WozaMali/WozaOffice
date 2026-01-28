-- ============================================================================
-- CORRECTED WALLET_TRANSACTIONS RLS FIX
-- ============================================================================
-- This script fixes RLS policies without assuming specific column names

-- ============================================================================
-- STEP 1: CHECK CURRENT STATE
-- ============================================================================

SELECT '=== CHECKING CURRENT STATE ===' as step;

-- Check if table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wallet_transactions' AND table_schema = 'public')
        THEN 'wallet_transactions table EXISTS'
        ELSE 'wallet_transactions table DOES NOT EXIST'
    END as table_status;

-- Get actual column structure
SELECT '=== ACTUAL COLUMNS ===' as step;
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'wallet_transactions' 
AND table_schema = 'public'
ORDER BY ordinal_position;

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
-- STEP 3: DROP EXISTING POLICIES
-- ============================================================================

SELECT '=== DROPPING EXISTING POLICIES ===' as step;

-- Drop all existing policies
DROP POLICY IF EXISTS "Admin can manage all wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users can view their own wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Service role can manage all wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Enable all for admin users" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Enable all for service role" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Postgres can manage all wallet transactions" ON public.wallet_transactions;

-- ============================================================================
-- STEP 4: CREATE RLS POLICIES (BASED ON ACTUAL COLUMNS)
-- ============================================================================

SELECT '=== CREATING RLS POLICIES ===' as step;

-- Policy 1: Admin users can do everything (using user_id column)
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

-- Policy 2: Users can view their own transactions (using user_id column)
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

-- Policy 4: Postgres role can do everything
CREATE POLICY "Postgres can manage all wallet transactions" ON public.wallet_transactions
    FOR ALL 
    TO postgres
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- STEP 5: VERIFY POLICIES
-- ============================================================================

SELECT '=== VERIFICATION ===' as step;

-- Check policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
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
-- STEP 6: TEST QUERY CAPABILITY
-- ============================================================================

SELECT '=== TESTING QUERY CAPABILITY ===' as step;

-- Test if we can query the table
SELECT 
    'Can query wallet_transactions' as test,
    COUNT(*) as transaction_count
FROM public.wallet_transactions;

-- ============================================================================
-- STEP 7: ALTERNATIVE - TEMPORARILY DISABLE RLS FOR TESTING
-- ============================================================================

-- If the above doesn't work, temporarily disable RLS
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
SELECT 'Check the verification results above' as note;
SELECT 'If deletion still fails, uncomment the RLS disable section' as fallback;
