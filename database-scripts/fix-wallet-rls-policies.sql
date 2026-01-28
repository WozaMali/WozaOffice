-- ============================================================================
-- FIX WALLET RLS POLICIES FOR ADMIN FUNCTIONS
-- ============================================================================
-- This script fixes RLS policies to allow admin functions to work

-- ============================================================================
-- STEP 1: CHECK CURRENT RLS POLICIES
-- ============================================================================

SELECT 'CURRENT USER_WALLETS RLS POLICIES:' as info;
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_wallets' 
AND schemaname = 'public'
ORDER BY policyname;

-- ============================================================================
-- STEP 2: DROP ALL EXISTING WALLET POLICIES
-- ============================================================================

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Admin can update all wallets" ON public.user_wallets;
DROP POLICY IF EXISTS "Users can view their own wallet" ON public.user_wallets;
DROP POLICY IF EXISTS "Service role can manage all wallets" ON public.user_wallets;
DROP POLICY IF EXISTS "Admin can manage all wallets" ON public.user_wallets;

-- ============================================================================
-- STEP 3: CREATE SIMPLIFIED WALLET POLICIES
-- ============================================================================

-- Allow admin users to do everything with wallets
CREATE POLICY "Admin can manage all wallets" ON public.user_wallets
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

-- Allow users to view their own wallet
CREATE POLICY "Users can view their own wallet" ON public.user_wallets
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = user_id);

-- Allow service role to do everything
CREATE POLICY "Service role can manage all wallets" ON public.user_wallets
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- STEP 4: FIX POINTS_TRANSACTIONS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admin can manage all points transactions" ON public.points_transactions;
DROP POLICY IF EXISTS "Users can view their own points transactions" ON public.points_transactions;
DROP POLICY IF EXISTS "Service role can manage all points transactions" ON public.points_transactions;

-- Create admin policy for points_transactions
CREATE POLICY "Admin can manage all points transactions" ON public.points_transactions
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

-- Create user policy for points_transactions
CREATE POLICY "Users can view their own points transactions" ON public.points_transactions
    FOR SELECT 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_wallets 
            WHERE user_wallets.id = points_transactions.wallet_id 
            AND user_wallets.user_id = auth.uid()
        )
    );

-- Create service role policy
CREATE POLICY "Service role can manage all points transactions" ON public.points_transactions
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- STEP 5: VERIFY UPDATED POLICIES
-- ============================================================================

SELECT 'UPDATED USER_WALLETS POLICIES:' as info;
SELECT 
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'user_wallets' 
AND schemaname = 'public'
ORDER BY policyname;

SELECT 'UPDATED POINTS_TRANSACTIONS POLICIES:' as info;
SELECT 
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'points_transactions' 
AND schemaname = 'public'
ORDER BY policyname;

-- ============================================================================
-- STEP 6: SUCCESS MESSAGE
-- ============================================================================

SELECT 'SUCCESS: Wallet RLS policies fixed!' as result;
SELECT 'Admin functions should now work properly' as message;
SELECT 'Try approving the pending pickups again' as status;
