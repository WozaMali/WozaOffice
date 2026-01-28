-- ============================================================================
-- FIX PROFILES-ADDRESSES RELATIONSHIP
-- ============================================================================
-- This script fixes the missing foreign key relationship between profiles and addresses
-- Run this in your Supabase SQL Editor to resolve the PGRST200 error

-- ============================================================================
-- STEP 1: VERIFY CURRENT TABLE STRUCTURE
-- ============================================================================
-- Check if the tables exist and their current structure
SELECT 'Current table structure:' as info;
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('profiles', 'addresses')
ORDER BY table_name, ordinal_position;

-- ============================================================================
-- STEP 2: CHECK EXISTING FOREIGN KEY CONSTRAINTS
-- ============================================================================
-- Check if the foreign key constraint already exists
SELECT 'Existing foreign key constraints:' as info;
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'addresses'
    AND kcu.column_name = 'profile_id';

-- ============================================================================
-- STEP 3: CHECK FOR ORPHANED ADDRESSES
-- ============================================================================
-- Check if there are addresses referencing non-existent profiles
SELECT 'Checking for orphaned addresses:' as info;
SELECT 
    COUNT(*) as orphaned_addresses_count
FROM addresses a
LEFT JOIN profiles p ON a.profile_id = p.id
WHERE p.id IS NULL AND a.profile_id IS NOT NULL;

-- Show the orphaned addresses
SELECT 
    a.id as address_id,
    a.profile_id as orphaned_profile_id,
    a.line1,
    a.suburb,
    a.city
FROM addresses a
LEFT JOIN profiles p ON a.profile_id = p.id
WHERE p.id IS NULL AND a.profile_id IS NOT NULL
LIMIT 10;

-- ============================================================================
-- STEP 4: CLEAN UP ORPHANED ADDRESSES
-- ============================================================================
-- Remove addresses that reference non-existent profiles
DO $$ 
BEGIN
    -- Count orphaned addresses before cleanup
    DECLARE
        orphaned_count INTEGER;
    BEGIN
        SELECT COUNT(*) INTO orphaned_count
        FROM addresses a
        LEFT JOIN profiles p ON a.profile_id = p.id
        WHERE p.id IS NULL AND a.profile_id IS NOT NULL;
        
        IF orphaned_count > 0 THEN
            -- Delete orphaned addresses
            DELETE FROM addresses 
            WHERE profile_id IN (
                SELECT a.profile_id 
                FROM addresses a
                LEFT JOIN profiles p ON a.profile_id = p.id
                WHERE p.id IS NULL AND a.profile_id IS NOT NULL
            );
            
            RAISE NOTICE 'Cleaned up % orphaned addresses', orphaned_count;
        ELSE
            RAISE NOTICE 'No orphaned addresses found';
        END IF;
    END;
END $$;

-- ============================================================================
-- STEP 5: FIX THE FOREIGN KEY RELATIONSHIP
-- ============================================================================
-- Drop existing constraint if it exists (to avoid conflicts)
DO $$ 
BEGIN
    -- Check if the constraint exists and drop it
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'addresses_profile_id_fkey' 
        AND table_name = 'addresses'
    ) THEN
        ALTER TABLE public.addresses DROP CONSTRAINT addresses_profile_id_fkey;
        RAISE NOTICE 'Dropped existing addresses_profile_id_fkey constraint';
    ELSE
        RAISE NOTICE 'No existing addresses_profile_id_fkey constraint found';
    END IF;
END $$;

-- Create the proper foreign key constraint
DO $$ 
BEGIN
    -- Check if profile_id column exists in addresses table
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'addresses' 
        AND column_name = 'profile_id'
    ) THEN
        -- Verify no orphaned addresses remain
        IF NOT EXISTS (
            SELECT 1 FROM addresses a
            LEFT JOIN profiles p ON a.profile_id = p.id
            WHERE p.id IS NULL AND a.profile_id IS NOT NULL
        ) THEN
            -- Add the foreign key constraint
            ALTER TABLE public.addresses 
            ADD CONSTRAINT addresses_profile_id_fkey 
            FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
            
            RAISE NOTICE 'Successfully created addresses_profile_id_fkey constraint';
        ELSE
            RAISE EXCEPTION 'Orphaned addresses still exist. Please clean up data first.';
        END IF;
    ELSE
        RAISE NOTICE 'profile_id column does not exist in addresses table - creating it';
        
        -- Add the profile_id column if it doesn't exist
        ALTER TABLE public.addresses 
        ADD COLUMN profile_id uuid;
        
        -- Add the foreign key constraint
        ALTER TABLE public.addresses 
        ADD CONSTRAINT addresses_profile_id_fkey 
        FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Created profile_id column and addresses_profile_id_fkey constraint';
    END IF;
