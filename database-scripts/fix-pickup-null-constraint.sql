-- ============================================================================
-- PICKUP NULL CONSTRAINT FIX
-- ============================================================================
-- This script fixes the NOT NULL constraint issue on address_id column
-- and handles the data migration properly

-- ============================================================================
-- STEP 1: CHECK CURRENT CONSTRAINTS
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Checking current constraints on pickups table...';
    
    -- Check if address_id has NOT NULL constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pickups' 
        AND column_name = 'address_id' 
        AND is_nullable = 'NO'
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE '❌ address_id column has NOT NULL constraint';
    ELSE
        RAISE NOTICE '✅ address_id column allows NULL values';
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
-- STEP 3: REMOVE NOT NULL CONSTRAINT
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Removing NOT NULL constraint from address_id column...';
    
    -- Remove the NOT NULL constraint
    ALTER TABLE public.pickups 
    ALTER COLUMN address_id DROP NOT NULL;
    
    RAISE NOTICE '✅ Removed NOT NULL constraint from address_id column';
    
END $$;

-- ============================================================================
-- STEP 4: FIX THE DATA INTEGRITY ISSUE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Fixing data integrity issues...';
    
    -- Set orphaned address_id values to NULL
    UPDATE public.pickups 
    SET address_id = NULL 
    WHERE address_id IS NOT NULL 
    AND NOT EXISTS (
        SELECT 1 FROM public.user_addresses ua 
        WHERE ua.id = pickups.address_id
    );
    
    RAISE NOTICE '✅ Set orphaned address_id values to NULL';
    
END $$;

-- ============================================================================
-- STEP 5: VERIFY THE FIX
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
-- STEP 6: CREATE THE FOREIGN KEY CONSTRAINT
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
-- STEP 7: VERIFY THE CONSTRAINT WAS CREATED
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
      AND ccu.table_schema = tc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'pickups'
    AND tc.table_schema = 'public'
    AND kcu.column_name = 'address_id'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- STEP 8: CHECK COLUMN NULLABILITY
-- ============================================================================

-- Verify that address_id column now allows NULL
SELECT 
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns 
WHERE table_name = 'pickups' 
    AND column_name = 'address_id'
    AND table_schema = 'public';

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 NULL constraint fix completed!';
    RAISE NOTICE 'NOT NULL constraint removed from address_id column';
    RAISE NOTICE 'Orphaned address_id values have been set to NULL';
    RAISE NOTICE 'Foreign key constraint has been created successfully';
    RAISE NOTICE 'The kilograms save issue should now be resolved';
END $$;
