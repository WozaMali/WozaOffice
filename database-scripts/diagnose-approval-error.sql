-- ============================================================================
-- DIAGNOSE APPROVAL ERROR
-- ============================================================================
-- This script diagnoses what's preventing pickup approval

-- ============================================================================
-- STEP 1: CHECK ADMIN USER PERMISSIONS
-- ============================================================================

SELECT 'ADMIN USER CHECK:' as info;
SELECT 
    id,
    email,
    role,
    created_at
FROM public.user_profiles 
WHERE role = 'admin'
ORDER BY created_at;

-- ============================================================================
-- STEP 2: CHECK CURRENT USER CONTEXT
-- ============================================================================

SELECT 'CURRENT USER CONTEXT:' as info;
SELECT 
    auth.uid() as current_user_id,
    auth.role() as current_user_role;

-- ============================================================================
-- STEP 3: TEST UNIFIED_COLLECTIONS UPDATE PERMISSION
-- ============================================================================

-- Test if we can update a collection (dry run)
SELECT 'TESTING UNIFIED_COLLECTIONS UPDATE:' as info;
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_privileges 
            WHERE table_name = 'unified_collections' 
            AND table_schema = 'public'
            AND grantee = 'authenticated'
            AND privilege_type = 'UPDATE'
        ) THEN 'UPDATE permission exists'
        ELSE 'UPDATE permission missing'
    END as update_permission_status;

-- ============================================================================
-- STEP 4: TEST USER_WALLETS UPDATE PERMISSION
-- ============================================================================

SELECT 'TESTING USER_WALLETS UPDATE:' as info;
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_privileges 
            WHERE table_name = 'user_wallets' 
            AND table_schema = 'public'
            AND grantee = 'authenticated'
            AND privilege_type = 'UPDATE'
        ) THEN 'UPDATE permission exists'
        ELSE 'UPDATE permission missing'
    END as wallet_update_permission_status;

-- ============================================================================
-- STEP 5: CHECK WALLET FUNCTION STATUS
-- ============================================================================

SELECT 'WALLET FUNCTION STATUS:' as info;
SELECT 
    routine_name,
    routine_type,
    data_type,
    security_type
FROM information_schema.routines 
WHERE routine_name = 'update_wallet_simple' 
AND routine_schema = 'public';

-- ============================================================================
-- STEP 6: TEST WALLET FUNCTION (DRY RUN)
-- ============================================================================

-- Test if we can call the function with a test user
SELECT 'TESTING WALLET FUNCTION:' as info;
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_name = 'update_wallet_simple' 
            AND routine_schema = 'public'
        ) THEN 'Function exists and should be callable'
        ELSE 'Function does not exist'
    END as function_status;

-- ============================================================================
-- STEP 7: CHECK PENDING PICKUPS STATUS
-- ============================================================================

SELECT 'PENDING PICKUPS STATUS:' as info;
SELECT 
    id,
    collection_code,
    customer_name,
    status,
    total_weight_kg,
    total_value,
    customer_id
FROM public.unified_collections
WHERE status = 'pending'
ORDER BY created_at DESC;

-- ============================================================================
-- STEP 8: CHECK CUSTOMER WALLETS
-- ============================================================================

SELECT 'CUSTOMER WALLETS FOR PENDING PICKUPS:' as info;
SELECT 
    uw.id as wallet_id,
    uw.user_id,
    up.full_name as customer_name,
    uw.current_points,
    uw.total_points_earned
FROM public.user_wallets uw
JOIN public.user_profiles up ON up.id = uw.user_id
WHERE uw.user_id IN (
    SELECT DISTINCT customer_id 
    FROM public.unified_collections 
    WHERE status = 'pending' 
    AND customer_id IS NOT NULL
)
ORDER BY uw.user_id;

-- ============================================================================
-- STEP 9: SUMMARY
-- ============================================================================

SELECT 'DIAGNOSTIC SUMMARY:' as info;
SELECT 
    'Admin users found' as check_item,
    COUNT(*)::text as result
FROM public.user_profiles 
WHERE role = 'admin'
UNION ALL
SELECT 
    'Pending pickups',
    COUNT(*)::text
FROM public.unified_collections
WHERE status = 'pending'
UNION ALL
SELECT 
    'Customer wallets',
    COUNT(*)::text
FROM public.user_wallets
WHERE user_id IN (
    SELECT DISTINCT customer_id 
    FROM public.unified_collections 
    WHERE status = 'pending' 
    AND customer_id IS NOT NULL
);
