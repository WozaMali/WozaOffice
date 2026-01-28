-- ============================================================================
-- SETUP COLLECTOR DASHBOARD - BASIC TABLES
-- ============================================================================
-- Run this script in your Supabase SQL editor to create the basic tables needed

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  full_name text,
  phone text unique,
  role text not null check (role in ('customer','collector','admin')),
  is_active boolean not null default true,
  created_at timestamptz default now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(is_active);

-- ============================================================================
-- 2. MATERIALS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS materials (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  unit text not null default 'kg',
  rate_per_kg numeric(10,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

-- Insert some basic materials
INSERT INTO materials (name, unit, rate_per_kg, is_active) VALUES
  ('Paper', 'kg', 2.50, true),
  ('Cardboard', 'kg', 1.80, true),
  ('Plastic Bottles', 'kg', 3.20, true),
  ('Glass', 'kg', 1.50, true),
  ('Metal Cans', 'kg', 4.00, true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 3. PICKUPS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS pickups (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid references profiles(id),
  collector_id uuid references profiles(id),
  address_id uuid, -- We'll create addresses table later
  started_at timestamptz default now(),
  submitted_at timestamptz,
  lat numeric(10,8),
  lng numeric(11,8),
  status text not null default 'submitted' check (status in ('submitted','approved','rejected')),
  approval_note text,
  total_kg numeric(10,2) default 0,
  total_value numeric(10,2) default 0,
  payment_status text default 'pending' check (payment_status in ('pending','paid','failed')),
  payment_method text,
  customer_name text,
  collector_name text,
  pickup_date date default current_date,
  created_at timestamptz default now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pickups_collector_id ON pickups(collector_id);
CREATE INDEX IF NOT EXISTS idx_pickups_status ON pickups(status);
CREATE INDEX IF NOT EXISTS idx_pickups_created_at ON pickups(created_at);

-- ============================================================================
-- 4. PICKUP ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS pickup_items (
  id uuid primary key default uuid_generate_v4(),
  pickup_id uuid references pickups(id) on delete cascade,
  material_id uuid references materials(id),
  kilograms numeric(10,2) not null,
  contamination_pct numeric(5,2) default 0,
  created_at timestamptz default now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pickup_items_pickup_id ON pickup_items(pickup_id);
CREATE INDEX IF NOT EXISTS idx_pickup_items_material_id ON pickup_items(material_id);

-- ============================================================================
-- 5. PICKUP PHOTOS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS pickup_photos (
  id uuid primary key default uuid_generate_v4(),
  pickup_id uuid references pickups(id) on delete cascade,
  url text not null,
  taken_at timestamptz default now(),
  lat numeric(10,8),
  lng numeric(11,8),
  type text check (type in ('scale','bags','other')),
  created_at timestamptz default now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pickup_photos_pickup_id ON pickup_photos(pickup_id);

-- ============================================================================
-- 6. INSERT SAMPLE DATA FOR TESTING
-- ============================================================================

-- Option 1: Use proper UUIDs for demo data
-- Insert a test collector profile
INSERT INTO profiles (id, email, full_name, phone, role, is_active) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'collector@demo.com', 'Demo Collector', '+27123456789', 'collector', true)
ON CONFLICT (id) DO NOTHING;

-- Insert a test customer profile
INSERT INTO profiles (id, email, full_name, phone, role, is_active) VALUES
  ('550e8400-e29b-41d4-a716-446655440002', 'customer@demo.com', 'Demo Customer', '+27123456790', 'customer', true)
ON CONFLICT (id) DO NOTHING;

-- Insert some sample pickups
INSERT INTO pickups (id, customer_id, collector_id, status, total_kg, total_value, customer_name, collector_name) VALUES
  (uuid_generate_v4(), '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'approved', 15.5, 38.75, 'Demo Customer', 'Demo Collector'),
  (uuid_generate_v4(), '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'submitted', 8.2, 20.50, 'Demo Customer', 'Demo Collector')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- ALTERNATIVE: USE REAL COLLECTOR DATA INSTEAD OF DEMO
-- ============================================================================
-- Uncomment and modify the section below to use real collector data

/*
-- Option 2: Insert your real collector profile
-- Replace the values below with your actual collector information
INSERT INTO profiles (email, full_name, phone, role, is_active) VALUES
  ('your-collector@email.com', 'Your Real Name', '+27123456789', 'collector', true)
ON CONFLICT (email) DO NOTHING;

-- Get the real collector's ID for use in pickups
-- You can use this ID in your application code instead of the demo ID
SELECT id as collector_id, full_name, email 
FROM profiles 
WHERE role = 'collector' AND email = 'your-collector@email.com';

-- Option 3: If you already have a collector profile, just reference it
-- Update the DEMO_COLLECTOR_ID in your application to use the real collector's ID
-- For example, if your collector has ID '123e4567-e89b-12d3-a456-426614174000'
-- Update the collector-services.ts file to use that ID instead of 'demo-collector-123'
*/

-- ============================================================================
-- 7. BASIC RLS POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickups ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_photos ENABLE ROW LEVEL SECURITY;

-- Basic policies (you may need to adjust these based on your auth setup)
CREATE POLICY "Allow all access for now" ON profiles FOR ALL USING (true);
CREATE POLICY "Allow all access for now" ON materials FOR ALL USING (true);
CREATE POLICY "Allow all access for now" ON pickups FOR ALL USING (true);
CREATE POLICY "Allow all access for now" ON pickup_items FOR ALL USING (true);
CREATE POLICY "Allow all access for now" ON pickup_photos FOR ALL USING (true);

-- ============================================================================
-- 8. VERIFICATION
-- ============================================================================
-- Check what was created
SELECT 'Tables Created' as status, COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'materials', 'pickups', 'pickup_items', 'pickup_photos');

SELECT 'Sample Data' as status, COUNT(*) as count FROM profiles WHERE role = 'collector';
SELECT 'Sample Pickups' as status, COUNT(*) as count FROM pickups;

-- ============================================================================
-- 9. SETTING UP REAL COLLECTOR DATA
-- ============================================================================
-- To use real collector data instead of demo data:

-- Step 1: Insert your real collector profile
-- Replace the values below with your actual collector information
/*
INSERT INTO profiles (email, full_name, phone, role, is_active) VALUES
  ('your-real-collector@email.com', 'Your Real Name', '+27123456789', 'collector', true)
ON CONFLICT (email) DO NOTHING;
*/

-- Step 2: Get your collector's ID
-- Run this query to get the UUID of your collector:
/*
SELECT id, email, full_name, role 
FROM profiles 
WHERE role = 'collector' AND email = 'your-real-collector@email.com';
*/

-- Step 3: Update your application configuration
-- In your application, update the collector-config.ts file:
-- 1. Change ACTIVE_CONFIG from DEMO_CONFIG to REAL_COLLECTOR_CONFIG
-- 2. Set your collector's email in the realCollector.email field
-- 3. Or set your collector's ID in the realCollector.id field if you prefer

-- Step 4: Insert real customer data (optional)
-- You can also insert real customer profiles:
/*
INSERT INTO profiles (email, full_name, phone, role, is_active) VALUES
  ('customer1@email.com', 'Customer Name', '+27123456790', 'customer', true)
ON CONFLICT (email) DO NOTHING;
*/

-- Step 5: Create real pickups (optional)
-- After setting up real profiles, you can create real pickups:
/*
INSERT INTO pickups (customer_id, collector_id, status, total_kg, total_value, customer_name, collector_name) 
SELECT 
  c.id as customer_id,
  col.id as collector_id,
  'submitted' as status,
  12.5 as total_kg,
  31.25 as total_value,
  c.full_name as customer_name,
  col.full_name as collector_name
FROM profiles c, profiles col
WHERE c.role = 'customer' AND c.email = 'customer1@email.com'
  AND col.role = 'collector' AND col.email = 'your-real-collector@email.com';
*/
