-- ============================================================================
-- WOZA MALI OFFICE - MINIMAL SCHEMA ADDITION
-- ============================================================================
-- This schema ONLY adds missing tables needed for the collector app
-- It does NOT modify your existing tables
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ADD MISSING TABLES FOR COLLECTOR APP
-- ============================================================================

-- Create pickups table for scheduled collection requests
CREATE TABLE IF NOT EXISTS public.pickups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  collector_id UUID REFERENCES public.profiles(id),
  address_id UUID REFERENCES public.addresses(id) NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected')),
  approval_note TEXT
);

-- Create pickup_items table for individual materials in each pickup
CREATE TABLE IF NOT EXISTS public.pickup_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  pickup_id UUID REFERENCES public.pickups(id) ON DELETE CASCADE NOT NULL,
  material_id UUID REFERENCES public.materials(id) NOT NULL,
  kilograms DECIMAL(10,3) CHECK (kilograms >= 0),
  contamination_pct DECIMAL(5,2) CHECK (contamination_pct BETWEEN 0 AND 100)
);

-- Create collector_assignments table for work distribution
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

-- ============================================================================
-- CREATE COLLECTOR DASHBOARD VIEW
-- ============================================================================

-- Create collector dashboard view
CREATE OR REPLACE VIEW public.collector_dashboard_view AS
SELECT 
  p.id,
  p.customer_id,
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

-- ============================================================================
-- ADD SAMPLE DATA FOR TESTING
-- ============================================================================

-- Insert sample pickup data for testing (only if tables are empty)
DO $$
BEGIN
  -- Only insert if no pickups exist
  IF NOT EXISTS (SELECT 1 FROM public.pickups LIMIT 1) THEN
    
    -- Get a sample customer and collector
    INSERT INTO public.pickups (customer_id, collector_id, address_id, status)
    SELECT 
      p1.id as customer_id,
      p2.id as collector_id,
      a.id as address_id,
      'submitted' as status
    FROM public.profiles p1
    CROSS JOIN public.profiles p2
    CROSS JOIN public.addresses a
    WHERE p1.role = 'CUSTOMER' 
      AND p2.role = 'COLLECTOR'
      AND a.profile_id = p1.id
    LIMIT 1;
    
  END IF;
END $$;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

SELECT 'Minimal schema addition completed! Collector app tables have been created.' as status;
