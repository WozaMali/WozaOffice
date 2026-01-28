-- ============================================================================
-- DELETE SPECIFIC 5 TRANSACTIONS (FIXED)
-- ============================================================================
-- Delete these 5 specific transactions and their related collection records

-- Transaction IDs to delete
-- f7a3ac9e-a0d8-4176-ab5b-124c3f1c09cc
-- 2d73a100-cadc-48b4-8ad1-58993a34a624
-- 217e3c1a-12dc-49d8-82a6-f11523f051fc
-- 15cf26a0-01cc-42ee-8500-e55d2221b4a6
-- 17a60a7c-d4bb-4720-b778-374573d624d5

-- Step 1: Check which transactions exist
SELECT '=== CHECKING TRANSACTIONS ===' as step;
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

-- Step 2: Get source_ids for related collections
SELECT '=== GETTING SOURCE IDS ===' as step;
SELECT DISTINCT source_id
FROM wallet_transactions 
WHERE id IN (
    'f7a3ac9e-a0d8-4176-ab5b-124c3f1c09cc',
    '2d73a100-cadc-48b4-8ad1-58993a34a624',
    '217e3c1a-12dc-49d8-82a6-f11523f051fc',
    '15cf26a0-01cc-42ee-8500-e55d2221b4a6',
    '17a60a7c-d4bb-4720-b778-374573d624d5'
)
AND source_id IS NOT NULL;

-- Step 3: Check related collections (using safe column names)
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

-- Check collections (using basic columns that should exist)
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

-- Step 4: DELETE THE TRANSACTIONS AND RELATED RECORDS
SELECT '=== DELETING TRANSACTIONS AND RELATED RECORDS ===' as step;

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
        'f7a3ac9e-a0d8-4176-ab5b-124c3f1c09cc',
        '2d73a100-cadc-48b4-8ad1-58993a34a624',
        '217e3c1a-12dc-49d8-82a6-f11523f051fc',
        '15cf26a0-01cc-42ee-8500-e55d2221b4a6',
        '17a60a7c-d4bb-4720-b778-374573d624d5'
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
    
    -- Delete the 5 specific wallet transactions
    DELETE FROM wallet_transactions 
    WHERE id IN (
        'f7a3ac9e-a0d8-4176-ab5b-124c3f1c09cc',
        '2d73a100-cadc-48b4-8ad1-58993a34a624',
        '217e3c1a-12dc-49d8-82a6-f11523f051fc',
        '15cf26a0-01cc-42ee-8500-e55d2221b4a6',
        '17a60a7c-d4bb-4720-b778-374573d624d5'
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % wallet transactions', deleted_count;
    
END $$;

-- Step 5: Verify deletion
SELECT '=== VERIFICATION ===' as step;

-- Check if any of the 5 transactions still exist
SELECT 
    COUNT(*) as remaining_transactions,
    'TRANSACTIONS REMAINING' as status
FROM wallet_transactions 
WHERE id IN (
    'f7a3ac9e-a0d8-4176-ab5b-124c3f1c09cc',
    '2d73a100-cadc-48b4-8ad1-58993a34a624',
    '217e3c1a-12dc-49d8-82a6-f11523f051fc',
    '15cf26a0-01cc-42ee-8500-e55d2221b4a6',
    '17a60a7c-d4bb-4720-b778-374573d624d5'
);

-- Check if related collections still exist
SELECT 
    COUNT(*) as remaining_collections,
    'COLLECTIONS REMAINING' as status
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

SELECT 'DELETION OF 5 SPECIFIC TRANSACTIONS COMPLETED' as status;
