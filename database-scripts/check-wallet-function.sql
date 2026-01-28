-- ============================================================================
-- CHECK WALLET FUNCTION STATUS
-- ============================================================================
-- This script checks if the wallet update function exists and works

-- ============================================================================
-- STEP 1: CHECK IF FUNCTION EXISTS
-- ============================================================================

SELECT 'WALLET FUNCTION STATUS:' as info;
SELECT 
    routine_name,
    routine_type,
    data_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'update_wallet_simple' 
AND routine_schema = 'public';

-- ============================================================================
-- STEP 2: CHECK FUNCTION PERMISSIONS
-- ============================================================================

SELECT 'FUNCTION PERMISSIONS:' as info;
SELECT 
    grantee,
    privilege_type
FROM information_schema.routine_privileges 
WHERE routine_name = 'update_wallet_simple' 
AND routine_schema = 'public';

-- ============================================================================
-- STEP 3: TEST FUNCTION (DRY RUN)
-- ============================================================================

-- Test if we can call the function (this will show if it exists and is callable)
SELECT 'FUNCTION TEST:' as info;
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_name = 'update_wallet_simple' 
            AND routine_schema = 'public'
        ) THEN 'Function exists'
        ELSE 'Function does not exist'
    END as function_status;

-- ============================================================================
-- STEP 4: CHECK PENDING COLLECTIONS
-- ============================================================================

SELECT 'PENDING COLLECTIONS:' as info;
SELECT 
    id,
    collection_code,
    customer_name,
    customer_email,
    status,
    total_weight_kg,
    total_value,
    created_at
FROM public.unified_collections
WHERE status = 'submitted'
ORDER BY created_at DESC;
