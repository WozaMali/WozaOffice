-- ============================================================================
-- TEST MANUAL APPROVAL
-- ============================================================================
-- This script tests manual approval of one pickup to identify the exact error

-- ============================================================================
-- STEP 1: SELECT ONE PENDING PICKUP TO TEST
-- ============================================================================

SELECT 'TESTING PICKUP:' as info;
SELECT 
    id,
    collection_code,
    customer_name,
    customer_email,
    status,
    total_weight_kg,
    total_value,
    customer_id
FROM public.unified_collections
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 1;

-- ============================================================================
-- STEP 2: TEST COLLECTION STATUS UPDATE (DRY RUN)
-- ============================================================================

-- Test updating the collection status
SELECT 'TESTING COLLECTION UPDATE:' as info;
SELECT 
    'This would update collection status to approved' as test_action,
    id as collection_id,
    collection_code,
    customer_name
FROM public.unified_collections
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 1;

-- ============================================================================
-- STEP 3: TEST WALLET FUNCTION CALL
-- ============================================================================

-- Test calling the wallet function with the first pending pickup
SELECT 'TESTING WALLET FUNCTION CALL:' as info;
SELECT 
    public.update_wallet_simple(
        (SELECT customer_id FROM public.unified_collections WHERE status = 'pending' ORDER BY created_at DESC LIMIT 1),
        (SELECT total_value FROM public.unified_collections WHERE status = 'pending' ORDER BY created_at DESC LIMIT 1),
        'collection_approval',
        (SELECT total_weight_kg FROM public.unified_collections WHERE status = 'pending' ORDER BY created_at DESC LIMIT 1),
        'Test approval - manual test',
        (SELECT id FROM public.unified_collections WHERE status = 'pending' ORDER BY created_at DESC LIMIT 1)
    ) as wallet_update_result;

-- ============================================================================
-- STEP 4: CHECK FOR ERRORS
-- ============================================================================

SELECT 'ERROR CHECK:' as info;
SELECT 
    CASE 
        WHEN (SELECT total_value FROM public.unified_collections WHERE status = 'pending' ORDER BY created_at DESC LIMIT 1) = 0 
        THEN 'WARNING: Total value is 0 - this might cause wallet update to fail'
        ELSE 'Total value looks good'
    END as value_check;

-- ============================================================================
-- STEP 5: MANUAL APPROVAL (ACTUAL UPDATE)
-- ============================================================================

-- Actually update the first pending pickup to approved
UPDATE public.unified_collections 
SET 
    status = 'approved',
    admin_notes = 'Manually approved for testing',
    updated_at = NOW(),
    updated_by = auth.uid()
WHERE id = (
    SELECT id FROM public.unified_collections 
    WHERE status = 'pending' 
    ORDER BY created_at DESC 
    LIMIT 1
);

-- ============================================================================
-- STEP 6: VERIFY UPDATE
-- ============================================================================

SELECT 'UPDATED PICKUP:' as info;
SELECT 
    id,
    collection_code,
    customer_name,
    status,
    total_weight_kg,
    total_value,
    updated_at,
    admin_notes
FROM public.unified_collections
WHERE id = (
    SELECT id FROM public.unified_collections 
    WHERE status = 'approved' 
    ORDER BY updated_at DESC 
    LIMIT 1
);

-- ============================================================================
-- STEP 7: SUCCESS MESSAGE
-- ============================================================================

SELECT 'MANUAL APPROVAL TEST COMPLETE!' as result;
SELECT 'Check if the pickup was successfully approved' as message;
SELECT 'If this worked, the issue is in the frontend code' as status;
