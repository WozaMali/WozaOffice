-- ============================================================================
-- COMPREHENSIVE ADMIN PERMISSIONS FIX
-- ============================================================================
-- This script fixes all permission issues for admin users to manage collections
-- and update wallet data

-- ============================================================================
-- STEP 1: CHECK CURRENT PERMISSIONS
-- ============================================================================

SELECT 'CURRENT PERMISSIONS FOR UNIFIED_COLLECTIONS:' as info;
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'unified_collections' 
AND table_schema = 'public'
ORDER BY grantee, privilege_type;

SELECT 'CURRENT PERMISSIONS FOR USER_WALLETS:' as info;
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'user_wallets' 
AND table_schema = 'public'
ORDER BY grantee, privilege_type;

-- ============================================================================
-- STEP 2: GRANT TABLE PERMISSIONS
-- ============================================================================

-- Grant permissions on unified_collections table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.unified_collections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.unified_collections TO service_role;

-- Grant permissions on user_wallets table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_wallets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_wallets TO service_role;

-- Grant permissions on points_transactions table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.points_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.points_transactions TO service_role;

-- ============================================================================
-- STEP 3: CREATE RLS POLICIES FOR UNIFIED_COLLECTIONS
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admin can manage all collections" ON public.unified_collections;
DROP POLICY IF EXISTS "Users can view their own collections" ON public.unified_collections;
DROP POLICY IF EXISTS "Service role can manage all collections" ON public.unified_collections;

-- Admin policy for unified_collections
CREATE POLICY "Admin can manage all collections" ON public.unified_collections
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

-- User policy for unified_collections (view their own)
CREATE POLICY "Users can view their own collections" ON public.unified_collections
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = customer_id);

-- Service role policy for unified_collections
CREATE POLICY "Service role can manage all collections" ON public.unified_collections
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- STEP 4: CREATE RLS POLICIES FOR USER_WALLETS
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admin can manage all wallets" ON public.user_wallets;
DROP POLICY IF EXISTS "Users can view their own wallet" ON public.user_wallets;
DROP POLICY IF EXISTS "Service role can manage all wallets" ON public.user_wallets;

-- Admin policy for user_wallets
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

-- User policy for user_wallets
CREATE POLICY "Users can view their own wallet" ON public.user_wallets
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = user_id);

-- Service role policy for user_wallets
CREATE POLICY "Service role can manage all wallets" ON public.user_wallets
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- STEP 5: CREATE RLS POLICIES FOR POINTS_TRANSACTIONS
-- ============================================================================

-- Drop existing policies
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

-- User policy for points_transactions (using wallet_id to get user_id)
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

-- Service role policy for points_transactions
CREATE POLICY "Service role can manage all points transactions" ON public.points_transactions
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- STEP 6: VERIFY UPDATED PERMISSIONS
-- ============================================================================

SELECT 'UPDATED PERMISSIONS FOR UNIFIED_COLLECTIONS:' as info;
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'unified_collections' 
AND table_schema = 'public'
ORDER BY grantee, privilege_type;

SELECT 'UPDATED PERMISSIONS FOR USER_WALLETS:' as info;
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'user_wallets' 
AND table_schema = 'public'
ORDER BY grantee, privilege_type;

SELECT 'UPDATED PERMISSIONS FOR POINTS_TRANSACTIONS:' as info;
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'points_transactions' 
AND table_schema = 'public'
ORDER BY grantee, privilege_type;

-- ============================================================================
-- STEP 7: SUCCESS MESSAGE
-- ============================================================================

SELECT 'SUCCESS: Comprehensive admin permissions fixed!' as result;
SELECT 'Admin users can now manage collections and update wallets' as message;
SELECT 'Collection approval should now work without permission errors' as status;
