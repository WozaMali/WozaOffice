-- ============================================================================
-- WOZA MALI RECYCLING MANAGEMENT SYSTEM
-- COMPLETE DATABASE SCHEMA INSTALLATION
-- ============================================================================
-- This file installs the complete database schema for the recycling management system
-- Run this file in your Supabase SQL editor to set up all tables, functions, and views

-- ============================================================================
-- CLEAN INSTALLATION - DROP EXISTING TABLES IF THEY EXIST
-- ============================================================================
-- This ensures a clean installation by removing any existing tables

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS pickup_photos CASCADE;
DROP TABLE IF EXISTS pickup_items CASCADE;
DROP TABLE IF EXISTS pickups CASCADE;
DROP TABLE IF EXISTS materials CASCADE;
DROP TABLE IF EXISTS addresses CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS auth_role() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user_address() CASCADE;
DROP FUNCTION IF EXISTS create_payment_on_approval() CASCADE;
DROP FUNCTION IF EXISTS update_payment_processed_at() CASCADE;
DROP FUNCTION IF EXISTS update_pickup_totals() CASCADE;
DROP FUNCTION IF EXISTS calculate_environmental_impact(text, numeric) CASCADE;
DROP FUNCTION IF EXISTS calculate_points(text, numeric) CASCADE;
DROP FUNCTION IF EXISTS calculate_fund_allocation(numeric) CASCADE;

-- Drop views
DROP VIEW IF EXISTS customer_dashboard_view CASCADE;
DROP VIEW IF EXISTS collector_dashboard_view CASCADE;
DROP VIEW IF EXISTS admin_dashboard_view CASCADE;
DROP VIEW IF EXISTS system_impact_view CASCADE;
DROP VIEW IF EXISTS material_performance_view CASCADE;
DROP VIEW IF EXISTS collector_performance_view CASCADE;
DROP VIEW IF EXISTS customer_performance_view CASCADE;

-- ============================================================================
-- PREREQUISITES
-- ============================================================================
-- Ensure you have the required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- INSTALLATION ORDER
-- ============================================================================
-- 1. Profiles & Authentication (01-profiles.sql)
-- 2. Addresses (02-addresses.sql) 
-- 3. Materials (03-materials.sql)
-- 4. Pickups (04-pickups.sql)
-- 5. Pickup Items (05-pickup-items.sql)
-- 6. Photos (06-pickup-photos.sql)
-- 7. Payments (07-payments.sql)
-- 8. Views & Seed Data (08-views-and-seed-data.sql)

-- ============================================================================
-- STEP 1: PROFILES & AUTHENTICATION
-- ============================================================================
-- Installing Profiles & Authentication Schema...

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid primary key default auth.uid(),
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

-- Function to get current user's role for RLS policies
CREATE OR REPLACE FUNCTION auth_role() 
RETURNS text 
LANGUAGE sql 
STABLE 
AS $$ 
  SELECT role FROM profiles WHERE id = auth.uid() 
$$;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

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

-- Additional customer read policy
CREATE POLICY "customer_read_profile" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Profiles & Authentication Schema installed

-- ============================================================================
-- STEP 2: ADDRESSES
-- ============================================================================
-- Installing Addresses Schema...

-- Create addresses table
CREATE TABLE IF NOT EXISTS addresses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  line1 text not null,
  suburb text not null,
  city text not null,
  postal_code text,
  lat double precision,
  lng double precision,
  is_primary boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_addresses_profile_id ON addresses(profile_id);
CREATE INDEX IF NOT EXISTS idx_addresses_city ON addresses(city);
CREATE INDEX IF NOT EXISTS idx_addresses_suburb ON addresses(suburb);
CREATE INDEX IF NOT EXISTS idx_addresses_primary ON addresses(is_primary);
CREATE INDEX IF NOT EXISTS idx_addresses_location ON addresses(lat, lng);

-- Create constraints
CREATE UNIQUE INDEX idx_addresses_one_primary_per_profile 
  ON addresses(profile_id) 
  WHERE is_primary = true;

-- Enable RLS
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own addresses" ON addresses
  FOR ALL USING (auth.uid() = profile_id);

-- Additional customer read policy
CREATE POLICY "customer_read_addresses" ON addresses
  FOR SELECT USING (profile_id = auth.uid());

-- Create update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
CREATE TRIGGER update_addresses_updated_at 
  BEFORE UPDATE ON addresses 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create addresses when new users sign up
CREATE OR REPLACE FUNCTION public.handle_new_user_address()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.raw_user_meta_data ? 'street_address' THEN
    INSERT INTO public.addresses (
      profile_id,
      line1,
      suburb,
      city,
      postal_code,
      is_primary
    )
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'street_address',
      NEW.raw_user_meta_data->>'suburb',
      NEW.raw_user_meta_data->>'city',
      NEW.raw_user_meta_data->>'postal_code',
      true
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_address_created ON auth.users;

-- Create trigger to automatically create addresses for new users
CREATE TRIGGER on_auth_user_address_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_address();

-- Addresses Schema installed

-- ============================================================================
-- STEP 3: MATERIALS
-- ============================================================================
-- Installing Materials Schema...

