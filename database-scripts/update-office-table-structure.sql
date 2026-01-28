-- ============================================================================
-- UPDATE OFFICE TABLE STRUCTURE FOR CONSISTENCY
-- ============================================================================
-- This script updates the office table structure to ensure consistency with collector updates
-- Run this in your Supabase SQL Editor

-- First, let's see the current structure
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('pickups', 'collector_assignments', 'profiles', 'addresses')
  AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- ============================================================================
-- UPDATE PROFILES TABLE STRUCTURE
-- ============================================================================

-- Add missing columns to profiles table if they don't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Update full_name for existing records if it's null
UPDATE public.profiles 
SET full_name = CONCAT(first_name, ' ', last_name)
WHERE full_name IS NULL AND first_name IS NOT NULL AND last_name IS NOT NULL;

-- ============================================================================
-- UPDATE ADDRESSES TABLE STRUCTURE
-- ============================================================================

-- Ensure addresses table has the correct structure
-- Add missing columns if they don't exist
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Rename columns if they exist with different names (for consistency)
-- Note: Only rename if the old column exists and new column doesn't
DO $$
BEGIN
    -- Check if line1 exists and street_address doesn't, then rename
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'addresses' AND column_name = 'line1') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'addresses' AND column_name = 'street_address') THEN
        ALTER TABLE public.addresses RENAME COLUMN line1 TO street_address;
    END IF;
    
    -- Check if lat exists and latitude doesn't, then rename
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'addresses' AND column_name = 'lat') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'addresses' AND column_name = 'latitude') THEN
        ALTER TABLE public.addresses RENAME COLUMN lat TO latitude;
    END IF;
    
    -- Check if lng exists and longitude doesn't, then rename
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'addresses' AND column_name = 'lng') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'addresses' AND column_name = 'longitude') THEN
        ALTER TABLE public.addresses RENAME COLUMN lng TO longitude;
    END IF;
    
    -- Check if profile_id exists and customer_id doesn't, then rename
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'addresses' AND column_name = 'profile_id') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'addresses' AND column_name = 'customer_id') THEN
        ALTER TABLE public.addresses RENAME COLUMN profile_id TO customer_id;
    END IF;
END $$;

-- ============================================================================
-- UPDATE PICKUPS TABLE STRUCTURE
-- ============================================================================

-- Add missing columns to pickups table if they don't exist
ALTER TABLE public.pickups ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.pickups ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.pickups ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE public.pickups ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
ALTER TABLE public.pickups ADD COLUMN IF NOT EXISTS approval_note TEXT;

-- Update status values to match collector structure if needed
UPDATE public.pickups 
SET status = 'submitted' 
WHERE status = 'pending';

-- ============================================================================
-- UPDATE PICKUP_ITEMS TABLE STRUCTURE
-- ============================================================================

-- Add missing columns to pickup_items table if they don't exist
ALTER TABLE public.pickup_items ADD COLUMN IF NOT EXISTS kilograms DECIMAL(10,3);
ALTER TABLE public.pickup_items ADD COLUMN IF NOT EXISTS contamination_pct DECIMAL(5,2);

-- Rename weight to kilograms if weight exists and kilograms doesn't
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pickup_items' AND column_name = 'weight') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pickup_items' AND column_name = 'kilograms') THEN
        ALTER TABLE public.pickup_items RENAME COLUMN weight TO kilograms;
    END IF;
END $$;

-- ============================================================================
-- UPDATE MATERIALS TABLE STRUCTURE
-- ============================================================================

-- Add missing columns to materials table if they don't exist
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS rate_per_kg DECIMAL(10,2);

-- Rename price_per_unit to rate_per_kg if price_per_unit exists and rate_per_kg doesn't
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'price_per_unit') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'rate_per_kg') THEN
        ALTER TABLE public.materials RENAME COLUMN price_per_unit TO rate_per_kg;
    END IF;
END $$;

-- First, add the missing columns if they don't exist
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'kg';

-- Update the existing metal material to Aluminium Cans with new rate
UPDATE public.materials 
SET 
    name = 'Aluminium Cans',
    category = 'Metal',
    rate_per_kg = 18.55,
    description = 'Clean aluminium beverage cans and containers',
    updated_at = NOW()
WHERE name = 'Aluminum Cans' OR name = 'Aluminium Cans' OR (category IS NOT NULL AND category = 'Metal');

-- If no metal material exists, insert the new Aluminium Cans material
INSERT INTO public.materials (
    name,
    category,
    unit,
    rate_per_kg,
    description,
    is_active
) 
SELECT 
    'Aluminium Cans',
    'Metal',
    'kg',
    18.55,
    'Clean aluminium beverage cans and containers',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.materials 
    WHERE name = 'Aluminium Cans' OR (category IS NOT NULL AND category = 'Metal')
);

-- ============================================================================
-- CREATE OR UPDATE COLLECTOR ASSIGNMENTS TABLE STRUCTURE
-- ============================================================================

-- Create collector_assignments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.collector_assignments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  collector_id UUID REFERENCES public.profiles(id) NOT NULL,
  pickup_id UUID REFERENCES public.pickups(id) NOT NULL,
  assigned_by UUID REFERENCES public.profiles(id) NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'accepted', 'in_progress', 'completed')),
  notes TEXT,
  UNIQUE(pickup_id)
);

