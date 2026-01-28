-- ============================================================================
-- COMPREHENSIVE DATABASE FIX SCRIPT
-- ============================================================================
-- This script fixes all the issues preventing the dashboard from working

-- 1. Fix the address_id constraint issue
ALTER TABLE public.pickups 
ALTER COLUMN address_id DROP NOT NULL;

-- 2. Fix foreign key relationships with proper constraint names
-- Drop existing constraints if they exist
ALTER TABLE IF EXISTS public.pickups 
DROP CONSTRAINT IF EXISTS pickups_customer_id_fkey;

ALTER TABLE IF EXISTS public.pickups 
DROP CONSTRAINT IF EXISTS pickups_collector_id_fkey;

ALTER TABLE IF EXISTS public.pickups 
DROP CONSTRAINT IF EXISTS pickups_address_id_fkey;

-- Recreate them with proper names
ALTER TABLE public.pickups 
ADD CONSTRAINT pickups_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.pickups 
ADD CONSTRAINT pickups_collector_id_fkey 
FOREIGN KEY (collector_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.pickups 
ADD CONSTRAINT pickups_address_id_fkey 
FOREIGN KEY (address_id) REFERENCES public.addresses(id) ON DELETE SET NULL;

-- 3. Fix pickup_items foreign keys
ALTER TABLE IF EXISTS public.pickup_items 
DROP CONSTRAINT IF EXISTS pickup_items_pickup_id_fkey;

ALTER TABLE IF EXISTS public.pickup_items 
DROP CONSTRAINT IF EXISTS pickup_items_material_id_fkey;

ALTER TABLE public.pickup_items 
ADD CONSTRAINT pickup_items_pickup_id_fkey 
FOREIGN KEY (pickup_id) REFERENCES public.pickups(id) ON DELETE CASCADE;

ALTER TABLE public.pickup_items 
ADD CONSTRAINT pickup_items_material_id_fkey 
FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE RESTRICT;

-- 4. Ensure the profiles table has the correct structure
-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add role column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'CUSTOMER';
    END IF;
    
    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'is_active') THEN
        ALTER TABLE public.profiles ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    -- Add full_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
        ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
    END IF;
END $$;

-- 5. Create a view for dashboard data that doesn't rely on complex joins
CREATE OR REPLACE VIEW public.dashboard_stats_view AS
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
    col.full_name as collector_name,
    COALESCE(pi.total_kg, 0) as calculated_total_kg,
    COALESCE(pi.total_value, 0) as calculated_total_value
FROM public.pickups p
LEFT JOIN public.profiles c ON p.customer_id = c.id
LEFT JOIN public.profiles col ON p.collector_id = col.id
LEFT JOIN (
    SELECT 
        pickup_id,
        SUM(kilograms) as total_kg,
        SUM(kilograms * 1.5) as total_value
    FROM public.pickup_items
    GROUP BY pickup_id
) pi ON p.id = pi.pickup_id;

-- 6. Verify all tables exist and have correct structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name IN ('pickups', 'profiles', 'pickup_items', 'materials', 'addresses')
ORDER BY table_name, ordinal_position;

-- 7. Test the relationships
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
    AND tc.table_name IN ('pickups', 'pickup_items')
ORDER BY tc.table_name, kcu.column_name;

-- 8. Test inserting a pickup without address_id (should now work)
DO $$
DECLARE
    test_customer_id UUID;
    test_collector_id UUID;
BEGIN
    -- Get test IDs from existing data
    SELECT id INTO test_customer_id FROM public.profiles LIMIT 1;
    SELECT id INTO test_collector_id FROM public.profiles WHERE role = 'COLLECTOR' LIMIT 1;
    
    IF test_customer_id IS NOT NULL AND test_collector_id IS NOT NULL THEN
        -- Test insert
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
        );
        
        RAISE NOTICE 'Test pickup inserted successfully';
        
        -- Clean up test data
        DELETE FROM public.pickups 
        WHERE customer_id = test_customer_id 
            AND collector_id = test_collector_id 
            AND status = 'submitted';
            
        RAISE NOTICE 'Test data cleaned up';
    ELSE
        RAISE NOTICE 'No test data available for testing';
    END IF;
END $$;