-- Create materials table
CREATE TABLE IF NOT EXISTS materials (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  unit text not null default 'kg',
  rate_per_kg numeric(10,2) not null default 0,
  is_active boolean not null default true,
  description text,
  category text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_materials_name ON materials(name);
CREATE INDEX IF NOT EXISTS idx_materials_active ON materials(is_active);
CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category);
CREATE INDEX IF NOT EXISTS idx_materials_rate ON materials(rate_per_kg);

-- Create constraints
ALTER TABLE materials ADD CONSTRAINT chk_materials_rate_positive 
  CHECK (rate_per_kg >= 0);

-- Enable RLS
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view active materials" ON materials
  FOR SELECT USING (is_active = true);

CREATE POLICY "Only admins can modify materials" ON materials
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create trigger
CREATE TRIGGER update_materials_updated_at 
  BEFORE UPDATE ON materials 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample materials
INSERT INTO materials (name, unit, rate_per_kg, is_active, description, category) VALUES
  ('PET', 'kg', 1.50, true, 'Polyethylene terephthalate bottles and containers', 'Plastic'),
  ('Aluminium Cans', 'kg', 18.55, true, 'Aluminum beverage and food cans', 'Metal'),
  ('HDPE', 'kg', 2.00, true, 'High-density polyethylene containers', 'Plastic'),
  ('Glass', 'kg', 1.20, true, 'Glass bottles and containers', 'Glass'),
  ('Paper', 'kg', 0.80, true, 'Mixed paper and cardboard', 'Paper'),
  ('Cardboard', 'kg', 0.60, true, 'Corrugated cardboard boxes', 'Paper');

-- Materials Schema installed

-- ============================================================================
-- STEP 4: PICKUPS
-- ============================================================================
-- Installing Pickups Schema...

-- Create pickups table
CREATE TABLE IF NOT EXISTS pickups (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references profiles(id),
  collector_id uuid references profiles(id),
  address_id uuid references addresses(id),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  lat double precision,
  lng double precision,
  status text not null default 'submitted' check (status in ('submitted','approved','rejected')),
  approval_note text,
  total_kg numeric(10,3) default 0,
  total_value numeric(10,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pickups_customer_id ON pickups(customer_id);
CREATE INDEX IF NOT EXISTS idx_pickups_collector_id ON pickups(collector_id);
CREATE INDEX IF NOT EXISTS idx_pickups_address_id ON pickups(address_id);
CREATE INDEX IF NOT EXISTS idx_pickups_status ON pickups(status);
CREATE INDEX IF NOT EXISTS idx_pickups_started_at ON pickups(started_at);
CREATE INDEX IF NOT EXISTS idx_pickups_submitted_at ON pickups(submitted_at);
CREATE INDEX IF NOT EXISTS idx_pickups_location ON pickups(lat, lng);

-- Create constraints
ALTER TABLE pickups ADD CONSTRAINT chk_pickups_positive_values 
  CHECK (total_kg >= 0 AND total_value >= 0);

-- Enable RLS
ALTER TABLE pickups ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view related pickups" ON pickups
  FOR SELECT USING (
    auth.uid() = customer_id OR 
    auth.uid() = collector_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Collectors can manage pickups" ON pickups
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'collector'
    )
  );

CREATE POLICY "Collectors can update pickups" ON pickups
  FOR UPDATE USING (
    auth.uid() = collector_id
  );

CREATE POLICY "Admins can approve pickups" ON pickups
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Additional customer read policy
CREATE POLICY "customer_read_pickups" ON pickups
  FOR SELECT USING (customer_id = auth.uid());

-- Additional collector policies
CREATE POLICY "collector_insert_pickups" ON pickups
  FOR INSERT WITH CHECK (auth_role() = 'collector' AND collector_id = auth.uid());

CREATE POLICY "collector_read_own_pickups" ON pickups
  FOR SELECT USING (collector_id = auth.uid());

-- Additional admin pickups policy
CREATE POLICY "admin_pickups" ON pickups
  FOR ALL USING (auth_role() = 'admin') WITH CHECK (auth_role() = 'admin');

-- Create trigger
CREATE TRIGGER update_pickups_updated_at 
  BEFORE UPDATE ON pickups 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Pickups Schema installed

-- ============================================================================
-- STEP 5: PICKUP ITEMS
-- ============================================================================
-- Installing Pickup Items Schema...

-- Create pickup_items table
CREATE TABLE IF NOT EXISTS pickup_items (
  id uuid primary key default gen_random_uuid(),
  pickup_id uuid references pickups(id) on delete cascade,
  material_id uuid references materials(id),
  kilograms numeric(10,3) check (kilograms >= 0),
  contamination_pct numeric(5,2) check (contamination_pct between 0 and 100),
  notes text,
  created_at timestamptz default now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pickup_items_pickup_id ON pickup_items(pickup_id);
CREATE INDEX IF NOT EXISTS idx_pickup_items_material_id ON pickup_items(material_id);
CREATE INDEX IF NOT EXISTS idx_pickup_items_kilograms ON pickup_items(kilograms);

-- Create constraints
ALTER TABLE pickup_items ADD CONSTRAINT chk_pickup_items_positive_weight 
  CHECK (kilograms > 0);

-- Enable RLS
ALTER TABLE pickup_items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view pickup items" ON pickup_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pickups 
      WHERE pickups.id = pickup_items.pickup_id
      AND (
        pickups.customer_id = auth.uid() OR 
        pickups.collector_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role = 'admin'
        )
      )
    )
  );

