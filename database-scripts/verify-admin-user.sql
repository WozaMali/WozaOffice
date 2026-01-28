-- ============================================================================
-- VERIFY ADMIN USER PERMISSIONS
-- ============================================================================
-- This script checks if the admin user has the correct role and permissions

-- ============================================================================
-- STEP 1: CHECK ADMIN USER ROLE
-- ============================================================================

SELECT 'ADMIN USER ROLE CHECK:' as info;
SELECT 
    id,
    email,
    role,
    is_active,
    created_at
FROM public.user_profiles 
WHERE email = 'admin@wozamali.com'
OR role = 'admin';

-- ============================================================================
-- STEP 2: CHECK CURRENT USER CONTEXT
-- ============================================================================

SELECT 'CURRENT USER CONTEXT:' as info;
SELECT 
    auth.uid() as current_user_id,
    auth.role() as current_user_role;

-- ============================================================================
-- STEP 3: TEST PERMISSIONS
-- ============================================================================

-- Test if admin can read unified_collections
SELECT 'TESTING UNIFIED_COLLECTIONS READ ACCESS:' as info;
SELECT COUNT(*) as collection_count
FROM public.unified_collections
LIMIT 1;

-- Test if admin can read user_wallets
SELECT 'TESTING USER_WALLETS READ ACCESS:' as info;
SELECT COUNT(*) as wallet_count
FROM public.user_wallets
LIMIT 1;

-- ============================================================================
-- STEP 4: SUCCESS MESSAGE
-- ============================================================================

SELECT 'VERIFICATION COMPLETE!' as result;
SELECT 'If you see counts above, admin permissions are working' as message;
