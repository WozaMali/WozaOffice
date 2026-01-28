-- ============================================================================
-- FIX PICKUP ADDRESS SCHEMA INTEGRATION
-- ============================================================================
-- Complete fix for pickup table to work with the new user_addresses schema

-- Step 1: Check current pickup table structure
SELECT 
    'Current Pickup Table Structure' as step,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'pickups' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Check current foreign key constraints
SELECT 
    'Current Foreign Key Constraints' as step,
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

-- Step 3: Drop the old foreign key constraint
ALTER TABLE public.pickups DROP CONSTRAINT IF EXISTS pickups_address_id_fkey;

-- Step 4: Add new foreign key constraint to user_addresses table
ALTER TABLE public.pickups 
ADD CONSTRAINT pickups_address_id_fkey 
FOREIGN KEY (address_id) REFERENCES public.user_addresses(id) ON DELETE SET NULL;

-- Step 5: Check if we need to update any existing pickup records
-- (This would only be needed if there are existing pickups with old address IDs)
SELECT 
    'Existing Pickup Records Check' as step,
    COUNT(*) as total_pickups,
    COUNT(*) FILTER (WHERE address_id IS NOT NULL) as pickups_with_addresses
FROM public.pickups;

-- Step 6: Verify the new constraint works
SELECT 
    'New Constraint Verification' as step,
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

-- Step 7: Test that we can reference user_addresses
SELECT 
    'User Addresses Reference Test' as step,
    COUNT(*) as total_user_addresses,
    COUNT(*) FILTER (WHERE is_active = true) as active_addresses,
    COUNT(*) FILTER (WHERE address_type = 'primary') as primary_addresses
FROM public.user_addresses;

-- Step 8: Show sample data for testing
SELECT 
    'Sample Data for Testing' as step,
    ua.id as address_id,
    ua.user_id as member_id,
    p.full_name as member_name,
    ua.address_type,
    ua.address_line1,
    ua.city
FROM public.user_addresses ua
LEFT JOIN public.profiles p ON ua.user_id = p.id
WHERE p.role = 'member'
LIMIT 3;