CREATE POLICY "Collectors can add items" ON pickup_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM pickups 
      WHERE pickups.id = pickup_items.pickup_id
      AND pickups.collector_id = auth.uid()
    )
  );

-- Additional collector items insert policy
CREATE POLICY "collector_items_insert" ON pickup_items
  FOR INSERT WITH CHECK (
    auth_role() = 'collector' AND
    pickup_id IN (SELECT id FROM pickups WHERE collector_id = auth.uid())
  );

-- Additional admin items policy
CREATE POLICY "admin_items" ON pickup_items
  FOR ALL USING (auth_role() = 'admin') WITH CHECK (auth_role() = 'admin');

-- Create automatic calculation function
CREATE OR REPLACE FUNCTION update_pickup_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE pickups 
    SET 
        total_kg = (
            SELECT COALESCE(SUM(kilograms), 0) 
            FROM pickup_items 
            WHERE pickup_id = COALESCE(NEW.pickup_id, OLD.pickup_id)
        ),
        total_value = (
            SELECT COALESCE(SUM(pi.kilograms * m.rate_per_kg), 0)
            FROM pickup_items pi
            JOIN materials m ON pi.material_id = m.id
            WHERE pi.pickup_id = COALESCE(NEW.pickup_id, OLD.pickup_id)
        )
    WHERE id = COALESCE(NEW.pickup_id, OLD.pickup_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_update_pickup_totals_insert
    AFTER INSERT ON pickup_items
    FOR EACH ROW
    EXECUTE FUNCTION update_pickup_totals();

CREATE TRIGGER trigger_update_pickup_totals_update
    AFTER UPDATE ON pickup_items
    FOR EACH ROW
    EXECUTE FUNCTION update_pickup_totals();

CREATE TRIGGER trigger_update_pickup_totals_delete
    AFTER DELETE ON pickup_items
    FOR EACH ROW
    EXECUTE FUNCTION update_pickup_totals();

-- Pickup Items Schema installed

-- ============================================================================
-- STEP 6: PHOTOS
-- ============================================================================
-- Installing Photos Schema...

-- Create pickup_photos table
CREATE TABLE IF NOT EXISTS pickup_photos (
  id uuid primary key default gen_random_uuid(),
  pickup_id uuid references pickups(id) on delete cascade,
  url text not null,
  taken_at timestamptz not null default now(),
  lat double precision,
  lng double precision,
  type text check (type in ('scale','bags','other')),
  description text,
  file_size integer,
  mime_type text,
  created_at timestamptz default now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pickup_photos_pickup_id ON pickup_photos(pickup_id);
CREATE INDEX IF NOT EXISTS idx_pickup_photos_type ON pickup_photos(type);
CREATE INDEX IF NOT EXISTS idx_pickup_photos_taken_at ON pickup_photos(taken_at);
CREATE INDEX IF NOT EXISTS idx_pickup_photos_location ON pickup_photos(lat, lng);

-- Create constraints
ALTER TABLE pickup_photos ADD CONSTRAINT chk_pickup_photos_valid_url 
  CHECK (url ~ '^https?://');

ALTER TABLE pickup_photos ADD CONSTRAINT chk_pickup_photos_file_size 
  CHECK (file_size > 0);

-- Enable RLS
ALTER TABLE pickup_photos ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view pickup photos" ON pickup_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pickups 
      WHERE pickups.id = pickup_photos.pickup_id
      AND (
        pickups.customer_id = auth.uid() OR 
        pickups.collector_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role = 'admin'
        )
      )
    )
  );

CREATE POLICY "Collectors can add photos" ON pickup_photos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM pickups 
      WHERE pickups.id = pickup_photos.pickup_id
      AND pickups.collector_id = auth.uid()
    )
  );

-- Additional collector photos insert policy
CREATE POLICY "collector_photos_insert" ON pickup_photos
  FOR INSERT WITH CHECK (
    auth_role() = 'collector' AND
    pickup_id IN (SELECT id FROM pickups WHERE collector_id = auth.uid())
  );

-- Additional admin photos policy
CREATE POLICY "admin_photos" ON pickup_photos
  FOR ALL USING (auth_role() = 'admin') WITH CHECK (auth_role() = 'admin');

-- Create mime type function
CREATE OR REPLACE FUNCTION set_default_mime_type()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.mime_type IS NULL THEN
        CASE 
            WHEN NEW.url LIKE '%.jpg' OR NEW.url LIKE '%.jpeg' THEN
                NEW.mime_type := 'image/jpeg';
            WHEN NEW.url LIKE '%.png' THEN
                NEW.mime_type := 'image/png';
            WHEN NEW.url LIKE '%.gif' THEN
                NEW.mime_type := 'image/gif';
            WHEN NEW.url LIKE '%.webp' THEN
                NEW.mime_type := 'image/webp';
            ELSE
                NEW.mime_type := 'image/jpeg';
        END CASE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_set_mime_type
    BEFORE INSERT ON pickup_photos
    FOR EACH ROW
    EXECUTE FUNCTION set_default_mime_type();

-- Photos Schema installed

-- ============================================================================
-- STEP 7: PAYMENTS
-- ============================================================================
-- Installing Payments Schema...

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid primary key default gen_random_uuid(),
  pickup_id uuid unique references pickups(id) on delete cascade,
  amount numeric(10,2) not null check (amount >= 0),
  currency text not null default 'ZAR',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  processed_at timestamptz,
  method text check (method in ('wallet','bank_transfer','cash','mobile_money')),
  reference_number text,
  admin_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payments_pickup_id ON payments(pickup_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(method);
CREATE INDEX IF NOT EXISTS idx_payments_processed_at ON payments(processed_at);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference_number);

