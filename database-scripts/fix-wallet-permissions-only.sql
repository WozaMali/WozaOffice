-- ============================================================================
-- FIX WALLET PERMISSIONS ONLY
-- ============================================================================
-- This script fixes only the wallet permissions without affecting collections

-- ============================================================================
-- STEP 1: CHECK CURRENT WALLET PERMISSIONS
-- ============================================================================

SELECT 'CURRENT USER_WALLETS PERMISSIONS:' as info;
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'user_wallets' 
AND table_schema = 'public'
ORDER BY grantee, privilege_type;

-- ============================================================================
-- STEP 2: GRANT WALLET PERMISSIONS
-- ============================================================================

-- Grant UPDATE permission to authenticated users
GRANT UPDATE ON public.user_wallets TO authenticated;

-- Grant UPDATE permission to service_role
GRANT UPDATE ON public.user_wallets TO service_role;

-- ============================================================================
-- STEP 3: CREATE WALLET UPDATE POLICY
-- ============================================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Admin can update all wallets" ON public.user_wallets;

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

-- ============================================================================
-- STEP 4: GRANT POINTS_TRANSACTIONS PERMISSIONS
-- ============================================================================

-- Grant permissions on points_transactions table
GRANT SELECT, INSERT, UPDATE ON public.points_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.points_transactions TO service_role;

-- Create policy for points_transactions
DROP POLICY IF EXISTS "Admin can manage all points transactions" ON public.points_transactions;

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

-- ============================================================================
-- STEP 5: VERIFY UPDATED PERMISSIONS
-- ============================================================================

SELECT 'UPDATED USER_WALLETS PERMISSIONS:' as info;
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'user_wallets' 
AND table_schema = 'public'
ORDER BY grantee, privilege_type;

-- ============================================================================
-- STEP 6: SUCCESS MESSAGE
-- ============================================================================

SELECT 'SUCCESS: Wallet permissions fixed!' as result;
SELECT 'Admin can now update wallets when approving collections' as message;
SELECT 'Try approving the 2 pending pickups now' as status;
