-- ============================================================================
-- DELETE ACTUAL TRANSACTIONS FROM DATABASE
-- ============================================================================
-- Delete the transactions that are actually showing in the database

-- Transaction IDs that are actually in the database (from your query results)
-- 882a1370-0862-417b-bb3a-e4d37a635d18
-- fc8a47a9-568f-4b29-b8d3-5ba3b70db49b
-- afc7b2d7-76bd-4a36-9108-7a6a7e12fac7
-- eaff5483-c92b-4f37-a311-b885404b7da4
-- 7a196487-4a26-4eb3-80ef-ff584c083fa8

-- Step 1: Check which transactions exist
SELECT '=== CHECKING ACTUAL TRANSACTIONS ===' as step;
SELECT 
    id,
    user_id,
    amount,
    points,
    source_id,
    created_at
FROM wallet_transactions 
WHERE id IN (
    '882a1370-0862-417b-bb3a-e4d37a635d18',
    'fc8a47a9-568f-4b29-b8d3-5ba3b70db49b',
    'afc7b2d7-76bd-4a36-9108-7a6a7e12fac7',
    'eaff5483-c92b-4f37-a311-b885404b7da4',
    '7a196487-4a26-4eb3-80ef-ff584c083fa8'
)
ORDER BY created_at DESC;

-- Step 2: Get source_ids for related collections
SELECT '=== GETTING SOURCE IDS ===' as step;
SELECT DISTINCT source_id
FROM wallet_transactions 
WHERE id IN (
    '882a1370-0862-417b-bb3a-e4d37a635d18',
    'fc8a47a9-568f-4b29-b8d3-5ba3b70db49b',
    'afc7b2d7-76bd-4a36-9108-7a6a7e12fac7',
    'eaff5483-c92b-4f37-a311-b885404b7da4',
    '7a196487-4a26-4eb3-80ef-ff584c083fa8'
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
        '882a1370-0862-417b-bb3a-e4d37a635d18',
        'fc8a47a9-568f-4b29-b8d3-5ba3b70db49b',
        'afc7b2d7-76bd-4a36-9108-7a6a7e12fac7',
        'eaff5483-c92b-4f37-a311-b885404b7da4',
        '7a196487-4a26-4eb3-80ef-ff584c083fa8'
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
        '882a1370-0862-417b-bb3a-e4d37a635d18',
        'fc8a47a9-568f-4b29-b8d3-5ba3b70db49b',
        'afc7b2d7-76bd-4a36-9108-7a6a7e12fac7',
        'eaff5483-c92b-4f37-a311-b885404b7da4',
        '7a196487-4a26-4eb3-80ef-ff584c083fa8'
    )
    AND source_id IS NOT NULL
);

-- Step 4: DELETE THE ACTUAL TRANSACTIONS AND RELATED RECORDS
SELECT '=== DELETING ACTUAL TRANSACTIONS AND RELATED RECORDS ===' as step;

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
        '882a1370-0862-417b-bb3a-e4d37a635d18',
        'fc8a47a9-568f-4b29-b8d3-5ba3b70db49b',
        'afc7b2d7-76bd-4a36-9108-7a6a7e12fac7',
        'eaff5483-c92b-4f37-a311-b885404b7da4',
        '7a196487-4a26-4eb3-80ef-ff584c083fa8'
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
    
    -- Delete the 5 actual wallet transactions
    DELETE FROM wallet_transactions 
    WHERE id IN (
        '882a1370-0862-417b-bb3a-e4d37a635d18',
        'fc8a47a9-568f-4b29-b8d3-5ba3b70db49b',
        'afc7b2d7-76bd-4a36-9108-7a6a7e12fac7',
        'eaff5483-c92b-4f37-a311-b885404b7da4',
        '7a196487-4a26-4eb3-80ef-ff584c083fa8'
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % wallet transactions', deleted_count;
    
END $$;

-- Step 5: Verify deletion
SELECT '=== VERIFICATION ===' as step;

-- Check if any of the 5 actual transactions still exist
SELECT 
    COUNT(*) as remaining_count,
    'ACTUAL TRANSACTIONS REMAINING' as status
FROM wallet_transactions 
WHERE id IN (
    '882a1370-0862-417b-bb3a-e4d37a635d18',
    'fc8a47a9-568f-4b29-b8d3-5ba3b70db49b',
    'afc7b2d7-76bd-4a36-9108-7a6a7e12fac7',
    'eaff5483-c92b-4f37-a311-b885404b7da4',
    '7a196487-4a26-4eb3-80ef-ff584c083fa8'
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

SELECT 'DELETION OF ACTUAL TRANSACTIONS COMPLETED' as status;