-- Create collector_schedules table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.collector_schedules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  collector_id UUID REFERENCES public.profiles(id) NOT NULL,
  work_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  area_assigned TEXT,
  max_pickups INTEGER DEFAULT 20,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure collector_assignments table has the correct structure
-- Add missing columns if they don't exist
ALTER TABLE public.collector_assignments ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================================
-- CREATE OR UPDATE VIEWS
-- ============================================================================

-- Update the office dashboard view to be clearer about user types
CREATE OR REPLACE VIEW public.office_dashboard_view AS
SELECT 
  p.id,
  p.customer_id as user_id,  -- Keep original column name but alias for clarity
  c.full_name as customer_name,
  p.address_id,
  a.street_address as address_line1,
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

-- ============================================================================
-- CREATE ADDITIONAL VIEWS FOR OFFICE
-- ============================================================================

-- Create a comprehensive customer management view
CREATE OR REPLACE VIEW public.office_customer_management_view AS
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.first_name,
  p.last_name,
  p.phone,
  p.role,
  p.is_active,
  p.created_at,
  p.updated_at,
  COUNT(a.id) as address_count,
  COUNT(pk.id) as total_pickups,
  COUNT(pk.id) FILTER (WHERE pk.status = 'completed') as completed_pickups,
  COUNT(pk.id) FILTER (WHERE pk.status = 'submitted') as pending_pickups,
  COALESCE(SUM(pk.total_value), 0.00) as total_earnings,
  COALESCE(w.balance, 0.00) as wallet_balance,
  COALESCE(w.total_points, 0) as total_points,
  COALESCE(w.tier, 'Bronze Recycler') as tier
FROM public.profiles p
LEFT JOIN public.addresses a ON p.id = a.customer_id
LEFT JOIN public.pickups pk ON p.id = pk.customer_id
LEFT JOIN public.wallets w ON p.id = w.user_id
WHERE p.role = 'CUSTOMER'
GROUP BY p.id, p.email, p.full_name, p.first_name, p.last_name, p.username, p.phone, p.role, p.is_active, p.created_at, p.updated_at, w.balance, w.total_points, w.tier;

-- Create a collector performance view
CREATE OR REPLACE VIEW public.office_collector_performance_view AS
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.first_name,
  p.last_name,
  p.phone,
  p.role,
  p.is_active,
  p.created_at,
  p.updated_at,
  COUNT(pk.id) as total_pickups_assigned,
  COUNT(pk.id) FILTER (WHERE pk.status = 'completed') as completed_pickups,
  COUNT(pk.id) FILTER (WHERE pk.status = 'submitted') as pending_pickups,
  COALESCE(SUM(pi.total_kg), 0) as total_kg_collected,
  COALESCE(SUM(pi.total_value), 0.00) as total_value_collected,
  COUNT(DISTINCT cs.work_date) as total_work_days
FROM public.profiles p
LEFT JOIN public.pickups pk ON p.id = pk.collector_id
LEFT JOIN (
  SELECT 
    pickup_id,
    SUM(kilograms) as total_kg,
    SUM(kilograms * m.rate_per_kg) as total_value
  FROM public.pickup_items pi
  JOIN public.materials m ON pi.material_id = m.id
  GROUP BY pickup_id
) pi ON pk.id = pi.pickup_id
LEFT JOIN public.collector_schedules cs ON p.id = cs.collector_id
WHERE p.role = 'COLLECTOR'
GROUP BY p.id, p.email, p.full_name, p.first_name, p.last_name, p.username, p.phone, p.role, p.is_active, p.created_at, p.updated_at;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions on the new views
GRANT SELECT ON public.office_dashboard_view TO authenticated;
GRANT SELECT ON public.office_customer_management_view TO authenticated;
GRANT SELECT ON public.office_collector_performance_view TO authenticated;

-- ============================================================================
-- SHOW THE UPDATED VIEW STRUCTURE
-- ============================================================================

-- Show the updated view structure
SELECT 
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'office_dashboard_view'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify the updated table structures
SELECT 
  'Table Structure Verification' as test_type,
  table_name,
  COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name IN ('profiles', 'addresses', 'pickups', 'pickup_items', 'materials')
  AND table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;

-- Test the views
SELECT 
  'View Test' as test_type,
  'office_dashboard_view' as view_name,
  COUNT(*) as record_count
FROM public.office_dashboard_view
UNION ALL
SELECT 
  'View Test' as test_type,
  'office_customer_management_view' as view_name,
  COUNT(*) as record_count
FROM public.office_customer_management_view
UNION ALL
SELECT 
  'View Test' as test_type,
  'office_collector_performance_view' as view_name,
  COUNT(*) as record_count
FROM public.office_collector_performance_view;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- Office table structure update complete!
-- The following updates have been applied:
-- 1. Added missing columns to profiles table (full_name, is_active, username)
-- 2. Updated addresses table structure for consistency
-- 3. Updated pickups table structure for consistency
-- 4. Updated pickup_items table structure for consistency
-- 5. Updated materials table structure for consistency
-- 6. Created comprehensive dashboard views for office management
-- 7. Granted appropriate permissions on new views
-- 8. Added verification queries to test the updates
