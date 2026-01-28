-- ============================================================================
-- WOZA MALI RECYCLING MANAGEMENT SYSTEM
-- MATERIALS IMPACT & WALLET UPDATE
-- ============================================================================
-- This file extends materials with impact calculations and creates wallet_ledger
-- Run this file in your Supabase SQL editor to add the new columns and table
-- 
-- Prerequisites: Your base schema must already be installed
-- Run this AFTER running the main 00-install-all.sql file

-- ============================================================================
-- 1) EXTEND MATERIALS WITH IMPACT + POINTS MAPPING
-- ============================================================================
-- Add new columns to materials table for environmental impact and points calculation

ALTER TABLE materials
  ADD COLUMN IF NOT EXISTS co2_per_kg numeric(10,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS water_l_per_kg numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS landfill_l_per_kg numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS points_per_rand numeric(10,3) NOT NULL DEFAULT 1;

-- ============================================================================
-- 2) SEED/ADJUST IMPACT VALUES FOR EXISTING MATERIALS
-- ============================================================================
-- Update PET with realistic environmental impact values
UPDATE materials SET
  co2_per_kg = 1.7,           -- kg CO2e per kg PET
  water_l_per_kg = 30,        -- litres per kg PET
  landfill_l_per_kg = 2,      -- litres space avoided per kg
  points_per_rand = 10         -- 10 points per ZAR spent
WHERE name = 'PET';

-- Update Aluminium Cans with realistic environmental impact values
UPDATE materials SET
  co2_per_kg = 9.1,           -- kg CO2e per kg aluminium
  water_l_per_kg = 140,       -- litres per kg aluminium
  landfill_l_per_kg = 2,      -- litres space avoided per kg
  points_per_rand = 12         -- 12 points per ZAR spent
WHERE name IN ('Aluminium Cans','Cans');

-- Update HDPE with realistic values
UPDATE materials SET
  co2_per_kg = 1.5,           -- kg CO2e per kg HDPE
  water_l_per_kg = 25,        -- litres per kg HDPE
  landfill_l_per_kg = 1.8,    -- litres space avoided per kg
  points_per_rand = 10         -- 10 points per ZAR spent
WHERE name = 'HDPE';

-- Update Glass with realistic values
UPDATE materials SET
  co2_per_kg = 0.8,           -- kg CO2e per kg glass
  water_l_per_kg = 20,        -- litres per kg glass
  landfill_l_per_kg = 1.5,    -- litres space avoided per kg
  points_per_rand = 8          -- 8 points per ZAR spent
WHERE name = 'Glass';

-- Update Paper with realistic values
UPDATE materials SET
  co2_per_kg = 1.2,           -- kg CO2e per kg paper
  water_l_per_kg = 35,        -- litres per kg paper
  landfill_l_per_kg = 1.2,    -- litres space avoided per kg
  points_per_rand = 6          -- 6 points per ZAR spent
WHERE name = 'Paper';

-- Update Cardboard with realistic values
UPDATE materials SET
  co2_per_kg = 1.0,           -- kg CO2e per kg cardboard
  water_l_per_kg = 30,        -- litres per kg cardboard
  landfill_l_per_kg = 1.0,    -- litres space avoided per kg
  points_per_rand = 5          -- 5 points per ZAR spent
WHERE name = 'Cardboard';

-- Update Steel Cans with realistic values
UPDATE materials SET
  co2_per_kg = 2.1,           -- kg CO2e per kg steel
  water_l_per_kg = 40,        -- litres per kg steel
  landfill_l_per_kg = 2.2,    -- litres space avoided per kg
  points_per_rand = 8          -- 8 points per ZAR spent
WHERE name = 'Steel Cans';

-- Update LDPE with realistic values
UPDATE materials SET
  co2_per_kg = 1.3,           -- kg CO2e per kg LDPE
  water_l_per_kg = 22,        -- litres per kg LDPE
  landfill_l_per_kg = 1.6,    -- litres space avoided per kg
  points_per_rand = 9          -- 9 points per ZAR spent
WHERE name = 'LDPE';

-- Update PP with realistic values
UPDATE materials SET
  co2_per_kg = 1.6,           -- kg CO2e per kg PP
  water_l_per_kg = 28,        -- litres per kg PP
  landfill_l_per_kg = 1.9,    -- litres space avoided per kg
  points_per_rand = 11         -- 11 points per ZAR spent
WHERE name = 'PP';

-- Update Mixed Metals with realistic values
UPDATE materials SET
  co2_per_kg = 4.5,           -- kg CO2e per kg mixed metals
  water_l_per_kg = 80,        -- litres per kg mixed metals
  landfill_l_per_kg = 2.5,    -- litres space avoided per kg
  points_per_rand = 15         -- 15 points per ZAR spent
WHERE name = 'Mixed Metals';

-- ============================================================================
-- 3) CREATE WALLET LEDGER TABLE
-- ============================================================================
-- Create wallet_ledger table for tracking user points and fund allocations
-- This is auditable and append-only for transparency

CREATE TABLE IF NOT EXISTS wallet_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pickup_id uuid REFERENCES pickups(id) ON DELETE SET NULL,
  points numeric(12,3) NOT NULL DEFAULT 0,         -- loyalty points
  zar_amount numeric(10,2) NOT NULL DEFAULT 0,     -- if you credit users in ZAR
  fund_allocation numeric(10,2) NOT NULL DEFAULT 0, -- ZAR allocated to Green Scholar
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user_id ON wallet_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_pickup_id ON wallet_ledger(pickup_id);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_created_at ON wallet_ledger(created_at);

-- Enable Row Level Security
ALTER TABLE wallet_ledger ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Customers can see their own wallet entries
CREATE POLICY wallet_customer_read
ON wallet_ledger FOR SELECT
USING (user_id = auth.uid());

-- RLS Policy: Admins can see and manage all wallet entries
CREATE POLICY wallet_admin_all
ON wallet_ledger FOR ALL
USING (auth_role() = 'admin') WITH CHECK (auth_role() = 'admin');

-- ============================================================================
-- 4) UPDATE COMPLETE
-- ============================================================================
-- Materials table has been extended with impact and points mapping!
-- Wallet ledger table has been created for tracking user rewards!

-- New columns added to materials:
-- ✅ co2_per_kg - CO2 equivalent saved per kg recycled
-- ✅ water_l_per_kg - Water saved per kg recycled (litres)
-- ✅ landfill_l_per_kg - Landfill space avoided per kg (litres)
-- ✅ points_per_rand - Loyalty points earned per ZAR spent

-- New table created:
-- ✅ wallet_ledger - Tracks user points, ZAR credits, and Green Scholar fund allocations

-- Impact values have been seeded for all existing materials with realistic
-- environmental data based on recycling industry standards.

-- Your enhanced functions (compute_pickup_totals, finalize_pickup, approve_pickup)
-- will now work correctly with these new columns and table!

-- For detailed setup instructions, see SUPABASE_SETUP.md
