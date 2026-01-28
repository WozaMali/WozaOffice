-- ============================================================================
-- FIX PICKUP ERROR - COMPREHENSIVE SOLUTION
-- ============================================================================
-- This script fixes the "Error fetching recent pickups: {}" issue
-- Run this in your Supabase SQL Editor after running the diagnostic script

-- ============================================================================
-- STEP 1: ENSURE PICKUPS TABLE EXISTS WITH CORRECT STRUCTURE
-- ============================================================================

-- Create pickups table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.pickups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  collector_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  address_id UUID,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  lat NUMERIC(10,8),
  lng NUMERIC(11,8),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','approved','rejected')),
  approval_note TEXT,
  total_kg NUMERIC(10,2) DEFAULT 0,
  total_value NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 2: ENSURE PROFILES TABLE EXISTS WITH CORRECT STRUCTURE
-- ============================================================================

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('customer','collector','admin')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 3: CREATE AUTH_ROLE FUNCTION IF IT DOESN'T EXIST
-- ============================================================================

-- Function to get current user's role for RLS policies
CREATE OR REPLACE FUNCTION auth_role() 
RETURNS text 
LANGUAGE sql 
STABLE 
AS $$ 
  SELECT role FROM public.profiles WHERE id = auth.uid() 
$$;

-- ============================================================================
-- STEP 4: FIX RLS POLICIES FOR PICKUPS TABLE
-- ============================================================================

-- Enable RLS on pickups table
ALTER TABLE public.pickups ENABLE ROW LEVEL SECURITY;

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Users can view related pickups" ON public.pickups;
DROP POLICY IF EXISTS "Admins can view all pickups" ON public.pickups;
DROP POLICY IF EXISTS "admin_pickups" ON public.pickups;
DROP POLICY IF EXISTS "customer_read_pickups" ON public.pickups;
DROP POLICY IF EXISTS "collector_read_own_pickups" ON public.pickups;

-- Create comprehensive admin access policy
CREATE POLICY "admin_full_access_pickups" ON public.pickups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Create customer access policy
CREATE POLICY "customer_access_pickups" ON public.pickups
  FOR SELECT USING (customer_id = auth.uid());

-- Create collector access policy
CREATE POLICY "collector_access_pickups" ON public.pickups
  FOR ALL USING (collector_id = auth.uid())
  WITH CHECK (collector_id = auth.uid());

-- ============================================================================
-- STEP 5: FIX RLS POLICIES FOR PROFILES TABLE
-- ============================================================================

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "admin_profiles" ON public.profiles;

-- Create user access policy
CREATE POLICY "user_own_profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

-- Create admin access policy
CREATE POLICY "admin_full_access_profiles" ON public.profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ============================================================================
-- STEP 6: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Create indexes on pickups table
CREATE INDEX IF NOT EXISTS idx_pickups_customer_id ON public.pickups(customer_id);
CREATE INDEX IF NOT EXISTS idx_pickups_collector_id ON public.pickups(collector_id);
CREATE INDEX IF NOT EXISTS idx_pickups_status ON public.pickups(status);
CREATE INDEX IF NOT EXISTS idx_pickups_created_at ON public.pickups(created_at);

-- Create indexes on profiles table
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ============================================================================
-- STEP 7: TEST THE FIX
-- ============================================================================

-- Test the exact query that was failing
SELECT 'TESTING PICKUP QUERY:' as info;
SELECT id, status, created_at, updated_at, customer_id
FROM public.pickups
ORDER BY created_at DESC
LIMIT 10;

-- Test admin access
SELECT 'TESTING ADMIN ACCESS:' as info;
SELECT COUNT(*) as total_pickups FROM public.pickups;

-- Test profile access
SELECT 'TESTING PROFILE ACCESS:' as info;
SELECT COUNT(*) as total_profiles FROM public.profiles;

-- ============================================================================
-- STEP 8: CREATE SAMPLE DATA IF NO DATA EXISTS
-- ============================================================================

-- Only insert sample data if no pickups exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.pickups LIMIT 1) THEN
    -- Insert sample admin user if it doesn't exist
    INSERT INTO public.profiles (id, email, full_name, role, is_active)
    VALUES (
      gen_random_uuid(),
      'admin@wozamali.com',
      'System Administrator',
      'admin',
      true
    ) ON CONFLICT (email) DO NOTHING;
    
    -- Insert sample customer if it doesn't exist
    INSERT INTO public.profiles (id, email, full_name, role, is_active)
    VALUES (
      gen_random_uuid(),
      'customer@wozamali.com',
      'Test Customer',
      'customer',
      true
    ) ON CONFLICT (email) DO NOTHING;
    
    -- Insert sample pickup if no pickups exist
    INSERT INTO public.pickups (customer_id, status, total_kg, total_value)
    SELECT 
      (SELECT id FROM public.profiles WHERE role = 'customer' LIMIT 1),
      'submitted',
      10.5,
      25.75
    WHERE EXISTS (SELECT 1 FROM public.profiles WHERE role = 'customer');
  END IF;
END $$;

-- Final test
SELECT 'FINAL TEST - PICKUP QUERY:' as info;
SELECT id, status, created_at, updated_at, customer_id
FROM public.pickups
ORDER BY created_at DESC
LIMIT 10;
