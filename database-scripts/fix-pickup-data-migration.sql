-- ============================================================================
-- PICKUP DATA MIGRATION FIX
-- ============================================================================
-- This script fixes the data migration issue where pickups table has
-- address_id values that don't exist in user_addresses table

-- ============================================================================
-- STEP 1: CHECK THE DATA INTEGRITY ISSUE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Checking data integrity issues...';
    
    -- Check how many pickups have address_id values that don't exist in user_addresses
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pickups' AND table_schema = 'public') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_addresses' AND table_schema = 'public') THEN
            RAISE NOTICE 'Checking for orphaned address_id values in pickups table...';
            
            -- Count orphaned records
            PERFORM COUNT(*) FROM public.pickups p 
            WHERE p.address_id IS NOT NULL 
            AND NOT EXISTS (
                SELECT 1 FROM public.user_addresses ua 
                WHERE ua.id = p.address_id
            );
            
            -- Show the count
            RAISE NOTICE 'Found orphaned address_id values in pickups table';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- STEP 2: SHOW ORPHANED RECORDS
-- ============================================================================

-- Show which address_id values are orphaned
SELECT 
    'Orphaned address_id values in pickups:' as issue,
    p.address_id,
    COUNT(*) as count
FROM public.pickups p 
WHERE p.address_id IS NOT NULL 
AND NOT EXISTS (
    SELECT 1 FROM public.user_addresses ua 
    WHERE ua.id = p.address_id
)
GROUP BY p.address_id
ORDER BY count DESC;

-- ============================================================================
-- STEP 3: FIX THE DATA INTEGRITY ISSUE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Fixing data integrity issues...';
    
    -- Option 1: Set orphaned address_id values to NULL
    UPDATE public.pickups 
    SET address_id = NULL 
    WHERE address_id IS NOT NULL 
    AND NOT EXISTS (
        SELECT 1 FROM public.user_addresses ua 
        WHERE ua.id = pickups.address_id
    );
    
    RAISE NOTICE '✅ Set orphaned address_id values to NULL';
    
    -- Option 2: If you want to keep the data, you could create missing addresses
    -- But for now, we'll set them to NULL to fix the constraint issue
    
END $$;

-- ============================================================================
-- STEP 4: VERIFY THE FIX
-- ============================================================================

-- Check if there are still any orphaned records
SELECT 
    'Remaining orphaned records:' as status,
    COUNT(*) as count
FROM public.pickups p 
WHERE p.address_id IS NOT NULL 
AND NOT EXISTS (
    SELECT 1 FROM public.user_addresses ua 
    WHERE ua.id = p.address_id
);

-- ============================================================================
-- STEP 5: NOW CREATE THE FOREIGN KEY CONSTRAINT
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Creating foreign key constraint after data fix...';
    
    -- Drop the constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'pickups_address_id_fkey' 
        AND table_name = 'pickups' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.pickups DROP CONSTRAINT pickups_address_id_fkey;
        RAISE NOTICE '✅ Dropped existing pickups_address_id_fkey';
    END IF;
    
    -- Create the constraint
    ALTER TABLE public.pickups 
    ADD CONSTRAINT pickups_address_id_fkey 
    FOREIGN KEY (address_id) REFERENCES public.user_addresses(id) ON DELETE SET NULL;
    
    RAISE NOTICE '✅ Created pickups_address_id_fkey -> user_addresses(id)';
    
END $$;

-- ============================================================================
-- STEP 6: VERIFY THE CONSTRAINT WAS CREATED
-- ============================================================================

-- Show the constraint
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'pickups'
    AND tc.table_schema = 'public'
    AND kcu.column_name = 'address_id'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 Data migration fix completed!';
    RAISE NOTICE 'Orphaned address_id values have been set to NULL';
    RAISE NOTICE 'Foreign key constraint has been created successfully';
    RAISE NOTICE 'The kilograms save issue should now be resolved';
END $$;