-- Create constraints
ALTER TABLE payments ADD CONSTRAINT chk_payments_positive_amount 
  CHECK (amount > 0);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view payments" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pickups 
      WHERE pickups.id = payments.pickup_id
      AND (
        pickups.customer_id = auth.uid() OR 
        pickups.collector_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role = 'admin'
        )
      )
    )
  );

CREATE POLICY "Only admins can modify payments" ON payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Additional admin policies
CREATE POLICY "admin_payments" ON payments
  FOR ALL USING (auth_role() = 'admin') WITH CHECK (auth_role() = 'admin');

-- Create automatic payment creation function
CREATE OR REPLACE FUNCTION create_payment_on_approval()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        INSERT INTO payments (pickup_id, amount, currency, status, method)
        VALUES (NEW.id, NEW.total_value, 'ZAR', 'pending', 'wallet');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_create_payment_on_approval
    AFTER UPDATE ON pickups
    FOR EACH ROW
    EXECUTE FUNCTION create_payment_on_approval();

-- Create payment processing function
CREATE OR REPLACE FUNCTION update_payment_processed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        NEW.processed_at := now();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_payment_processed_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_processed_at();

-- Create trigger
CREATE TRIGGER update_payments_updated_at 
  BEFORE UPDATE ON payments 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Payments Schema installed

-- ============================================================================
-- STEP 8: VIEWS & SEED DATA
-- ============================================================================
-- Installing Views & Seed Data...

-- ============================================================================
-- SEED MATERIAL RATES
-- ============================================================================
-- Seeding material rates and updating existing materials...

-- Update existing materials with correct rates
UPDATE materials SET 
  rate_per_kg = 1.50,
  description = 'Polyethylene terephthalate bottles and containers',
  category = 'Plastic'
WHERE name = 'PET';

UPDATE materials SET 
  rate_per_kg = 18.55,
  description = 'Aluminum beverage and food cans',
  category = 'Metal'
WHERE name = 'Aluminium Cans';

UPDATE materials SET 
  rate_per_kg = 2.00,
  description = 'High-density polyethylene containers',
  category = 'Plastic'
WHERE name = 'HDPE';

UPDATE materials SET 
  rate_per_kg = 1.20,
  description = 'Glass bottles and containers',
  category = 'Glass'
WHERE name = 'Glass';

UPDATE materials SET 
  rate_per_kg = 0.80,
  description = 'Mixed paper and cardboard',
  category = 'Paper'
WHERE name = 'Paper';

UPDATE materials SET 
  rate_per_kg = 0.60,
  description = 'Corrugated cardboard boxes',
  category = 'Paper'
WHERE name = 'Cardboard';

-- Insert additional materials if they don't exist
INSERT INTO materials (name, unit, rate_per_kg, is_active, description, category) VALUES
  ('Steel Cans', 'kg', 2.50, true, 'Steel food and beverage cans', 'Metal'),
  ('LDPE', 'kg', 1.80, true, 'Low-density polyethylene bags and films', 'Plastic'),
  ('PP', 'kg', 2.20, true, 'Polypropylene containers and packaging', 'Plastic'),
  ('Mixed Metals', 'kg', 5.00, true, 'Mixed metal scrap and items', 'Metal')
ON CONFLICT (name) DO NOTHING;

-- Material rates seeded

-- ============================================================================
-- IMPACT CALCULATION FUNCTIONS
-- ============================================================================
-- Creating impact calculation functions...

-- Function to calculate environmental impact for a given weight and material
CREATE OR REPLACE FUNCTION calculate_environmental_impact(
  material_name text,
  weight_kg numeric
) RETURNS json AS $$
DECLARE
  impact json;
BEGIN
  -- Environmental impact factors (kg CO2 saved per kg of material)
  -- These are approximate values based on recycling industry standards
  CASE material_name
    WHEN 'PET' THEN
      impact := json_build_object(
        'co2_saved', weight_kg * 2.5,  -- 2.5 kg CO2 saved per kg PET
        'water_saved', weight_kg * 25,  -- 25L water saved per kg PET
        'landfill_saved', weight_kg * 0.8,  -- 0.8 kg landfill saved per kg PET
        'trees_equivalent', round((weight_kg * 2.5) / 22.0, 2)  -- 22 kg CO2 = 1 tree
      );
    WHEN 'Aluminium Cans' THEN
      impact := json_build_object(
        'co2_saved', weight_kg * 8.0,  -- 8.0 kg CO2 saved per kg aluminum
        'water_saved', weight_kg * 40,  -- 40L water saved per kg aluminum
        'landfill_saved', weight_kg * 0.9,  -- 0.9 kg landfill saved per kg aluminum
        'trees_equivalent', round((weight_kg * 8.0) / 22.0, 2)
      );
    WHEN 'HDPE' THEN
      impact := json_build_object(
        'co2_saved', weight_kg * 2.0,  -- 2.0 kg CO2 saved per kg HDPE
        'water_saved', weight_kg * 20,  -- 20L water saved per kg HDPE
        'landfill_saved', weight_kg * 0.7,  -- 0.7 kg landfill saved per kg HDPE
        'trees_equivalent', round((weight_kg * 2.0) / 22.0, 2)
      );
    WHEN 'Glass' THEN
      impact := json_build_object(
        'co2_saved', weight_kg * 1.2,  -- 1.2 kg CO2 saved per kg glass
        'water_saved', weight_kg * 15,  -- 15L water saved per kg glass
        'landfill_saved', weight_kg * 0.6,  -- 0.6 kg landfill saved per kg glass
        'trees_equivalent', round((weight_kg * 1.2) / 22.0, 2)
      );
    WHEN 'Paper', 'Cardboard' THEN
      impact := json_build_object(
        'co2_saved', weight_kg * 1.8,  -- 1.8 kg CO2 saved per kg paper
        'water_saved', weight_kg * 30,  -- 30L water saved per kg paper
        'landfill_saved', weight_kg * 0.5,  -- 0.5 kg landfill saved per kg paper
        'trees_equivalent', round((weight_kg * 1.8) / 22.0, 2)
      );
    ELSE
      impact := json_build_object(
        'co2_saved', weight_kg * 1.5,  -- Default impact
        'water_saved', weight_kg * 20,
        'landfill_saved', weight_kg * 0.6,
        'trees_equivalent', round((weight_kg * 1.5) / 22.0, 2)
      );
  END CASE;
  
  RETURN impact;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate points for a given weight and material
