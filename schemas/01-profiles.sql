-- ============================================================================
-- 01. PROFILES & AUTHENTICATION SCHEMA
-- ============================================================================
-- This file sets up the core user management system with role-based access

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
-- Central user profile table with role-based access control
CREATE TABLE profiles (
  id uuid primary key default auth.uid(),
  email text unique not null,
  full_name text,
  phone text unique,
  role text not null check (role in ('customer','collector','admin')),
  is_active boolean not null default true,
  created_at timestamptz default now()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_active ON profiles(is_active);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can only see their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (auth_role() = 'admin');

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (auth_role() = 'admin');

-- Admins can insert new profiles
CREATE POLICY "Admins can insert profiles" ON profiles
  FOR INSERT WITH CHECK (auth_role() = 'admin');

-- Admins can delete profiles
CREATE POLICY "Admins can delete profiles" ON profiles
  FOR DELETE USING (auth_role() = 'admin');

-- Additional admin profiles policy
CREATE POLICY "admin_profiles" ON profiles
  FOR ALL USING (auth_role() = 'admin') WITH CHECK (auth_role() = 'admin');

-- Function to get current user's role for RLS policies
CREATE OR REPLACE FUNCTION auth_role() 
RETURNS text 
LANGUAGE sql 
STABLE 
AS $$ 
  SELECT role FROM profiles WHERE id = auth.uid() 
$$;

-- Additional customer read policy
CREATE POLICY "customer_read_profile" ON profiles
  FOR SELECT USING (id = auth.uid());

-- ============================================================================
-- SAMPLE DATA (OPTIONAL - FOR TESTING)
-- ============================================================================
-- Uncomment these lines to insert test profiles
/*
INSERT INTO profiles (id, email, full_name, phone, role, is_active) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'admin@woza-mali.com', 'System Administrator', '+27123456789', 'admin', true),
  ('550e8400-e29b-41d4-a716-446655440002', 'collector1@woza-mali.com', 'John Collector', '+27123456790', 'collector', true),
  ('550e8400-e29b-41d4-a716-446655440003', 'customer1@woza-mali.com', 'Jane Customer', '+27123456791', 'customer', true);
*/

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE profiles IS 'Central user profile table with role-based access control';
COMMENT ON COLUMN profiles.id IS 'Unique identifier, defaults to auth.uid() for authenticated users';
COMMENT ON COLUMN profiles.role IS 'User role: customer, collector, or admin';
COMMENT ON COLUMN profiles.is_active IS 'Whether the user account is active and can access the system';