END $$;

-- ============================================================================
-- STEP 6: VERIFY THE FIX
-- ============================================================================
-- Check if the constraint was created successfully
SELECT 'Verifying the fix:' as info;
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'addresses'
    AND kcu.column_name = 'profile_id';

-- ============================================================================
-- STEP 7: TEST THE RELATIONSHIP
-- ============================================================================
-- Test if we can now query profiles with addresses
SELECT 'Testing the relationship:' as info;

-- Test 1: Basic join query
SELECT 
    p.id as profile_id,
    p.full_name,
    p.role,
    COUNT(a.id) as address_count
FROM profiles p
LEFT JOIN addresses a ON a.profile_id = p.id
WHERE p.role = 'customer'
GROUP BY p.id, p.full_name, p.role
LIMIT 5;

-- Test 2: Query that was failing (similar to getCustomerProfilesWithAddresses)
SELECT 
    p.*,
    json_agg(
        json_build_object(
            'id', a.id,
            'line1', a.line1,
            'suburb', a.suburb,
            'city', a.city,
            'postal_code', a.postal_code,
            'lat', a.lat,
            'lng', a.lng,
            'is_primary', a.is_primary
        )
    ) as addresses
FROM profiles p
LEFT JOIN addresses a ON a.profile_id = p.id
WHERE p.role = 'customer' AND p.is_active = true
GROUP BY p.id
LIMIT 3;

-- ============================================================================
-- STEP 8: ADDITIONAL SAFEGUARDS
-- ============================================================================
-- Ensure the profile_id column has proper indexing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'addresses' 
        AND indexname = 'idx_addresses_profile_id'
    ) THEN
        CREATE INDEX idx_addresses_profile_id ON addresses(profile_id);
        RAISE NOTICE 'Created idx_addresses_profile_id index';
    ELSE
        RAISE NOTICE 'idx_addresses_profile_id index already exists';
    END IF;
END $$;

-- ============================================================================
-- STEP 9: CREATE A VIEW FOR BETTER COMPATIBILITY
-- ============================================================================
-- Create a view that combines profiles and addresses for easier querying
DROP VIEW IF EXISTS public.customer_profiles_with_addresses_view;
CREATE VIEW public.customer_profiles_with_addresses_view AS
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.phone,
    p.role,
    p.is_active,
    p.created_at,
    json_agg(
        CASE 
            WHEN a.id IS NOT NULL THEN
                json_build_object(
                    'id', a.id,
                    'line1', a.line1,
                    'suburb', a.suburb,
                    'city', a.city,
                    'postal_code', a.postal_code,
                    'lat', a.lat,
                    'lng', a.lng,
                    'is_primary', a.is_primary,
                    'created_at', a.created_at,
                    'updated_at', a.updated_at
                )
            ELSE NULL
        END
    ) FILTER (WHERE a.id IS NOT NULL) as addresses
FROM profiles p
LEFT JOIN addresses a ON a.profile_id = p.id
WHERE p.role = 'customer' AND p.is_active = true
GROUP BY p.id, p.email, p.full_name, p.phone, p.role, p.is_active, p.created_at;

-- Grant access to the view
GRANT SELECT ON public.customer_profiles_with_addresses_view TO authenticated;

-- ============================================================================
-- STEP 10: TEST THE VIEW
-- ============================================================================
-- Test the new view
SELECT 'Testing the new view:' as info;
SELECT 
    id,
    full_name,
    email,
    role,
    json_array_length(addresses) as address_count
FROM public.customer_profiles_with_addresses_view
LIMIT 3;

-- ============================================================================
-- STEP 11: FINAL VERIFICATION
-- ============================================================================
SELECT 'Final verification complete!' as status;
SELECT 
    'Foreign key relationship between profiles and addresses has been fixed.' as message,
    'You can now use the getCustomerProfilesWithAddresses function successfully.' as next_step,
    'Alternative: Use the customer_profiles_with_addresses_view for better performance.' as alternative;

-- ============================================================================
-- TROUBLESHOOTING NOTES
-- ============================================================================
/*
If you still encounter issues after running this script:

1. Check if your Supabase instance has the latest PostgREST version
2. Verify that RLS policies are not blocking the relationship
3. Try refreshing the Supabase schema cache in the dashboard
4. Consider using the view approach instead of nested selects

Alternative query approaches:
- Use the view: SELECT * FROM customer_profiles_with_addresses_view
- Use separate queries and combine in application code
- Use raw SQL with .rpc() if available
*/
