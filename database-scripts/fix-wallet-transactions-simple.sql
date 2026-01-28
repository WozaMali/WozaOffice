-- ============================================================================
-- SIMPLE WALLET_TRANSACTIONS RLS FIX
-- ============================================================================
-- This script fixes RLS policies for wallet_transactions table

-- ============================================================================
-- STEP 1: ENABLE RLS AND GRANT PERMISSIONS
-- ============================================================================

-- Enable RLS on wallet_transactions table
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Grant all necessary permissions
GRANT ALL ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
GRANT ALL ON public.wallet_transactions TO postgres;

-- ============================================================================
-- STEP 2: DROP EXISTING POLICIES
-- ============================================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Admin can manage all wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users can view their own wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Service role can manage all wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Enable all for admin users" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Enable all for service role" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Postgres can manage all wallet transactions" ON public.wallet_transactions;

-- ============================================================================
-- STEP 3: CREATE RLS POLICIES
-- ============================================================================

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

-- Policy 4: Postgres role can do everything
CREATE POLICY "Postgres can manage all wallet transactions" ON public.wallet_transactions
    FOR ALL 
    TO postgres
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- STEP 4: VERIFY POLICIES WERE CREATED
-- ============================================================================

-- Check policies
SELECT 
    'POLICIES CREATED' as status,
    policyname,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'wallet_transactions' 
AND schemaname = 'public'
ORDER BY policyname;

-- ============================================================================
-- STEP 5: TEST QUERY CAPABILITY
-- ============================================================================

-- Test if we can query the table
SELECT 
    'QUERY TEST' as test,
    COUNT(*) as transaction_count
FROM public.wallet_transactions;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

SELECT 'WALLET_TRANSACTIONS RLS FIX COMPLETED' as status;
SELECT 'Admin users should now be able to delete transactions' as result;