CREATE OR REPLACE FUNCTION calculate_points(
  material_name text,
  weight_kg numeric
) RETURNS integer AS $$
DECLARE
  base_points integer;
BEGIN
  -- Base points per kg for different materials
  CASE material_name
    WHEN 'PET' THEN base_points := 15;
    WHEN 'Aluminium Cans' THEN base_points := 185;
    WHEN 'HDPE' THEN base_points := 20;
    WHEN 'Glass' THEN base_points := 12;
    WHEN 'Paper' THEN base_points := 8;
    WHEN 'Cardboard' THEN base_points := 6;
    ELSE base_points := 10;
  END CASE;
  
  RETURN round(weight_kg * base_points);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate fund allocation (Green Scholar Fund)
CREATE OR REPLACE FUNCTION calculate_fund_allocation(
  total_value numeric
) RETURNS json AS $$
DECLARE
  fund_allocation json;
BEGIN
  -- Allocate 70% to Green Scholar Fund, 30% to user wallet
  fund_allocation := json_build_object(
    'green_scholar_fund', round(total_value * 0.7, 2),
    'user_wallet', round(total_value * 0.3, 2),
    'total_value', total_value
  );
  
  RETURN fund_allocation;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Impact calculation functions created

-- ============================================================================
-- COMPREHENSIVE DASHBOARD VIEWS
-- ============================================================================
-- Creating comprehensive dashboard views...

-- ============================================================================
-- CUSTOMER DASHBOARD VIEW
-- ============================================================================
CREATE OR REPLACE VIEW public.customer_dashboard_view AS
SELECT
  p.id AS pickup_id,
  p.status,
  p.started_at,
  p.submitted_at,
  p.total_kg,
  p.total_value,
  -- Environmental impact
  (SELECT json_build_object(
    'co2_saved', SUM(CAST(calculate_environmental_impact(m.name, pi.kilograms)->>'co2_saved' AS numeric)),
    'water_saved', SUM(CAST(calculate_environmental_impact(m.name, pi.kilograms)->>'water_saved' AS numeric)),
    'landfill_saved', SUM(CAST(calculate_environmental_impact(m.name, pi.kilograms)->>'landfill_saved' AS numeric)),
    'trees_equivalent', SUM(CAST(calculate_environmental_impact(m.name, pi.kilograms)->>'trees_equivalent' AS numeric))
  ) FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id) AS environmental_impact,
  -- Fund allocation
  calculate_fund_allocation(p.total_value) AS fund_allocation,
  -- Total points earned
  (SELECT SUM(calculate_points(m.name, pi.kilograms)) FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id) AS total_points,
  -- Material breakdown
  (SELECT json_agg(json_build_object(
    'material_name', m.name,
    'weight_kg', pi.kilograms,
    'rate_per_kg', m.rate_per_kg,
    'value', pi.kilograms * m.rate_per_kg,
    'points', calculate_points(m.name, pi.kilograms),
    'impact', calculate_environmental_impact(m.name, pi.kilograms)
  )) FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id) AS materials_breakdown,
  -- Photo count
  (SELECT COUNT(*) FROM pickup_photos ph WHERE ph.pickup_id = p.id) AS photo_count,
  -- Collector info
  co.full_name AS collector_name,
  co.phone AS collector_phone,
  -- Address info
  a.line1, a.suburb, a.city, a.postal_code
FROM pickups p
LEFT JOIN profiles co ON co.id = p.collector_id
LEFT JOIN addresses a ON a.id = p.address_id
WHERE p.customer_id = auth.uid();

