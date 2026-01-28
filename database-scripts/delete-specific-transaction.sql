-- ============================================================================
-- DELETE SPECIFIC TRANSACTION
-- ============================================================================
-- Delete transaction f7a3ac9e-a0d8-4176-ab5b-124c3f1c09cc and related records

-- Step 1: Check if the transaction exists
SELECT '=== CHECKING TRANSACTION ===' as step;
SELECT 
    id,
    user_id,
    amount,
    points,
    source_id,
    created_at
FROM wallet_transactions 
WHERE id = 'f7a3ac9e-a0d8-4176-ab5b-124c3f1c09cc';

-- Step 2: Check related collection records
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
    SELECT source_id 
    FROM wallet_transactions 
    WHERE id = 'f7a3ac9e-a0d8-4176-ab5b-124c3f1c09cc'
    AND source_id IS NOT NULL
);

-- Check collections
SELECT 
    id,
    total_value,
    status,
    created_at
FROM collections 
WHERE id IN (
    SELECT source_id 
    FROM wallet_transactions 
    WHERE id = 'f7a3ac9e-a0d8-4176-ab5b-124c3f1c09cc'
    AND source_id IS NOT NULL
);

-- Step 3: Check related records
SELECT '=== CHECKING RELATED RECORDS ===' as step;

-- Check collection_photos
SELECT 
    id,
    collection_id,
    photo_url
FROM collection_photos 
WHERE collection_id IN (
    SELECT source_id 
    FROM wallet_transactions 
    WHERE id = 'f7a3ac9e-a0d8-4176-ab5b-124c3f1c09cc'
    AND source_id IS NOT NULL
);

-- Check collection_materials
SELECT 
    id,
    collection_id,
    material_type
FROM collection_materials 
WHERE collection_id IN (
    SELECT source_id 
    FROM wallet_transactions 
    WHERE id = 'f7a3ac9e-a0d8-4176-ab5b-124c3f1c09cc'
    AND source_id IS NOT NULL
);

-- Check wallet_update_queue
SELECT 
    id,
    collection_id,
    status
FROM wallet_update_queue 
WHERE collection_id IN (
    SELECT source_id 
    FROM wallet_transactions 
    WHERE id = 'f7a3ac9e-a0d8-4176-ab5b-124c3f1c09cc'
    AND source_id IS NOT NULL
);

-- Step 4: DELETE THE TRANSACTION AND RELATED RECORDS
SELECT '=== DELETING TRANSACTION AND RELATED RECORDS ===' as step;

-- Get the source_id before deletion
DO $$
DECLARE
    source_id_to_delete UUID;
BEGIN
    -- Get the source_id
    SELECT source_id INTO source_id_to_delete
    FROM wallet_transactions 
    WHERE id = 'f7a3ac9e-a0d8-4176-ab5b-124c3f1c09cc';
    
    -- Delete related records first
    IF source_id_to_delete IS NOT NULL THEN
        -- Delete collection_photos
        DELETE FROM collection_photos WHERE collection_id = source_id_to_delete;
        RAISE NOTICE 'Deleted collection_photos for collection %', source_id_to_delete;
        
        -- Delete collection_materials
        DELETE FROM collection_materials WHERE collection_id = source_id_to_delete;
        RAISE NOTICE 'Deleted collection_materials for collection %', source_id_to_delete;
        
        -- Delete wallet_update_queue entries
        DELETE FROM wallet_update_queue WHERE collection_id = source_id_to_delete;
        RAISE NOTICE 'Deleted wallet_update_queue entries for collection %', source_id_to_delete;
        
        -- Delete from unified_collections
        DELETE FROM unified_collections WHERE id = source_id_to_delete;
        RAISE NOTICE 'Deleted unified_collection %', source_id_to_delete;
        
        -- Delete from collections
        DELETE FROM collections WHERE id = source_id_to_delete;
        RAISE NOTICE 'Deleted collection %', source_id_to_delete;
    END IF;
    
    -- Delete the wallet transaction
    DELETE FROM wallet_transactions WHERE id = 'f7a3ac9e-a0d8-4176-ab5b-124c3f1c09cc';
    RAISE NOTICE 'Deleted wallet_transaction f7a3ac9e-a0d8-4176-ab5b-124c3f1c09cc';
    
END $$;

-- Step 5: Verify deletion
SELECT '=== VERIFICATION ===' as step;

-- Check if transaction still exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM wallet_transactions WHERE id = 'f7a3ac9e-a0d8-4176-ab5b-124c3f1c09cc')
        THEN 'TRANSACTION STILL EXISTS'
        ELSE 'TRANSACTION DELETED'
    END as transaction_status;

-- Check if related collections still exist
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM unified_collections 
            WHERE id IN (
                SELECT source_id 
                FROM wallet_transactions 
                WHERE id = 'f7a3ac9e-a0d8-4176-ab5b-124c3f1c09cc'
                AND source_id IS NOT NULL
            )
        )
        THEN 'RELATED COLLECTIONS STILL EXIST'
        ELSE 'RELATED COLLECTIONS DELETED'
    END as collections_status;

SELECT 'DELETION COMPLETED' as status;
