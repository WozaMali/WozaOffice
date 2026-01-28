-- ============================================================================
-- SAFE DATABASE FIX SCRIPT
-- ============================================================================
-- This script safely fixes database issues without creating duplicate constraints

-- 1. Fix the address_id constraint issue (this is the main problem)
DO $$ 
BEGIN
    -- Check if address_id is NOT NULL and make it nullable if it is
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pickups' 
        AND column_name = 'address_id' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.pickups ALTER COLUMN address_id DROP NOT NULL;
        RAISE NOTICE 'Made address_id nullable';
    ELSE
        RAISE NOTICE 'address_id is already nullable';
    END IF;
END $$;

-- 2. Check and fix foreign key relationships safely
DO $$ 
BEGIN
    -- Check if pickups_customer_id_fkey exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'pickups_customer_id_fkey' 
        AND table_name = 'pickups'
    ) THEN
        ALTER TABLE public.pickups 
        ADD CONSTRAINT pickups_customer_id_fkey 
        FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
        RAISE NOTICE 'Created pickups_customer_id_fkey constraint';
    ELSE
        RAISE NOTICE 'pickups_customer_id_fkey constraint already exists';
    END IF;
    
    -- Check if pickups_collector_id_fkey exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'pickups_collector_id_fkey' 
        AND table_name = 'pickups'
    ) THEN
        ALTER TABLE public.pickups 
        ADD CONSTRAINT pickups_collector_id_fkey 
        FOREIGN KEY (collector_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
        RAISE NOTICE 'Created pickups_collector_id_fkey constraint';
    ELSE
        RAISE NOTICE 'pickups_collector_id_fkey constraint already exists';
    END IF;
    
    -- Check if pickups_address_id_fkey exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'pickups_address_id_fkey' 
        AND table_name = 'pickups'
    ) THEN
        ALTER TABLE public.pickups 
        ADD CONSTRAINT pickups_address_id_fkey 
        FOREIGN KEY (address_id) REFERENCES public.addresses(id) ON DELETE SET NULL;
        RAISE NOTICE 'Created pickups_address_id_fkey constraint';
    ELSE
        RAISE NOTICE 'pickups_address_id_fkey constraint already exists';
    END IF;
END $$;

-- 3. Check and fix pickup_items foreign keys safely
DO $$ 
BEGIN
    -- Check if pickup_items_pickup_id_fkey exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'pickup_items_pickup_id_fkey' 
        AND table_name = 'pickup_items'
    ) THEN
        ALTER TABLE public.pickup_items 
        ADD CONSTRAINT pickup_items_pickup_id_fkey 
        FOREIGN KEY (pickup_id) REFERENCES public.pickups(id) ON DELETE CASCADE;
        RAISE NOTICE 'Created pickup_items_pickup_id_fkey constraint';
    ELSE
        RAISE NOTICE 'pickup_items_pickup_id_fkey constraint already exists';
    END IF;
    
    -- Check if pickup_items_material_id_fkey exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'pickup_items_material_id_fkey' 
        AND table_name = 'pickup_items'
    ) THEN
        ALTER TABLE public.pickup_items 
        ADD CONSTRAINT pickup_items_material_id_fkey 
        FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE RESTRICT;
        RAISE NOTICE 'Created pickup_items_material_id_fkey constraint';
    ELSE
        RAISE NOTICE 'pickup_items_material_id_fkey constraint already exists';
    END IF;
END $$;

-- 4. Ensure the profiles table has the correct structure
DO $$ 
BEGIN
    -- Add role column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'CUSTOMER';
        RAISE NOTICE 'Added role column to profiles table';
    ELSE
        RAISE NOTICE 'role column already exists in profiles table';
    END IF;
    
    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'is_active') THEN
        ALTER TABLE public.profiles ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added is_active column to profiles table';
    ELSE
        RAISE NOTICE 'is_active column already exists in profiles table';
    END IF;
    
    -- Add full_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
        ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
        RAISE NOTICE 'Added full_name column to profiles table';
    ELSE
        RAISE NOTICE 'full_name column already exists in profiles table';
    END IF;
END $$;

-- 5. Create a simple dashboard view for better data access
DROP VIEW IF EXISTS public.dashboard_stats_view;
CREATE VIEW public.dashboard_stats_view AS
SELECT 
    p.id,
    p.customer_id,
    p.collector_id,
    p.status,
    p.started_at,
    p.submitted_at,
    p.total_kg,
    p.total_value,
    c.full_name as customer_name,
    col.full_name as collector_name
FROM public.pickups p
LEFT JOIN public.profiles c ON p.customer_id = c.id
LEFT JOIN public.profiles col ON p.collector_id = col.id;

-- 6. Test the database structure
SELECT 
    'Database Structure Check' as check_type,
    COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('pickups', 'profiles', 'pickup_items', 'materials', 'addresses');

-- 7. Test inserting a pickup without address_id (should now work)
DO $$
DECLARE
    test_customer_id UUID;
    test_collector_id UUID;
    test_pickup_id UUID;
BEGIN
    -- Get test IDs from existing data
    SELECT id INTO test_customer_id FROM public.profiles LIMIT 1;
    SELECT id INTO test_collector_id FROM public.profiles WHERE role = 'COLLECTOR' LIMIT 1;
    
    IF test_customer_id IS NOT NULL AND test_collector_id IS NOT NULL THEN
        -- Test insert without address_id
        INSERT INTO public.pickups (
            customer_id, 
            collector_id, 
            status, 
            started_at
        ) VALUES (
            test_customer_id,
            test_collector_id,
            'submitted',
            NOW()
        ) RETURNING id INTO test_pickup_id;
        
        RAISE NOTICE 'Test pickup inserted successfully with ID: %', test_pickup_id;
        
        -- Clean up test data
        DELETE FROM public.pickups WHERE id = test_pickup_id;
        RAISE NOTICE 'Test data cleaned up successfully';
    ELSE
        RAISE NOTICE 'No test data available for testing';
    END IF;
END $$;

-- 8. Show final status
SELECT 'Database fix completed successfully!' as status;