-- ============================================================================
-- COLLECTOR DASHBOARD VIEW
-- ============================================================================
CREATE OR REPLACE VIEW public.collector_dashboard_view AS
SELECT
  p.id AS pickup_id,
  p.status,
  p.started_at,
  p.submitted_at,
  p.total_kg,
  p.total_value,
  -- Customer info
  cu.full_name AS customer_name,
  cu.email AS customer_email,
  cu.phone AS customer_phone,
  -- Address info
  a.line1, a.suburb, a.city, a.postal_code,
  -- Environmental impact
  (SELECT json_build_object(
    'co2_saved', SUM(CAST(calculate_environmental_impact(m.name, pi.kilograms)->>'co2_saved' AS numeric)),
    'water_saved', SUM(CAST(calculate_environmental_impact(m.name, pi.kilograms)->>'water_saved' AS numeric)),
    'landfill_saved', SUM(CAST(calculate_environmental_impact(m.name, pi.kilograms)->>'landfill_saved' AS numeric)),
    'trees_equivalent', SUM(CAST(calculate_environmental_impact(m.name, pi.kilograms)->>'trees_equivalent' AS numeric))
  ) FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id) AS environmental_impact,
  -- Fund allocation
  calculate_fund_allocation(p.total_value) AS fund_allocation,
  -- Total points earned
  (SELECT SUM(calculate_points(m.name, pi.kilograms)) FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id) AS total_points,
  -- Material breakdown
  (SELECT json_agg(json_build_object(
    'material_name', m.name,
    'weight_kg', pi.kilograms,
    'rate_per_kg', m.rate_per_kg,
    'value', pi.kilograms * m.rate_per_kg,
    'points', calculate_points(m.name, pi.kilograms),
    'impact', calculate_environmental_impact(m.name, pi.kilograms)
  )) FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id) AS materials_breakdown,
  -- Photo count
  (SELECT COUNT(*) FROM pickup_photos ph WHERE ph.pickup_id = p.id) AS photo_count,
  -- Payment info
  pay.status AS payment_status,
  pay.amount AS payment_amount,
  pay.method AS payment_method
FROM pickups p
LEFT JOIN profiles cu ON cu.id = p.customer_id
LEFT JOIN addresses a ON a.id = p.address_id
LEFT JOIN payments pay ON pay.pickup_id = p.id
WHERE p.collector_id = auth.uid();

-- ============================================================================
-- ADMIN DASHBOARD VIEW (Enhanced)
-- ============================================================================
CREATE OR REPLACE VIEW public.admin_dashboard_view AS
SELECT
  p.id AS pickup_id,
  p.status,
  p.started_at,
  p.submitted_at,
  p.total_kg,
  p.total_value,
  -- Customer info
  cu.full_name AS customer_name,
  cu.email AS customer_email,
  cu.phone AS customer_phone,
  -- Collector info
  co.full_name AS collector_name,
  co.phone AS collector_phone,
  -- Address info
  a.line1, a.suburb, a.city, a.postal_code,
  -- Environmental impact
  (SELECT json_build_object(
    'co2_saved', SUM(CAST(calculate_environmental_impact(m.name, pi.kilograms)->>'co2_saved' AS numeric)),
    'water_saved', SUM(CAST(calculate_environmental_impact(m.name, pi.kilograms)->>'water_saved' AS numeric)),
    'landfill_saved', SUM(CAST(calculate_environmental_impact(m.name, pi.kilograms)->>'landfill_saved' AS numeric)),
    'trees_equivalent', SUM(CAST(calculate_environmental_impact(m.name, pi.kilograms)->>'trees_equivalent' AS numeric))
  ) FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id) AS environmental_impact,
  -- Fund allocation
  calculate_fund_allocation(p.total_value) AS fund_allocation,
  -- Total points earned
  (SELECT SUM(calculate_points(m.name, pi.kilograms)) FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id) AS total_points,
  -- Material breakdown
  (SELECT json_agg(json_build_object(
    'material_name', m.name,
    'weight_kg', pi.kilograms,
    'rate_per_kg', m.rate_per_kg,
    'value', pi.kilograms * m.rate_per_kg,
    'points', calculate_points(m.name, pi.kilograms),
    'impact', calculate_environmental_impact(m.name, pi.kilograms)
  )) FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id) AS materials_breakdown,
  -- Photo count
  (SELECT COUNT(*) FROM pickup_photos ph WHERE ph.pickup_id = p.id) AS photo_count,
  -- Payment info
  pay.status AS payment_status,
  pay.amount AS payment_amount,
  pay.method AS payment_method,
  pay.processed_at AS payment_processed_at,
  -- Approval info
  p.approval_note
FROM pickups p
LEFT JOIN profiles cu ON cu.id = p.customer_id
LEFT JOIN profiles co ON co.id = p.collector_id
LEFT JOIN addresses a ON a.id = p.address_id
LEFT JOIN payments pay ON pay.pickup_id = p.id;

-- ============================================================================
-- ANALYTICS VIEWS FOR DASHBOARDS
-- ============================================================================
-- Creating analytics views...

