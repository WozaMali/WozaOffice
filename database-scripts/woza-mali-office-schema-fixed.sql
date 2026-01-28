-- ============================================================================
-- WOZA MALI OFFICE DATABASE SCHEMA (FIXED VERSION)
-- ============================================================================
-- This version handles existing objects gracefully
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ============================================================================
-- CORE USER MANAGEMENT TABLES
-- ============================================================================

-- Create profiles table for office users (admins, staff, collectors)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'STAFF', 'COLLECTOR', 'CUSTOMER')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_permissions table for granular access control
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  permission_name TEXT NOT NULL,
  granted BOOLEAN DEFAULT TRUE,
  granted_by UUID REFERENCES public.profiles(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, permission_name)
);

-- ============================================================================
-- RECYCLING MANAGEMENT TABLES
-- ============================================================================

-- Create materials table for different types of recyclable materials
CREATE TABLE IF NOT EXISTS public.materials (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  unit TEXT NOT NULL DEFAULT 'kg',
  rate_per_kg DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN DEFAULT TRUE
);

-- Create addresses table for customer pickup locations
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  line1 TEXT NOT NULL,
  suburb TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  is_primary BOOLEAN DEFAULT FALSE
);

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

-- Create collector_schedules table for work planning
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

-- Create notifications table for system alerts
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- AUDIT AND LOGGING TABLES
-- ============================================================================

-- Create user_activity_log table for audit trail
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  activity_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create system_logs table for application events
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  log_level TEXT NOT NULL CHECK (log_level IN ('debug', 'info', 'warning', 'error', 'critical')),
  component TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- VIEWS FOR COLLECTOR DASHBOARD
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
-- POLICIES (WITH EXISTING POLICY HANDLING)
-- ============================================================================

-- Drop existing policies if they exist
DO $$
BEGIN
  -- Drop profiles policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view own profile') THEN
    DROP POLICY "Users can view own profile" ON public.profiles;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Admins can view all profiles') THEN
    DROP POLICY "Admins can view all profiles" ON public.profiles;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile') THEN
    DROP POLICY "Users can update own profile" ON public.profiles;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Admins can update all profiles') THEN
    DROP POLICY "Admins can update all profiles" ON public.profiles;
  END IF;
  
  -- Drop materials policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'materials' AND policyname = 'Authenticated users can view materials') THEN
    DROP POLICY "Authenticated users can view materials" ON public.materials;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'materials' AND policyname = 'Only admins can manage materials') THEN
    DROP POLICY "Only admins can manage materials" ON public.materials;
  END IF;
  
  -- Drop pickups policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pickups' AND policyname = 'Users can view own pickups') THEN
    DROP POLICY "Users can view own pickups" ON public.pickups;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pickups' AND policyname = 'Collectors can view assigned pickups') THEN
    DROP POLICY "Collectors can view assigned pickups" ON public.pickups;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pickups' AND policyname = 'Admins and staff can view all pickups') THEN
    DROP POLICY "Admins and staff can view all pickups" ON public.pickups;
  END IF;
END $$;

-- Enable RLS on tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

    CREATE POLICY "Admins can view all profiles" ON public.profiles
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
      );

    CREATE POLICY "Users can update own profile" ON public.profiles
      FOR UPDATE USING (auth.uid() = id);

    CREATE POLICY "Admins can update all profiles" ON public.profiles
      FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
      );

-- Materials policies (read-only for all authenticated users)
    CREATE POLICY "Authenticated users can view materials" ON public.materials
      FOR SELECT USING (auth.role() = 'authenticated');

    CREATE POLICY "Only admins can manage materials" ON public.materials
      FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
      );

-- Pickups policies
    CREATE POLICY "Users can view own pickups" ON public.pickups
      FOR SELECT USING (customer_id = auth.uid());

    CREATE POLICY "Collectors can view assigned pickups" ON public.pickups
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.collector_assignments WHERE pickup_id = pickups.id AND collector_id = auth.uid())
      );

    CREATE POLICY "Admins and staff can view all pickups" ON public.pickups
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF'))
      );

-- Addresses policies
CREATE POLICY "Users can view own addresses" ON public.addresses
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Users can manage own addresses" ON public.addresses
  FOR ALL USING (profile_id = auth.uid());

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile with basic information
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name,
    role
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown User'),
    'CUSTOMER'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default admin user if not exists
INSERT INTO public.profiles (id, email, full_name, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@wozamali.com',
  'System Administrator',
  'ADMIN'
) ON CONFLICT (id) DO NOTHING;

-- Insert default materials if not exist
INSERT INTO public.materials (name, unit, rate_per_kg, is_active)
VALUES 
  ('PET Bottles', 'kg', 1.50, true),
  ('Aluminum Cans', 'kg', 1.20, true),
  ('Glass', 'kg', 0.80, true),
  ('Paper', 'kg', 0.60, true),
  ('Cardboard', 'kg', 0.40, true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

SELECT 'Schema setup completed successfully! All tables, policies, and functions have been created.' as status;
