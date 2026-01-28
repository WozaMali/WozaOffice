-- ============================================================================
-- CHECK TRANSACTIONS STATUS
-- ============================================================================
-- Check if the 5 specific transactions are actually deleted from the database

-- Transaction IDs to check
-- f7a3ac9e-a0d8-4176-ab5b-124c3f1c09cc
-- 2d73a100-cadc-48b4-8ad1-58993a34a624
-- 217e3c1a-12dc-49d8-82a6-f11523f051fc
-- 15cf26a0-01cc-42ee-8500-e55d2221b4a6
-- 17a60a7c-d4bb-4720-b778-374573d624d5

-- Step 1: Check if the 5 specific transactions exist in wallet_transactions
SELECT '=== CHECKING WALLET TRANSACTIONS ===' as step;
SELECT 
    id,
    user_id,
    amount,
    points,
    source_id,
    created_at
FROM wallet_transactions 
WHERE id IN (
    'f7a3ac9e-a0d8-4176-ab5b-124c3f1c09cc',
    '2d73a100-cadc-48b4-8ad1-58993a34a624',
    '217e3c1a-12dc-49d8-82a6-f11523f051fc',
    '15cf26a0-01cc-42ee-8500-e55d2221b4a6',
    '17a60a7c-d4bb-4720-b778-374573d624d5'
)
ORDER BY created_at DESC;

-- Step 2: Count how many of the 5 transactions still exist
SELECT 
    COUNT(*) as remaining_count,
    'WALLET TRANSACTIONS REMAINING' as status
FROM wallet_transactions 
WHERE id IN (
    'f7a3ac9e-a0d8-4176-ab5b-124c3f1c09cc',
    '2d73a100-cadc-48b4-8ad1-58993a34a624',
    '217e3c1a-12dc-49d8-82a6-f11523f051fc',
    '15cf26a0-01cc-42ee-8500-e55d2221b4a6',
    '17a60a7c-d4bb-4720-b778-374573d624d5'
);

-- Step 3: Check if any related collections still exist
SELECT '=== CHECKING RELATED COLLECTIONS ===' as step;

-- Check unified_collections
SELECT 
    id,
    total_value,
    computed_value,
    status,
    created_at
FROM unified_collections 
WHERE id IN (
    SELECT DISTINCT source_id
    FROM wallet_transactions 
    WHERE id IN (
        'f7a3ac9e-a0d8-4176-ab5b-124c3f1c09cc',
        '2d73a100-cadc-48b4-8ad1-58993a34a624',
        '217e3c1a-12dc-49d8-82a6-f11523f051fc',
        '15cf26a0-01cc-42ee-8500-e55d2221b4a6',
        '17a60a7c-d4bb-4720-b778-374573d624d5'
    )
    AND source_id IS NOT NULL
);

-- Check collections
SELECT 
    id,
    status,
    created_at
FROM collections 
WHERE id IN (
    SELECT DISTINCT source_id
    FROM wallet_transactions 
    WHERE id IN (
        'f7a3ac9e-a0d8-4176-ab5b-124c3f1c09cc',
        '2d73a100-cadc-48b4-8ad1-58993a34a624',
        '217e3c1a-12dc-49d8-82a6-f11523f051fc',
        '15cf26a0-01cc-42ee-8500-e55d2221b4a6',
        '17a60a7c-d4bb-4720-b778-374573d624d5'
    )
    AND source_id IS NOT NULL
);

-- Step 4: Check ALL recent transactions to see what's still there
SELECT '=== ALL RECENT WALLET TRANSACTIONS ===' as step;
SELECT 
    id,
    user_id,
    amount,
    points,
    source_id,
    created_at
FROM wallet_transactions 
ORDER BY created_at DESC
LIMIT 10;

-- Step 5: Check ALL recent collections to see what's still there
SELECT '=== ALL RECENT UNIFIED COLLECTIONS ===' as step;
SELECT 
    id,
    total_value,
    computed_value,
    status,
    created_at
FROM unified_collections 
ORDER BY created_at DESC
LIMIT 10;

-- Step 6: Check ALL recent collections table
SELECT '=== ALL RECENT COLLECTIONS ===' as step;
SELECT 
    id,
    status,
    created_at
FROM collections 
ORDER BY created_at DESC
LIMIT 10;

-- Step 7: Check if there are any transactions with similar IDs (partial matches)
SELECT '=== CHECKING FOR SIMILAR TRANSACTION IDS ===' as step;
SELECT 
    id,
    user_id,
    amount,
    points,
    source_id,
    created_at
FROM wallet_transactions 
WHERE id::text LIKE '%f7a3ac9e%'
   OR id::text LIKE '%2d73a100%'
   OR id::text LIKE '%217e3c1a%'
   OR id::text LIKE '%15cf26a0%'
   OR id::text LIKE '%17a60a7c%'
ORDER BY created_at DESC;

-- Step 8: Check total counts
SELECT '=== TOTAL COUNTS ===' as step;
SELECT 
    'wallet_transactions' as table_name,
    COUNT(*) as total_count
FROM wallet_transactions
UNION ALL
SELECT 
    'unified_collections' as table_name,
    COUNT(*) as total_count
FROM unified_collections
UNION ALL
SELECT 
    'collections' as table_name,
    COUNT(*) as total_count
FROM collections;

SELECT 'CHECK COMPLETED' as status;
