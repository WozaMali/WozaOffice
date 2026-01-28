-- ============================================================================
-- FIX PICKUP ITEMS TABLE
-- ============================================================================
-- This script creates the pickup_items table if it doesn't exist and fixes any issues

-- ============================================================================
-- STEP 1: CHECK IF PICKUP_ITEMS TABLE EXISTS
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Checking if pickup_items table exists...';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pickup_items' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ pickup_items table exists';
    ELSE
        RAISE NOTICE '❌ pickup_items table does not exist - creating it...';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: CREATE PICKUP_ITEMS TABLE IF IT DOESN'T EXIST
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pickup_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pickup_id UUID NOT NULL,
    material_id UUID NOT NULL,
    kilograms DECIMAL(10,3) NOT NULL DEFAULT 0,
    contamination_pct DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 3: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_pickup_items_pickup_id ON public.pickup_items(pickup_id);
CREATE INDEX IF NOT EXISTS idx_pickup_items_material_id ON public.pickup_items(material_id);

-- ============================================================================
-- STEP 4: DROP AND RECREATE FOREIGN KEY CONSTRAINTS
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Setting up foreign key constraints...';
    
    -- Drop existing constraints if they exist
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'pickup_items_pickup_id_fkey' 
        AND table_name = 'pickup_items' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.pickup_items DROP CONSTRAINT pickup_items_pickup_id_fkey;
        RAISE NOTICE '✅ Dropped existing pickup_items_pickup_id_fkey';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'pickup_items_material_id_fkey' 
        AND table_name = 'pickup_items' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.pickup_items DROP CONSTRAINT pickup_items_material_id_fkey;
        RAISE NOTICE '✅ Dropped existing pickup_items_material_id_fkey';
    END IF;
    
    -- Create new constraints
    ALTER TABLE public.pickup_items 
    ADD CONSTRAINT pickup_items_pickup_id_fkey 
    FOREIGN KEY (pickup_id) REFERENCES public.pickups(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Created pickup_items_pickup_id_fkey -> pickups(id)';
    
    -- Check if materials table exists before creating the constraint
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'materials' AND table_schema = 'public') THEN
        ALTER TABLE public.pickup_items 
        ADD CONSTRAINT pickup_items_material_id_fkey 
        FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE RESTRICT;
        RAISE NOTICE '✅ Created pickup_items_material_id_fkey -> materials(id)';
    ELSE
        RAISE NOTICE '⚠️ materials table does not exist - skipping material_id foreign key';
    END IF;
    
END $$;

-- ============================================================================
-- STEP 5: CREATE UPDATED_AT TRIGGER
-- ============================================================================

-- Create or replace the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for pickup_items table
DROP TRIGGER IF EXISTS update_pickup_items_updated_at ON public.pickup_items;
CREATE TRIGGER update_pickup_items_updated_at
    BEFORE UPDATE ON public.pickup_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- STEP 6: VERIFY THE TABLE STRUCTURE
-- ============================================================================

-- Show the structure of pickup_items table
SELECT 
    'pickup_items table structure:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'pickup_items' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 7: VERIFY FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Show foreign key constraints on pickup_items table
SELECT 
    'pickup_items foreign keys:' as info,
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
    AND tc.table_name = 'pickup_items'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- STEP 8: CHECK IF MATERIALS TABLE EXISTS AND HAS DATA
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Checking materials table...';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'materials' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ materials table exists';
        
        -- Check if materials table has data
        IF EXISTS (SELECT 1 FROM public.materials LIMIT 1) THEN
            RAISE NOTICE '✅ materials table has data';
        ELSE
            RAISE NOTICE '⚠️ materials table is empty';
        END IF;
    ELSE
        RAISE NOTICE '❌ materials table does not exist';
    END IF;
END $$;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 Pickup items table fix completed!';
    RAISE NOTICE 'pickup_items table has been created/verified';
    RAISE NOTICE 'Foreign key constraints have been set up';
    RAISE NOTICE 'The pickup items error should now be resolved';
END $$;
