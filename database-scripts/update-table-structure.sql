-- ============================================================================
-- UPDATE TABLE STRUCTURE FOR CONSISTENCY
-- ============================================================================
-- This script updates the table structure to use user_id instead of customer_id
-- Run this in your Supabase SQL Editor

-- First, let's see the current structure
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('pickups', 'collector_assignments')
  AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Option 1: Rename columns for consistency (if you want to change)
-- ALTER TABLE public.pickups RENAME COLUMN customer_id TO user_id;
-- ALTER TABLE public.collector_assignments RENAME COLUMN collector_id TO user_id;

-- Option 2: Keep current structure but update the view to be clearer
-- (This is safer and doesn't change existing data)

-- Update the collector dashboard view to be clearer about user types
CREATE OR REPLACE VIEW public.collector_dashboard_view AS
SELECT 
  p.id,
  p.customer_id as user_id,  -- Keep original column name but alias for clarity
  c.full_name as customer_name,
  p.address_id,
  a.line1 as address_line1,
  a.suburb as address_suburb,
  a.city as address_city,
  p.started_at,
  p.submitted_at,
  p.status,
  COALESCE(pi.total_kg, 0) as total_kg,
  COALESCE(pi.total_value, 0) as total_value,
  CASE 
    WHEN p.status = 'approved' THEN 'paid'
    ELSE 'pending'
  END as payment_status,
  p.collector_id,
  col.full_name as collector_name,
  0 as total_points -- Placeholder for points system
FROM public.pickups p
JOIN public.profiles c ON p.customer_id = c.id
JOIN public.addresses a ON p.address_id = a.id
LEFT JOIN public.profiles col ON p.collector_id = col.id
LEFT JOIN (
  SELECT 
    pickup_id,
    SUM(kilograms) as total_kg,
    SUM(kilograms * m.rate_per_kg) as total_value
  FROM public.pickup_items pi
  JOIN public.materials m ON pi.material_id = m.id
  GROUP BY pickup_id
) pi ON p.id = pi.pickup_id
WHERE p.status IN ('submitted', 'approved', 'rejected');

-- Show the updated view structure
SELECT 
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'collector_dashboard_view'
  AND table_schema = 'public'
ORDER BY ordinal_position;
