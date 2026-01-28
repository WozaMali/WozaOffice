-- ============================================================================
-- TEST PICKUP DATA FOR WOZA MALI ADMIN DASHBOARD
-- ============================================================================
-- This script checks for existing pickup data and creates test data if needed

-- Step 1: Check existing pickup data
SELECT 'EXISTING PICKUP DATA' as check_type, COUNT(*) as count FROM pickups;
SELECT 'EXISTING PICKUP ITEMS' as check_type, COUNT(*) as count FROM pickup_items;
SELECT 'EXISTING PROFILES' as check_type, COUNT(*) as count FROM profiles;
SELECT 'EXISTING MATERIALS' as check_type, COUNT(*) as count FROM materials;

-- Step 2: Check if we have any materials
SELECT 'MATERIALS AVAILABLE' as check_type, id, name, rate_per_kg FROM materials LIMIT 5;

-- Step 3: Check if we have any customer profiles
SELECT 'CUSTOMER PROFILES' as check_type, id, full_name, email, role FROM profiles WHERE role = 'customer' LIMIT 5;

-- Step 4: Check if we have any collector profiles
SELECT 'COLLECTOR PROFILES' as check_type, id, full_name, email, role FROM profiles WHERE role = 'collector' LIMIT 5;

-- Step 5: Check existing pickups with details
SELECT 
  'EXISTING PICKUPS' as check_type,
  p.id,
  p.status,
  p.created_at,
  pr.full_name as customer_name,
  p.total_kg,
  p.total_value
FROM pickups p
LEFT JOIN profiles pr ON p.user_id = pr.id
ORDER BY p.created_at DESC
LIMIT 10;

-- Step 6: Check pickup items with material details
SELECT 
  'PICKUP ITEMS' as check_type,
  pi.id,
  pi.pickup_id,
  pi.kilograms,
  m.name as material_name,
  m.rate_per_kg
FROM pickup_items pi
LEFT JOIN materials m ON pi.material_id = m.id
ORDER BY pi.created_at DESC
LIMIT 10;

-- ============================================================================
-- CREATE TEST DATA (RUN ONLY IF NO DATA EXISTS)
-- ============================================================================

-- Uncomment the following section if you need to create test data:

/*
-- Create test materials if none exist
INSERT INTO materials (id, name, rate_per_kg, co2_saved_per_kg, water_saved_per_kg, energy_saved_per_kg)
VALUES 
  (gen_random_uuid(), 'Aluminium Cans', 15.50, 8.5, 2.3, 1.2),
  (gen_random_uuid(), 'Plastic Bottles', 8.75, 3.2, 1.8, 0.9),
  (gen_random_uuid(), 'Glass Bottles', 5.25, 2.1, 1.5, 0.7),
  (gen_random_uuid(), 'Cardboard', 3.50, 1.8, 1.2, 0.5),
  (gen_random_uuid(), 'Paper', 2.75, 1.5, 1.0, 0.4)
ON CONFLICT (name) DO NOTHING;

-- Create test customer profiles if none exist
INSERT INTO profiles (id, email, full_name, role, is_active, created_at)
VALUES 
  (gen_random_uuid(), 'customer1@test.com', 'John Smith', 'customer', true, NOW()),
  (gen_random_uuid(), 'customer2@test.com', 'Sarah Johnson', 'customer', true, NOW()),
  (gen_random_uuid(), 'customer3@test.com', 'Mike Wilson', 'customer', true, NOW())
ON CONFLICT (email) DO NOTHING;

-- Create test collector profile if none exist
INSERT INTO profiles (id, email, full_name, role, is_active, created_at)
VALUES 
  (gen_random_uuid(), 'collector1@test.com', 'David Collector', 'collector', true, NOW())
ON CONFLICT (email) DO NOTHING;

-- Create test pickups
WITH customer_ids AS (
  SELECT id FROM profiles WHERE role = 'customer' LIMIT 3
),
collector_ids AS (
  SELECT id FROM profiles WHERE role = 'collector' LIMIT 1
),
material_ids AS (
  SELECT id FROM materials LIMIT 5
)
INSERT INTO pickups (id, user_id, collector_id, status, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  c.id,
  col.id,
  CASE (random() * 3)::int
    WHEN 0 THEN 'submitted'
    WHEN 1 THEN 'approved'
    ELSE 'completed'
  END,
  NOW() - (random() * interval '30 days'),
  NOW() - (random() * interval '10 days')
FROM customer_ids c
CROSS JOIN collector_ids col
LIMIT 10;

-- Create test pickup items
WITH pickup_ids AS (
  SELECT id FROM pickups LIMIT 10
),
material_ids AS (
  SELECT id FROM materials LIMIT 5
)
INSERT INTO pickup_items (id, pickup_id, material_id, kilograms, contamination_pct, created_at)
SELECT 
  gen_random_uuid(),
  p.id,
  m.id,
  (random() * 50 + 5)::numeric(10,2), -- 5-55 kg
  (random() * 10)::numeric(5,2), -- 0-10% contamination
  NOW() - (random() * interval '30 days')
FROM pickup_ids p
CROSS JOIN material_ids m
LIMIT 50;
*/

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Final check: Show total data counts
SELECT 'FINAL DATA SUMMARY' as summary_type, 
  (SELECT COUNT(*) FROM pickups) as total_pickups,
  (SELECT COUNT(*) FROM pickup_items) as total_pickup_items,
  (SELECT COUNT(*) FROM profiles WHERE role = 'customer') as total_customers,
  (SELECT COUNT(*) FROM profiles WHERE role = 'collector') as total_collectors,
  (SELECT COUNT(*) FROM materials) as total_materials;

-- Show sample pickup data with calculated totals
SELECT 
  'SAMPLE PICKUP DATA' as data_type,
  p.id,
  p.status,
  pr.full_name as customer_name,
  COALESCE(SUM(pi.kilograms), 0) as total_kg,
  COALESCE(SUM(pi.kilograms * m.rate_per_kg), 0) as total_value
FROM pickups p
LEFT JOIN profiles pr ON p.user_id = pr.id
LEFT JOIN pickup_items pi ON p.id = pi.pickup_id
LEFT JOIN materials m ON pi.material_id = m.id
GROUP BY p.id, p.status, pr.full_name
ORDER BY p.created_at DESC
LIMIT 5;