-- Overall system impact view
CREATE OR REPLACE VIEW public.system_impact_view AS
SELECT
  COUNT(DISTINCT p.id) AS total_pickups,
  COUNT(DISTINCT p.customer_id) AS unique_customers,
  COUNT(DISTINCT p.collector_id) AS unique_collectors,
  SUM(p.total_kg) AS total_kg_collected,
  SUM(p.total_value) AS total_value_generated,
  -- Environmental impact totals
  SUM(CAST((SELECT calculate_environmental_impact(m.name, pi.kilograms)->>'co2_saved' FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id) AS numeric)) AS total_co2_saved,
  SUM(CAST((SELECT calculate_environmental_impact(m.name, pi.kilograms)->>'water_saved' FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id) AS numeric)) AS total_water_saved,
  SUM(CAST((SELECT calculate_environmental_impact(m.name, pi.kilograms)->>'landfill_saved' FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id) AS numeric)) AS total_landfill_saved,
  SUM(CAST((SELECT calculate_environmental_impact(m.name, pi.kilograms)->>'trees_equivalent' FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id) AS numeric)) AS total_trees_equivalent,
  -- Fund allocation totals
  SUM(CAST(calculate_fund_allocation(p.total_value)->>'green_scholar_fund' AS numeric)) AS total_green_scholar_fund,
  SUM(CAST(calculate_fund_allocation(p.total_value)->>'user_wallet' AS numeric)) AS total_user_wallet_fund,
  -- Points totals
  SUM((SELECT SUM(calculate_points(m.name, pi.kilograms)) FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id)) AS total_points_generated,
  -- Status breakdown
  COUNT(CASE WHEN p.status = 'submitted' THEN 1 END) AS pending_pickups,
  COUNT(CASE WHEN p.status = 'approved' THEN 1 END) AS approved_pickups,
  COUNT(CASE WHEN p.status = 'rejected' THEN 1 END) AS rejected_pickups
FROM pickups p;

-- Material performance view
CREATE OR REPLACE VIEW public.material_performance_view AS
SELECT
  m.name AS material_name,
  m.category,
  m.rate_per_kg,
  COUNT(DISTINCT pi.pickup_id) AS pickup_count,
  SUM(pi.kilograms) AS total_kg_collected,
  SUM(pi.kilograms * m.rate_per_kg) AS total_value_generated,
  AVG(pi.kilograms) AS avg_kg_per_pickup,
  -- Environmental impact
  SUM(CAST(calculate_environmental_impact(m.name, pi.kilograms)->>'co2_saved' AS numeric)) AS total_co2_saved,
  SUM(CAST(calculate_environmental_impact(m.name, pi.kilograms)->>'water_saved' AS numeric)) AS total_water_saved,
  SUM(CAST(calculate_environmental_impact(m.name, pi.kilograms)->>'landfill_saved' AS numeric)) AS total_landfill_saved,
  -- Points generated
  SUM(calculate_points(m.name, pi.kilograms)) AS total_points_generated
FROM materials m
LEFT JOIN pickup_items pi ON pi.material_id = m.id
LEFT JOIN pickups p ON p.id = pi.pickup_id
WHERE m.is_active = true
GROUP BY m.id, m.name, m.category, m.rate_per_kg
ORDER BY total_kg_collected DESC;

-- Collector performance view
CREATE OR REPLACE VIEW public.collector_performance_view AS
SELECT
  co.id AS collector_id,
  co.full_name AS collector_name,
  co.email AS collector_email,
  co.phone AS collector_phone,
  COUNT(DISTINCT p.id) AS total_pickups,
  SUM(p.total_kg) AS total_kg_collected,
  SUM(p.total_value) AS total_value_generated,
  -- Environmental impact
  SUM(CAST((SELECT calculate_environmental_impact(m.name, pi.kilograms)->>'co2_saved' FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id) AS numeric)) AS total_co2_saved,
  SUM(CAST((SELECT calculate_environmental_impact(m.name, pi.kilograms)->>'water_saved' FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id) AS numeric)) AS total_water_saved,
  -- Points generated
  SUM((SELECT SUM(calculate_points(m.name, pi.kilograms)) FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id)) AS total_points_generated,
  -- Status breakdown
  COUNT(CASE WHEN p.status = 'submitted' THEN 1 END) AS pending_pickups,
  COUNT(CASE WHEN p.status = 'approved' THEN 1 END) AS approved_pickups,
  COUNT(CASE WHEN p.status = 'rejected' THEN 1 END) AS rejected_pickups,
  -- Recent activity
  MAX(p.submitted_at) AS last_pickup_date
FROM profiles co
LEFT JOIN pickups p ON p.collector_id = co.id
WHERE co.role = 'collector'
GROUP BY co.id, co.full_name, co.email, co.phone
ORDER BY total_kg_collected DESC;

-- Customer performance view
CREATE OR REPLACE VIEW public.customer_performance_view AS
SELECT
  cu.id AS customer_id,
  cu.full_name AS customer_name,
  cu.email AS customer_email,
  cu.phone AS customer_phone,
  COUNT(DISTINCT p.id) AS total_pickups,
  SUM(p.total_kg) AS total_kg_recycled,
  SUM(p.total_value) AS total_value_earned,
  -- Environmental impact
  SUM(CAST((SELECT calculate_environmental_impact(m.name, pi.kilograms)->>'co2_saved' FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id) AS numeric)) AS total_co2_saved,
  SUM(CAST((SELECT calculate_environmental_impact(m.name, pi.kilograms)->>'water_saved' FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id) AS numeric)) AS total_water_saved,
  -- Points earned
  SUM((SELECT SUM(calculate_points(m.name, pi.kilograms)) FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id)) AS total_points_earned,
  -- Fund allocation
  SUM(CAST(calculate_fund_allocation(p.total_value)->>'green_scholar_fund' AS numeric)) AS total_green_scholar_contribution,
  SUM(CAST(calculate_fund_allocation(p.total_value)->>'user_wallet' AS numeric)) AS total_wallet_balance,
  -- Recent activity
  MAX(p.submitted_at) AS last_recycling_date
