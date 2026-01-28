-- ============================================================================
-- DELETE REMAINING 5 TRANSACTIONS
-- ============================================================================
-- Delete the remaining 5 transactions from the database

-- Transaction IDs to delete (from your latest query results)
-- 3352f238-a977-4124-be20-3af88837fe1f
-- 26306e40-91e6-42b0-b5bf-ee9245173b0f
-- 496a1a26-b0b4-4739-8919-0ecc48f873f0
-- 5d9faa33-c4d1-40e0-a9d4-8fa8f92dd1b4
-- 7c335b47-ce58-4988-bd20-1ce54990df5e

-- Step 1: Check which transactions exist
SELECT '=== CHECKING REMAINING TRANSACTIONS ===' as step;
SELECT 
    id,
    user_id,
    amount,
    points,
    source_id,
    created_at
FROM wallet_transactions 
WHERE id IN (
    '3352f238-a977-4124-be20-3af88837fe1f',
    '26306e40-91e6-42b0-b5bf-ee9245173b0f',
    '496a1a26-b0b4-4739-8919-0ecc48f873f0',
    '5d9faa33-c4d1-40e0-a9d4-8fa8f92dd1b4',
    '7c335b47-ce58-4988-bd20-1ce54990df5e'
)
ORDER BY created_at DESC;

-- Step 2: Get source_ids for related collections
SELECT '=== GETTING SOURCE IDS ===' as step;
SELECT DISTINCT source_id
FROM wallet_transactions 
WHERE id IN (
    '3352f238-a977-4124-be20-3af88837fe1f',
    '26306e40-91e6-42b0-b5bf-ee9245173b0f',
    '496a1a26-b0b4-4739-8919-0ecc48f873f0',
    '5d9faa33-c4d1-40e0-a9d4-8fa8f92dd1b4',
    '7c335b47-ce58-4988-bd20-1ce54990df5e'
)
AND source_id IS NOT NULL;

-- Step 3: Check related collections
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
        '3352f238-a977-4124-be20-3af88837fe1f',
        '26306e40-91e6-42b0-b5bf-ee9245173b0f',
        '496a1a26-b0b4-4739-8919-0ecc48f873f0',
        '5d9faa33-c4d1-40e0-a9d4-8fa8f92dd1b4',
        '7c335b47-ce58-4988-bd20-1ce54990df5e'
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
        '3352f238-a977-4124-be20-3af88837fe1f',
        '26306e40-91e6-42b0-b5bf-ee9245173b0f',
        '496a1a26-b0b4-4739-8919-0ecc48f873f0',
        '5d9faa33-c4d1-40e0-a9d4-8fa8f92dd1b4',
        '7c335b47-ce58-4988-bd20-1ce54990df5e'
    )
    AND source_id IS NOT NULL
);

-- Step 4: DELETE THE REMAINING TRANSACTIONS AND RELATED RECORDS
SELECT '=== DELETING REMAINING TRANSACTIONS AND RELATED RECORDS ===' as step;

DO $$
DECLARE
    source_ids_to_delete UUID[];
    current_source_id UUID;
    deleted_count INTEGER := 0;
BEGIN
    -- Get all source_ids for the transactions to delete
    SELECT ARRAY_AGG(DISTINCT wt.source_id) INTO source_ids_to_delete
    FROM wallet_transactions wt
    WHERE wt.id IN (
        '3352f238-a977-4124-be20-3af88837fe1f',
        '26306e40-91e6-42b0-b5bf-ee9245173b0f',
        '496a1a26-b0b4-4739-8919-0ecc48f873f0',
        '5d9faa33-c4d1-40e0-a9d4-8fa8f92dd1b4',
        '7c335b47-ce58-4988-bd20-1ce54990df5e'
    )
    AND wt.source_id IS NOT NULL;
    
    RAISE NOTICE 'Found % source_ids to delete', COALESCE(array_length(source_ids_to_delete, 1), 0);
    
    -- Delete related records for each source_id
    IF source_ids_to_delete IS NOT NULL THEN
        FOREACH current_source_id IN ARRAY source_ids_to_delete
        LOOP
            RAISE NOTICE 'Deleting records for source_id: %', current_source_id;
            
            -- Delete collection_photos
            DELETE FROM collection_photos WHERE collection_id = current_source_id;
            GET DIAGNOSTICS deleted_count = ROW_COUNT;
            RAISE NOTICE 'Deleted % collection_photos for %', deleted_count, current_source_id;
            
            -- Delete collection_materials
            DELETE FROM collection_materials WHERE collection_id = current_source_id;
            GET DIAGNOSTICS deleted_count = ROW_COUNT;
            RAISE NOTICE 'Deleted % collection_materials for %', deleted_count, current_source_id;
            
            -- Delete wallet_update_queue entries
            DELETE FROM wallet_update_queue WHERE collection_id = current_source_id;
            GET DIAGNOSTICS deleted_count = ROW_COUNT;
            RAISE NOTICE 'Deleted % wallet_update_queue entries for %', deleted_count, current_source_id;
            
            -- Delete from unified_collections
            DELETE FROM unified_collections WHERE id = current_source_id;
            GET DIAGNOSTICS deleted_count = ROW_COUNT;
            RAISE NOTICE 'Deleted % unified_collection %', deleted_count, current_source_id;
            
            -- Delete from collections
            DELETE FROM collections WHERE id = current_source_id;
            GET DIAGNOSTICS deleted_count = ROW_COUNT;
            RAISE NOTICE 'Deleted % collection %', deleted_count, current_source_id;
        END LOOP;
    END IF;
    
    -- Delete the 5 remaining wallet transactions
    DELETE FROM wallet_transactions 
    WHERE id IN (
        '3352f238-a977-4124-be20-3af88837fe1f',
        '26306e40-91e6-42b0-b5bf-ee9245173b0f',
        '496a1a26-b0b4-4739-8919-0ecc48f873f0',
        '5d9faa33-c4d1-40e0-a9d4-8fa8f92dd1b4',
        '7c335b47-ce58-4988-bd20-1ce54990df5e'
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % wallet transactions', deleted_count;
    
END $$;

-- Step 5: Verify deletion
SELECT '=== VERIFICATION ===' as step;

-- Check if any of the 5 remaining transactions still exist
SELECT 
    COUNT(*) as remaining_count,
    'REMAINING TRANSACTIONS REMAINING' as status
FROM wallet_transactions 
WHERE id IN (
    '3352f238-a977-4124-be20-3af88837fe1f',
    '26306e40-91e6-42b0-b5bf-ee9245173b0f',
    '496a1a26-b0b4-4739-8919-0ecc48f873f0',
    '5d9faa33-c4d1-40e0-a9d4-8fa8f92dd1b4',
    '7c335b47-ce58-4988-bd20-1ce54990df5e'
);

-- Show remaining transactions
SELECT '=== REMAINING TRANSACTIONS ===' as step;
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

-- Show total count
SELECT 
    COUNT(*) as total_remaining_transactions,
    'TOTAL TRANSACTIONS REMAINING' as status
FROM wallet_transactions;

SELECT 'DELETION OF REMAINING 5 TRANSACTIONS COMPLETED' as status;
