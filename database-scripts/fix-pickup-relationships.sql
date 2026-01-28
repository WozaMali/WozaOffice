-- ============================================================================
-- FIX PICKUP RELATIONSHIPS
-- ============================================================================
-- This script fixes the foreign key relationships between pickups and profiles
-- that are causing the "Could not find a relationship" error

-- First, drop existing foreign key constraints if they exist
ALTER TABLE IF EXISTS public.pickups 
DROP CONSTRAINT IF EXISTS pickups_customer_id_fkey;

ALTER TABLE IF EXISTS public.pickups 
DROP CONSTRAINT IF EXISTS pickups_collector_id_fkey;

ALTER TABLE IF EXISTS public.pickups 
DROP CONSTRAINT IF EXISTS pickups_address_id_fkey;

-- Now recreate them with proper names
ALTER TABLE public.pickups 
ADD CONSTRAINT pickups_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.pickups 
ADD CONSTRAINT pickups_collector_id_fkey 
FOREIGN KEY (collector_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.pickups 
ADD CONSTRAINT pickups_address_id_fkey 
FOREIGN KEY (address_id) REFERENCES public.addresses(id) ON DELETE CASCADE;

-- Also fix pickup_items foreign key
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

-- Verify the relationships
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
    AND tc.table_name = 'pickups';

-- Test the relationship with a simple query
SELECT 
    p.id as pickup_id,
    p.status,
    c.full_name as customer_name,
    col.full_name as collector_name
FROM public.pickups p
LEFT JOIN public.profiles c ON p.customer_id = c.id
LEFT JOIN public.profiles col ON p.collector_id = col.id
LIMIT 5;
