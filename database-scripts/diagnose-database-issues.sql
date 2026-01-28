-- ============================================================================
-- DATABASE DIAGNOSTIC SCRIPT FOR WOZA MALI ADMIN DASHBOARD
-- ============================================================================
-- This script diagnoses and fixes database issues causing pickup fetch errors

-- Step 1: Check if all required tables exist
SELECT 'CHECKING TABLE EXISTENCE' as diagnostic_step;

SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('profiles', 'pickups', 'pickup_items', 'materials', 'payments', 'addresses') 
    THEN '✅ REQUIRED TABLE'
    ELSE '⚠️ OPTIONAL TABLE'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'pickups', 'pickup_items', 'materials', 'payments', 'addresses')
ORDER BY table_name;

-- Step 2: Check table structures
SELECT 'CHECKING TABLE STRUCTURES' as diagnostic_step;

-- Check profiles table structure
SELECT 'PROFILES TABLE STRUCTURE' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Check pickups table structure (if it exists)
SELECT 'PICKUPS TABLE STRUCTURE' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'pickups'
ORDER BY ordinal_position;

-- Check pickup_items table structure (if it exists)
SELECT 'PICKUP_ITEMS TABLE STRUCTURE' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'pickup_items'
ORDER BY ordinal_position;

-- Check materials table structure (if it exists)
SELECT 'MATERIALS TABLE STRUCTURE' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'materials'
ORDER BY ordinal_position;

-- Step 3: Check data counts
SELECT 'CHECKING DATA COUNTS' as diagnostic_step;

SELECT 
  'profiles' as table_name,
  (SELECT COUNT(*) FROM profiles) as record_count
UNION ALL
SELECT 
  'pickups' as table_name,
  (SELECT COUNT(*) FROM pickups) as record_count
UNION ALL
SELECT 
  'pickup_items' as table_name,
  (SELECT COUNT(*) FROM pickup_items) as record_count
UNION ALL
SELECT 
  'materials' as table_name,
  (SELECT COUNT(*) FROM materials) as record_count;

-- Step 4: Check for missing tables and create them if needed
SELECT 'CHECKING FOR MISSING TABLES' as diagnostic_step;

-- Create pickups table if it doesn't exist
CREATE TABLE IF NOT EXISTS pickups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  collector_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected', 'completed', 'cancelled')),
  pickup_date DATE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE,
  approval_note TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  payment_method TEXT,
  total_kg NUMERIC(10,2) DEFAULT 0,
  total_value NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pickup_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS pickup_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_id UUID REFERENCES pickups(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
  kilograms NUMERIC(10,2) NOT NULL CHECK (kilograms > 0),
  contamination_pct NUMERIC(5,2) DEFAULT 0 CHECK (contamination_pct >= 0 AND contamination_pct <= 100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create materials table if it doesn't exist
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  rate_per_kg NUMERIC(10,2) NOT NULL DEFAULT 0,
  co2_saved_per_kg NUMERIC(10,4) DEFAULT 0,
  water_saved_per_kg NUMERIC(10,4) DEFAULT 0,
  energy_saved_per_kg NUMERIC(10,4) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create addresses table if it doesn't exist
CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line1 TEXT NOT NULL,
  line2 TEXT,
  suburb TEXT,
  city TEXT NOT NULL,
  postal_code TEXT,
  province TEXT,
  country TEXT DEFAULT 'South Africa',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_id UUID REFERENCES pickups(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('cash', 'bank_transfer', 'mobile_money', 'card')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'failed')),
  reference_number TEXT,
  admin_notes TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Add missing columns to materials table if needed
DO $$
BEGIN
    -- Add co2_saved_per_kg column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'materials' 
        AND column_name = 'co2_saved_per_kg'
    ) THEN
        ALTER TABLE materials ADD COLUMN co2_saved_per_kg NUMERIC(10,4) DEFAULT 0;
        RAISE NOTICE 'Added co2_saved_per_kg column';
    END IF;

    -- Add water_saved_per_kg column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'materials' 
        AND column_name = 'water_saved_per_kg'
    ) THEN
        ALTER TABLE materials ADD COLUMN water_saved_per_kg NUMERIC(10,4) DEFAULT 0;
        RAISE NOTICE 'Added water_saved_per_kg column';
    END IF;

    -- Add energy_saved_per_kg column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'materials' 
        AND column_name = 'energy_saved_per_kg'
    ) THEN
        ALTER TABLE materials ADD COLUMN energy_saved_per_kg NUMERIC(10,4) DEFAULT 0;
        RAISE NOTICE 'Added energy_saved_per_kg column';
    END IF;

    -- Add description column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'materials' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE materials ADD COLUMN description TEXT;
        RAISE NOTICE 'Added description column';
    END IF;

    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'materials' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE materials ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added is_active column';
    END IF;

    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'materials' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE materials ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column';
    END IF;
END $$;

