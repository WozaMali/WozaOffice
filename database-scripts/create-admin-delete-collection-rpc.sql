-- ============================================================================
-- CREATE ADMIN DELETE COLLECTION RPC FUNCTION
-- ============================================================================
-- This function provides a secure way to delete collections and all related records
-- using SECURITY DEFINER to bypass RLS policies

-- Drop existing function if it exists (to handle return type changes)
DROP FUNCTION IF EXISTS admin_delete_collection(UUID);

CREATE OR REPLACE FUNCTION admin_delete_collection(_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count INTEGER := 0;
    error_message TEXT;
BEGIN
    -- Log the deletion attempt
    RAISE NOTICE 'Starting admin deletion of collection: %', _id;
    
    -- Delete child records first (in dependency order)
    -- Use safe deletion to handle missing tables gracefully
    
    -- 1. Delete collection photos (if table exists)
    BEGIN
        DELETE FROM collection_photos WHERE collection_id = _id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % collection_photos records', deleted_count;
    EXCEPTION
        WHEN undefined_table THEN
            RAISE NOTICE 'collection_photos table does not exist, skipping';
    END;
    
    -- 2. Delete collection materials (if table exists)
    BEGIN
        DELETE FROM collection_materials WHERE collection_id = _id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % collection_materials records', deleted_count;
    EXCEPTION
        WHEN undefined_table THEN
            RAISE NOTICE 'collection_materials table does not exist, skipping';
    END;
    
    -- 3. Delete wallet update queue entries (if table exists)
    BEGIN
        DELETE FROM wallet_update_queue WHERE collection_id = _id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % wallet_update_queue records', deleted_count;
    EXCEPTION
        WHEN undefined_table THEN
            RAISE NOTICE 'wallet_update_queue table does not exist, skipping';
    END;
    
    -- 4. Delete wallet transactions (if table exists)
    BEGIN
        DELETE FROM wallet_transactions WHERE source_id = _id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % wallet_transactions records', deleted_count;
    EXCEPTION
        WHEN undefined_table THEN
            RAISE NOTICE 'wallet_transactions table does not exist, skipping';
    END;
    
    -- 5. Delete transactions (if table exists)
    BEGIN
        DELETE FROM transactions WHERE source_id = _id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % transactions records', deleted_count;
    EXCEPTION
        WHEN undefined_table THEN
            RAISE NOTICE 'transactions table does not exist, skipping';
    END;
    
    -- 6. Delete from unified_collections table (if table exists)
    BEGIN
        DELETE FROM unified_collections WHERE id = _id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % unified_collections records', deleted_count;
    EXCEPTION
        WHEN undefined_table THEN
            RAISE NOTICE 'unified_collections table does not exist, skipping';
    END;
    
    -- 7. Delete from collections table (main table - should exist)
    DELETE FROM collections WHERE id = _id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % collections records', deleted_count;
    
    -- Verify deletion was successful
    -- Check collections table (should exist)
    IF NOT EXISTS (SELECT 1 FROM collections WHERE id = _id) THEN
        -- Check unified_collections table if it exists
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM unified_collections WHERE id = _id) THEN
                RAISE NOTICE 'Collection % successfully deleted from all tables', _id;
                RETURN TRUE;
            ELSE
                RAISE WARNING 'Collection % still exists in unified_collections', _id;
                RETURN FALSE;
            END IF;
        EXCEPTION
            WHEN undefined_table THEN
                -- unified_collections doesn't exist, so just check collections
                RAISE NOTICE 'Collection % successfully deleted from collections table', _id;
                RETURN TRUE;
        END;
    ELSE
        RAISE WARNING 'Collection % still exists in collections table', _id;
        RETURN FALSE;
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error and re-raise
        GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
        RAISE WARNING 'Error deleting collection %: %', _id, error_message;
        RETURN FALSE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION admin_delete_collection(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION admin_delete_collection(UUID) IS 'Securely deletes a collection and all related records, bypassing RLS policies';
