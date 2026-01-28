-- ============================================================================
-- FIX WALLET_TRANSACTIONS RLS POLICIES
-- ============================================================================
-- This script creates the missing RLS policies for wallet_transactions table
-- to allow admin users to delete monetary transactions

-- ============================================================================
-- STEP 1: ENABLE RLS ON WALLET_TRANSACTIONS TABLE
-- ============================================================================

-- Enable RLS on wallet_transactions table
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: GRANT PERMISSIONS ON WALLET_TRANSACTIONS TABLE
-- ============================================================================

-- Grant permissions on wallet_transactions table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallet_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallet_transactions TO service_role;

-- ============================================================================
-- STEP 3: DROP EXISTING POLICIES (IF ANY)
-- ============================================================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admin can manage all wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users can view their own wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Service role can manage all wallet transactions" ON public.wallet_transactions;

-- ============================================================================
-- STEP 4: CREATE RLS POLICIES FOR WALLET_TRANSACTIONS
-- ============================================================================

-- Admin policy for wallet_transactions - allows admins to do everything
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

-- User policy for wallet_transactions - users can view their own transactions
CREATE POLICY "Users can view their own wallet transactions" ON public.wallet_transactions
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = user_id);

-- Service role policy for wallet_transactions - service role can do everything
CREATE POLICY "Service role can manage all wallet transactions" ON public.wallet_transactions
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- STEP 5: VERIFY POLICIES WERE CREATED
-- ============================================================================

-- Check that policies were created successfully
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

-- ============================================================================
-- STEP 6: VERIFY PERMISSIONS
-- ============================================================================

-- Check table permissions
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'wallet_transactions' 
AND table_schema = 'public'
ORDER BY grantee, privilege_type;

-- ============================================================================
-- STEP 7: TEST QUERY (OPTIONAL)
-- ============================================================================

-- Test that we can query the table (this should work for admin users)
SELECT 
    'wallet_transactions table accessible' as status,
    COUNT(*) as total_transactions
FROM public.wallet_transactions;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

SELECT 'WALLET_TRANSACTIONS RLS POLICIES CREATED SUCCESSFULLY' as status;
SELECT 'Admin users can now delete monetary transactions' as result;
SELECT 'Users can view their own wallet transactions' as note;