-- Step 5.1: Update existing materials with environmental impact data
UPDATE materials SET 
    co2_saved_per_kg = CASE 
        WHEN name ILIKE '%aluminium%' OR name ILIKE '%aluminum%' THEN 8.5
        WHEN name ILIKE '%plastic%' THEN 3.2
        WHEN name ILIKE '%glass%' THEN 2.1
        WHEN name ILIKE '%cardboard%' THEN 1.8
        WHEN name ILIKE '%paper%' THEN 1.5
        WHEN name ILIKE '%steel%' THEN 6.8
        ELSE 2.0
    END,
    water_saved_per_kg = CASE 
        WHEN name ILIKE '%aluminium%' OR name ILIKE '%aluminum%' THEN 2.3
        WHEN name ILIKE '%plastic%' THEN 1.8
        WHEN name ILIKE '%glass%' THEN 1.5
        WHEN name ILIKE '%cardboard%' THEN 1.2
        WHEN name ILIKE '%paper%' THEN 1.0
        WHEN name ILIKE '%steel%' THEN 2.0
        ELSE 1.5
    END,
    energy_saved_per_kg = CASE 
        WHEN name ILIKE '%aluminium%' OR name ILIKE '%aluminum%' THEN 1.2
        WHEN name ILIKE '%plastic%' THEN 0.9
        WHEN name ILIKE '%glass%' THEN 0.7
        WHEN name ILIKE '%cardboard%' THEN 0.5
        WHEN name ILIKE '%paper%' THEN 0.4
        WHEN name ILIKE '%steel%' THEN 1.0
        ELSE 0.6
    END
WHERE co2_saved_per_kg = 0 OR water_saved_per_kg = 0 OR energy_saved_per_kg = 0;

-- Step 5.2: Add unique constraint on name column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'materials_name_key' 
        AND conrelid = 'materials'::regclass
    ) THEN
        ALTER TABLE materials ADD CONSTRAINT materials_name_key UNIQUE (name);
        RAISE NOTICE 'Added unique constraint on name column';
    ELSE
        RAISE NOTICE 'Unique constraint on name column already exists';
    END IF;
END $$;

-- Step 5.3: Insert default materials if none exist
INSERT INTO materials (name, rate_per_kg, co2_saved_per_kg, water_saved_per_kg, energy_saved_per_kg, description)
VALUES 
  ('Aluminium Cans', 15.50, 8.5, 2.3, 1.2, 'Recycled aluminium beverage containers'),
  ('Plastic Bottles', 8.75, 3.2, 1.8, 0.9, 'PET plastic beverage containers'),
  ('Glass Bottles', 5.25, 2.1, 1.5, 0.7, 'Glass beverage containers'),
  ('Cardboard', 3.50, 1.8, 1.2, 0.5, 'Corrugated cardboard packaging'),
  ('Paper', 2.75, 1.5, 1.0, 0.4, 'Mixed paper and cardboard'),
  ('Steel Cans', 12.00, 6.8, 2.0, 1.0, 'Steel food and beverage containers'),
  ('Mixed Plastics', 6.25, 2.8, 1.5, 0.8, 'Mixed plastic materials')
ON CONFLICT (name) DO NOTHING;

-- Step 6: Create test data if no pickups exist
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM pickups) = 0 THEN
    -- Insert test pickups
    INSERT INTO pickups (customer_id, status, created_at, updated_at)
    SELECT 
      p.id,
      CASE (random() * 3)::int
        WHEN 0 THEN 'submitted'
        WHEN 1 THEN 'approved'
        ELSE 'completed'
      END,
      NOW() - (random() * interval '30 days'),
      NOW() - (random() * interval '10 days')
    FROM profiles p 
    WHERE p.role = 'customer'
    LIMIT 5;
    
    -- Insert test pickup items
    INSERT INTO pickup_items (pickup_id, material_id, kilograms, contamination_pct)
    SELECT 
      pu.id,
      m.id,
      (random() * 50 + 5)::numeric(10,2), -- 5-55 kg
      (random() * 10)::numeric(5,2) -- 0-10% contamination
    FROM pickups pu
    CROSS JOIN materials m
    LIMIT 20;
  END IF;
END $$;

-- Step 7: Final verification
SELECT 'FINAL VERIFICATION' as diagnostic_step;

SELECT 
  'FINAL DATA SUMMARY' as summary_type, 
  (SELECT COUNT(*) FROM pickups) as total_pickups,
  (SELECT COUNT(*) FROM pickup_items) as total_pickup_items,
  (SELECT COUNT(*) FROM profiles WHERE role = 'customer') as total_customers,
  (SELECT COUNT(*) FROM profiles WHERE role = 'collector') as total_collectors,
  (SELECT COUNT(*) FROM materials) as total_materials;

-- Show sample pickup data
SELECT 
  'SAMPLE PICKUP DATA' as data_type,
  p.id,
  p.status,
  pr.full_name as customer_name,
  COALESCE(SUM(pi.kilograms), 0) as total_kg,
  COALESCE(SUM(pi.kilograms * m.rate_per_kg), 0) as total_value
FROM pickups p
LEFT JOIN profiles pr ON p.customer_id = pr.id
LEFT JOIN pickup_items pi ON p.id = pi.pickup_id
LEFT JOIN materials m ON pi.material_id = m.id
GROUP BY p.id, p.status, pr.full_name
ORDER BY p.created_at DESC
LIMIT 5;
