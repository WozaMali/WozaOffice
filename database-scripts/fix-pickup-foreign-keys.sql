-- ============================================================================
-- FIX PICKUP TABLE FOREIGN KEY CONSTRAINTS
-- ============================================================================
-- Update the pickup table to use the new user_addresses table instead of addresses

-- Step 1: Check current constraints
SELECT 
    'Current Constraints' as step,
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
AND tc.table_name = 'pickups'
AND tc.table_schema = 'public';

-- Step 2: Drop the old foreign key constraint
ALTER TABLE public.pickups DROP CONSTRAINT IF EXISTS pickups_address_id_fkey;

-- Step 3: Add new foreign key constraint to user_addresses table
ALTER TABLE public.pickups 
ADD CONSTRAINT pickups_address_id_fkey 
FOREIGN KEY (address_id) REFERENCES public.user_addresses(id) ON DELETE SET NULL;

-- Step 4: Verify the new constraint
SELECT 
    'New Constraints' as step,
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
AND tc.table_name = 'pickups'
AND tc.table_schema = 'public';

-- Step 5: Test the constraint by checking if we can reference user_addresses
SELECT 
    'Constraint Test' as step,
    COUNT(*) as total_user_addresses,
    COUNT(*) FILTER (WHERE is_active = true) as active_addresses
FROM public.user_addresses;
