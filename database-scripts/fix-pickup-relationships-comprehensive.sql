-- ============================================================================
-- COMPREHENSIVE PICKUP RELATIONSHIPS FIX
-- ============================================================================
-- This script fixes all the foreign key relationship issues between pickups
-- and the user/profile tables, addressing both the address_id constraint
-- and the customer_id/collector_id relationship issues

-- ============================================================================
-- STEP 1: CHECK CURRENT DATABASE STRUCTURE
-- ============================================================================

-- Check what tables exist
DO $$
BEGIN
    RAISE NOTICE 'Checking current database structure...';
    
    -- Check if profiles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ profiles table exists';
    ELSE
        RAISE NOTICE '❌ profiles table does not exist';
    END IF;
    
    -- Check if user_profiles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ user_profiles table exists';
    ELSE
        RAISE NOTICE '❌ user_profiles table does not exist';
    END IF;
    
    -- Check if user_addresses table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_addresses' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ user_addresses table exists';
    ELSE
        RAISE NOTICE '❌ user_addresses table does not exist';
    END IF;
    
    -- Check if addresses table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'addresses' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ addresses table exists';
    ELSE
        RAISE NOTICE '❌ addresses table does not exist';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: DROP ALL EXISTING FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Drop all existing foreign key constraints on pickups table
DO $$
BEGIN
    RAISE NOTICE 'Dropping existing foreign key constraints...';
    
    -- Drop customer_id constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'pickups_customer_id_fkey' 
        AND table_name = 'pickups' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.pickups DROP CONSTRAINT pickups_customer_id_fkey;
        RAISE NOTICE '✅ Dropped pickups_customer_id_fkey';
    ELSE
        RAISE NOTICE 'ℹ️ pickups_customer_id_fkey does not exist';
    END IF;
    
    -- Drop collector_id constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'pickups_collector_id_fkey' 
        AND table_name = 'pickups' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.pickups DROP CONSTRAINT pickups_collector_id_fkey;
        RAISE NOTICE '✅ Dropped pickups_collector_id_fkey';
    ELSE
        RAISE NOTICE 'ℹ️ pickups_collector_id_fkey does not exist';
    END IF;
    
    -- Drop address_id constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'pickups_address_id_fkey' 
        AND table_name = 'pickups' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.pickups DROP CONSTRAINT pickups_address_id_fkey;
        RAISE NOTICE '✅ Dropped pickups_address_id_fkey';
    ELSE
        RAISE NOTICE 'ℹ️ pickups_address_id_fkey does not exist';
    END IF;
    
    -- Drop pickup_address_id constraint (if it exists)
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'pickups_pickup_address_id_fkey' 
        AND table_name = 'pickups' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.pickups DROP CONSTRAINT pickups_pickup_address_id_fkey;
        RAISE NOTICE '✅ Dropped pickups_pickup_address_id_fkey';
    ELSE
        RAISE NOTICE 'ℹ️ pickups_pickup_address_id_fkey does not exist';
    END IF;
END $$;

