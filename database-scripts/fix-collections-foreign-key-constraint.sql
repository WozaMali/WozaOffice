-- ============================================================================
-- FIX COLLECTIONS TABLE FOREIGN KEY CONSTRAINT
-- ============================================================================
-- This script fixes the foreign key constraint on the collections table
-- since that's where the data actually exists

-- Step 1: Check current foreign key constraints on collections table
SELECT 
    'Current Collections Foreign Key Constraints' as step,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'collections'
AND tc.table_schema = 'public';

-- Step 2: Check if collections table has pickup_address_id column
SELECT 
    'Collections Table Columns' as step,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'collections' 
AND table_schema = 'public'
AND column_name LIKE '%address%'
ORDER BY ordinal_position;

-- Step 3: Drop any existing foreign key constraint on collections.pickup_address_id
ALTER TABLE public.collections DROP CONSTRAINT IF EXISTS collections_pickup_address_id_fkey;

-- Step 4: Add foreign key constraint to user_addresses table
ALTER TABLE public.collections 
ADD CONSTRAINT collections_pickup_address_id_fkey 
FOREIGN KEY (pickup_address_id) REFERENCES public.user_addresses(id) ON DELETE SET NULL;

-- Step 5: Verify the new constraint was created
SELECT 
    'New Collections Constraint Verification' as step,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'collections'
AND tc.table_schema = 'public';

-- Step 6: Test that we can reference user_addresses from collections
SELECT 
    'Collections to User Addresses Test' as step,
    COUNT(*) as total_collections,
    COUNT(*) FILTER (WHERE pickup_address_id IS NOT NULL) as collections_with_addresses
FROM public.collections;

-- Step 7: Show sample data for testing
SELECT 
    'Sample Collections Data' as step,
    c.id as collection_id,
    c.user_id as customer_id,
    c.pickup_address_id,
    ua.address_line1,
    ua.city
FROM public.collections c
LEFT JOIN public.user_addresses ua ON c.pickup_address_id = ua.id
LIMIT 3;
