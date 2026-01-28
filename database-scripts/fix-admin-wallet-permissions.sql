-- ============================================================================
-- FIX ADMIN WALLET PERMISSIONS FOR COLLECTION APPROVAL
-- ============================================================================
-- This script grants admin users UPDATE permissions on user_wallets table
-- to allow collection approval and wallet updates

-- ============================================================================
-- STEP 1: CHECK CURRENT PERMISSIONS
-- ============================================================================

SELECT 'CURRENT TABLE PERMISSIONS FOR USER_WALLETS:' as info;
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'user_wallets' 
AND table_schema = 'public'
ORDER BY grantee, privilege_type;

-- ============================================================================
-- STEP 2: GRANT UPDATE PERMISSIONS TO AUTHENTICATED USERS
-- ============================================================================

-- Grant UPDATE permission to authenticated users (needed for admin operations)
GRANT UPDATE ON public.user_wallets TO authenticated;

-- Grant UPDATE permission to service_role
GRANT UPDATE ON public.user_wallets TO service_role;

-- ============================================================================
-- STEP 3: CREATE ADMIN UPDATE POLICY FOR USER_WALLETS
-- ============================================================================

-- Drop existing update policies if they exist
DROP POLICY IF EXISTS "Admin can update all wallets" ON public.user_wallets;
DROP POLICY IF EXISTS "Users can update their own wallet" ON public.user_wallets;
DROP POLICY IF EXISTS "Service role can update all wallets" ON public.user_wallets;

-- Create policy for admin users to update all wallets
CREATE POLICY "Admin can update all wallets" ON public.user_wallets
    FOR UPDATE 
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

-- Create policy for users to update their own wallet
CREATE POLICY "Users can update their own wallet" ON public.user_wallets
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create policy for service role to update all wallets
CREATE POLICY "Service role can update all wallets" ON public.user_wallets
    FOR UPDATE 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- STEP 4: GRANT PERMISSIONS ON POINTS TRANSACTIONS TABLE
-- ============================================================================

-- Grant permissions on points_transactions table (the actual table in your database)
GRANT SELECT, INSERT, UPDATE ON public.points_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.points_transactions TO service_role;

-- Create policies for points_transactions
DROP POLICY IF EXISTS "Admin can manage all points transactions" ON public.points_transactions;
DROP POLICY IF EXISTS "Users can view their own points transactions" ON public.points_transactions;
DROP POLICY IF EXISTS "Service role can manage all points transactions" ON public.points_transactions;

-- Admin policy for points_transactions
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

-- User policy for points_transactions
CREATE POLICY "Users can view their own points transactions" ON public.points_transactions
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = user_id);

-- Service role policy for points_transactions
CREATE POLICY "Service role can manage all points transactions" ON public.points_transactions
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- STEP 5: VERIFY UPDATED PERMISSIONS
-- ============================================================================

SELECT 'UPDATED TABLE PERMISSIONS FOR USER_WALLETS:' as info;
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'user_wallets' 
AND table_schema = 'public'
ORDER BY grantee, privilege_type;

SELECT 'UPDATED TABLE PERMISSIONS FOR POINTS_TRANSACTIONS:' as info;
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'points_transactions' 
AND table_schema = 'public'
ORDER BY grantee, privilege_type;

-- ============================================================================
-- STEP 6: SUCCESS MESSAGE
-- ============================================================================

SELECT 'SUCCESS: Admin wallet permissions fixed!' as result;
SELECT 'Admin users can now update wallet data for collection approval' as message;
SELECT 'Collection approval should now work without permission errors' as status;