-- ============================================================================
-- STEP 3: ADD NEW FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Add new foreign key constraints based on what tables actually exist
DO $$
BEGIN
    RAISE NOTICE 'Adding new foreign key constraints...';
    
    -- Determine which profile table to use
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
        -- Use profiles table
        RAISE NOTICE 'Using profiles table for foreign keys';
        
        -- Add customer_id constraint
        ALTER TABLE public.pickups 
        ADD CONSTRAINT pickups_customer_id_fkey 
        FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Added pickups_customer_id_fkey -> profiles(id)';
        
        -- Add collector_id constraint
        ALTER TABLE public.pickups 
        ADD CONSTRAINT pickups_collector_id_fkey 
        FOREIGN KEY (collector_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ Added pickups_collector_id_fkey -> profiles(id)';
        
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles' AND table_schema = 'public') THEN
        -- Use user_profiles table
        RAISE NOTICE 'Using user_profiles table for foreign keys';
        
        -- Add customer_id constraint
        ALTER TABLE public.pickups 
        ADD CONSTRAINT pickups_customer_id_fkey 
        FOREIGN KEY (customer_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Added pickups_customer_id_fkey -> user_profiles(id)';
        
        -- Add collector_id constraint
        ALTER TABLE public.pickups 
        ADD CONSTRAINT pickups_collector_id_fkey 
        FOREIGN KEY (collector_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ Added pickups_collector_id_fkey -> user_profiles(id)';
        
    ELSE
        RAISE EXCEPTION 'Neither profiles nor user_profiles table exists!';
    END IF;
    
    -- Determine which address table to use
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_addresses' AND table_schema = 'public') THEN
        -- Use user_addresses table
        RAISE NOTICE 'Using user_addresses table for address foreign key';
        
        -- Check if pickup_address_id column exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'pickups' 
            AND column_name = 'pickup_address_id' 
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.pickups 
            ADD CONSTRAINT pickups_pickup_address_id_fkey 
            FOREIGN KEY (pickup_address_id) REFERENCES public.user_addresses(id) ON DELETE SET NULL;
            RAISE NOTICE '✅ Added pickups_pickup_address_id_fkey -> user_addresses(id)';
        END IF;
        
        -- Also add address_id constraint if the column exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'pickups' 
            AND column_name = 'address_id' 
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.pickups 
            ADD CONSTRAINT pickups_address_id_fkey 
            FOREIGN KEY (address_id) REFERENCES public.user_addresses(id) ON DELETE SET NULL;
            RAISE NOTICE '✅ Added pickups_address_id_fkey -> user_addresses(id)';
        END IF;
        
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'addresses' AND table_schema = 'public') THEN
        -- Use addresses table
        RAISE NOTICE 'Using addresses table for address foreign key';
        
        -- Check if address_id column exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'pickups' 
            AND column_name = 'address_id' 
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.pickups 
            ADD CONSTRAINT pickups_address_id_fkey 
            FOREIGN KEY (address_id) REFERENCES public.addresses(id) ON DELETE SET NULL;
            RAISE NOTICE '✅ Added pickups_address_id_fkey -> addresses(id)';
        END IF;
        
    ELSE
        RAISE NOTICE '⚠️ Neither user_addresses nor addresses table exists - skipping address foreign keys';
    END IF;
    
END $$;

-- ============================================================================
-- STEP 4: VERIFY THE FIXES
-- ============================================================================

-- Show all foreign key constraints on pickups table
DO $$
BEGIN
    RAISE NOTICE 'Verifying foreign key constraints on pickups table...';
END $$;

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
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- STEP 5: CHECK PICKUP ITEMS FOREIGN KEYS
-- ============================================================================

-- Also fix pickup_items foreign keys if they exist
DO $$
BEGIN
    RAISE NOTICE 'Checking pickup_items foreign keys...';
    
    -- Drop existing pickup_items constraints
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'pickup_items_pickup_id_fkey' 
        AND table_name = 'pickup_items' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.pickup_items DROP CONSTRAINT pickup_items_pickup_id_fkey;
        RAISE NOTICE '✅ Dropped pickup_items_pickup_id_fkey';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'pickup_items_material_id_fkey' 
        AND table_name = 'pickup_items' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.pickup_items DROP CONSTRAINT pickup_items_material_id_fkey;
        RAISE NOTICE '✅ Dropped pickup_items_material_id_fkey';
    END IF;
    
    -- Recreate pickup_items constraints
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pickup_items' AND table_schema = 'public') THEN
        ALTER TABLE public.pickup_items 
        ADD CONSTRAINT pickup_items_pickup_id_fkey 
        FOREIGN KEY (pickup_id) REFERENCES public.pickups(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Added pickup_items_pickup_id_fkey -> pickups(id)';
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'materials' AND table_schema = 'public') THEN
            ALTER TABLE public.pickup_items 
            ADD CONSTRAINT pickup_items_material_id_fkey 
            FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE RESTRICT;
            RAISE NOTICE '✅ Added pickup_items_material_id_fkey -> materials(id)';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 Pickup relationships fix completed!';
    RAISE NOTICE 'All foreign key constraints have been updated to use the correct tables.';
    RAISE NOTICE 'The kilograms save issue should now be resolved.';
END $$;
