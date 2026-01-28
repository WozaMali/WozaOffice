-- ============================================================================
-- FIX MATERIALS TABLE FOR WOZA MALI ADMIN DASHBOARD
-- ============================================================================
-- This script adds missing columns to the materials table

-- Step 1: Check current materials table structure
SELECT 'CURRENT MATERIALS TABLE STRUCTURE' as check_type;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'materials'
ORDER BY ordinal_position;

-- Step 2: Add missing columns if they don't exist
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
    ELSE
        RAISE NOTICE 'co2_saved_per_kg column already exists';
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
    ELSE
        RAISE NOTICE 'water_saved_per_kg column already exists';
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
    ELSE
        RAISE NOTICE 'energy_saved_per_kg column already exists';
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
    ELSE
        RAISE NOTICE 'description column already exists';
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
    ELSE
        RAISE NOTICE 'is_active column already exists';
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
    ELSE
        RAISE NOTICE 'updated_at column already exists';
    END IF;
END $$;

-- Step 3: Update existing materials with environmental impact data
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

-- Step 4: Add unique constraint on name column if it doesn't exist
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

-- Step 4.1: Insert default materials if none exist
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

-- Step 5: Verify the updated table structure
SELECT 'UPDATED MATERIALS TABLE STRUCTURE' as check_type;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'materials'
ORDER BY ordinal_position;

-- Step 6: Show current materials data
SELECT 'CURRENT MATERIALS DATA' as check_type;
SELECT 
    name,
    rate_per_kg,
    co2_saved_per_kg,
    water_saved_per_kg,
    energy_saved_per_kg,
    is_active
FROM materials
ORDER BY name;

-- Step 7: Final verification
SELECT 'FINAL VERIFICATION' as check_type;
SELECT 
    'MATERIALS TABLE STATUS' as status_type,
    (SELECT COUNT(*) FROM materials) as total_materials,
    (SELECT COUNT(*) FROM materials WHERE co2_saved_per_kg > 0) as materials_with_impact_data;