FROM profiles cu
LEFT JOIN pickups p ON p.customer_id = cu.id
WHERE cu.role = 'customer'
GROUP BY cu.id, cu.full_name, cu.email, cu.phone
ORDER BY total_kg_recycled DESC;

-- Analytics views created

-- ============================================================================
-- ENHANCED FUNCTIONS FOR PICKUP MANAGEMENT
-- ============================================================================
-- Additional functions for improved pickup workflow and calculations

-- Helper: compute totals for a pickup from its items and materials
CREATE OR REPLACE FUNCTION public.compute_pickup_totals(p_pickup_id uuid)
RETURNS TABLE (
  total_kg numeric,
  total_value_zar numeric,
  total_points numeric,
  total_co2_kg numeric,
  total_water_l numeric,
  total_landfill_l numeric
) AS $$
  SELECT
    COALESCE(SUM(pi.kilograms), 0)                                        AS total_kg,
    COALESCE(SUM(pi.kilograms * m.rate_per_kg), 0)                        AS total_value_zar,
    COALESCE(SUM(pi.kilograms * m.rate_per_kg * m.points_per_rand), 0)    AS total_points,
    COALESCE(SUM(pi.kilograms * m.co2_per_kg), 0)                         AS total_co2_kg,
    COALESCE(SUM(pi.kilograms * m.water_l_per_kg), 0)                     AS total_water_l,
    COALESCE(SUM(pi.kilograms * m.landfill_l_per_kg), 0)                  AS total_landfill_l
  FROM pickup_items pi
  JOIN materials m ON m.id = pi.material_id
  WHERE pi.pickup_id = p_pickup_id;
$$ LANGUAGE sql STABLE;

-- Collector: finalize (locks) a pickup after photos/items are in
CREATE OR REPLACE FUNCTION public.finalize_pickup(p_pickup_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_collector uuid;
  v_photo_count int;
BEGIN
  SELECT collector_id INTO v_collector FROM pickups WHERE id = p_pickup_id;
  IF v_collector IS NULL OR v_collector <> auth.uid() THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  SELECT COUNT(*) INTO v_photo_count FROM pickup_photos WHERE pickup_id = p_pickup_id;
  IF v_photo_count < 2 THEN
    RAISE EXCEPTION 'At least 2 photos required';
  END IF;

  UPDATE pickups
    SET submitted_at = COALESCE(submitted_at, now()),
        status = 'submitted'
  WHERE id = p_pickup_id;

  RETURN p_pickup_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_pickup(uuid) TO authenticated;

-- Admin: approve and write payments + wallet + impact
CREATE OR REPLACE FUNCTION public.approve_pickup(p_pickup_id uuid, p_admin_id uuid)
RETURNS TABLE (
  pickup_id uuid,
  total_value_zar numeric,
  total_points numeric,
  total_co2_kg numeric,
  total_water_l numeric,
  total_landfill_l numeric
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_customer uuid;
  v_value numeric;
  v_points numeric;
  v_co2 numeric;
  v_water numeric;
  v_landfill numeric;
BEGIN
  -- Verify admin
  SELECT role = 'admin' INTO v_is_admin FROM profiles WHERE id = p_admin_id;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admin can approve';
  END IF;

  -- Compute totals
  SELECT t.total_value_zar, t.total_points, t.total_co2_kg, t.total_water_l, t.total_landfill_l
  INTO v_value, v_points, v_co2, v_water, v_landfill
  FROM compute_pickup_totals(p_pickup_id) t;

  -- Update pickup status
  UPDATE pickups
    SET status = 'approved',
        submitted_at = COALESCE(submitted_at, now())
  WHERE id = p_pickup_id;

  -- Find customer
  SELECT customer_id INTO v_customer FROM pickups WHERE id = p_pickup_id;

  -- Record payment row (for audit; adjust if you pay users directly)
  INSERT INTO payments (pickup_id, amount, currency, status, processed_at, method)
  VALUES (p_pickup_id, COALESCE(v_value, 0), 'ZAR', 'approved', now(), 'internal')
  ON CONFLICT (pickup_id) DO UPDATE
    SET amount = EXCLUDED.amount, status = 'approved', processed_at = now();

  -- Credit wallet with points; allocate fund to Green Scholar (v_value)
  INSERT INTO wallet_ledger (user_id, pickup_id, points, zar_amount, fund_allocation, description)
  VALUES (v_customer, p_pickup_id, COALESCE(v_points,0), 0, COALESCE(v_value,0), 'Pickup approved');

  RETURN QUERY
    SELECT p_pickup_id, v_value, v_points, v_co2, v_water, v_landfill;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_pickup(uuid, uuid) TO authenticated;

-- ============================================================================
-- INSTALLATION COMPLETE
-- ============================================================================
-- DATABASE SCHEMA INSTALLATION COMPLETE!

-- Your recycling management system is now ready with:
-- ✅ User profiles with role-based access
-- ✅ Address management with geolocation
-- ✅ Materials with dynamic pricing
-- ✅ Pickup workflow management
-- ✅ Material tracking with contamination
-- ✅ Photo management with GPS
-- ✅ Payment processing automation

-- Next steps:
-- 1. Set up Supabase authentication
-- 2. Configure your environment variables
-- 3. Test the system with your application

-- For detailed setup instructions, see SUPABASE_SETUP.md
