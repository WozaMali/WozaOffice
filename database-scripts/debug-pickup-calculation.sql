-- ============================================================================
-- DEEP DIVE DIAGNOSTIC: PICKUP TOTALS NOT CALCULATING
-- ============================================================================
-- This script will help find why pickup totals show 0 kg and 0 value

-- ============================================================================
-- STEP 1: Check the specific pickup that should have 6kg
-- ============================================================================
SELECT 
  p.id,
  p.status,
  p.total_kg,
  p.total_value,
  p.created_at,
  p.customer_id,
  p.collector_id,
  c.full_name as customer_name,
  col.full_name as collector_name
FROM pickups p
LEFT JOIN profiles c ON p.customer_id = c.id
LEFT JOIN profiles col ON p.collector_id = col.id
WHERE p.id = 'baa3d8b4-2d3a-4729-9da4-9bbd448c7d84';

-- ============================================================================
-- STEP 2: Check if pickup items exist for this pickup
-- ============================================================================
SELECT 
  pi.id,
  pi.pickup_id,
  pi.material_id,
  pi.kilograms,
  pi.contamination_pct,
  pi.notes,
  pi.created_at,
  m.name as material_name,
  m.rate_per_kg
FROM pickup_items pi
LEFT JOIN materials m ON pi.material_id = m.id
WHERE pi.pickup_id = 'baa3d8b4-2d3a-4729-9da4-9bbd448c7d84';

-- ============================================================================
-- STEP 3: Check if materials table has data
-- ============================================================================
SELECT 
  id,
  name,
  rate_per_kg,
  description
FROM materials
LIMIT 10;

-- ============================================================================
-- STEP 4: Check if triggers exist and are working
-- ============================================================================
SELECT 
  trigger_schema,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
  AND event_object_table IN ('pickup_items', 'pickups')
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- STEP 5: Check if the update function exists
-- ============================================================================
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name = 'update_pickup_totals'
AND routine_schema = 'public';

-- ============================================================================
-- STEP 6: Manually test the calculation
-- ============================================================================
-- Calculate what the total_kg should be
SELECT 
  pickup_id,
  SUM(kilograms) as calculated_total_kg,
  COUNT(*) as item_count
FROM pickup_items 
WHERE pickup_id = 'baa3d8b4-2d3a-4729-9da4-9bbd448c7d84'
GROUP BY pickup_id;

-- Calculate what the total_value should be
SELECT 
  pi.pickup_id,
  SUM(pi.kilograms * COALESCE(m.rate_per_kg, 0)) as calculated_total_value,
  COUNT(*) as item_count
FROM pickup_items pi
LEFT JOIN materials m ON pi.material_id = m.id
WHERE pi.pickup_id = 'baa3d8b4-2d3a-4729-9da4-9bbd448c7d84'
GROUP BY pi.pickup_id;

-- ============================================================================
-- STEP 7: Check if there are any pickup items at all
-- ============================================================================
SELECT 
  COUNT(*) as total_pickup_items,
  COUNT(DISTINCT pickup_id) as unique_pickups_with_items
FROM pickup_items;

-- ============================================================================
-- STEP 8: Check recent pickup items
-- ============================================================================
SELECT 
  pi.id,
  pi.pickup_id,
  pi.kilograms,
  pi.created_at,
  m.name as material_name,
  m.rate_per_kg,
  p.status as pickup_status
FROM pickup_items pi
LEFT JOIN materials m ON pi.material_id = m.id
LEFT JOIN pickups p ON pi.pickup_id = p.id
ORDER BY pi.created_at DESC
LIMIT 10;

-- ============================================================================
-- STEP 9: Check if the trigger function is working
-- ============================================================================
-- This will show if the function can be called
SELECT 
  update_pickup_totals() 
FROM pickup_items 
WHERE pickup_id = 'baa3d8b4-2d3a-4729-9da4-9bbd448c7d84'
LIMIT 1;

-- ============================================================================
-- STEP 10: Manual fix - Update the pickup totals manually
-- ============================================================================
-- Uncomment and run this to manually fix the totals
/*
UPDATE pickups 
SET 
  total_kg = (
    SELECT COALESCE(SUM(kilograms), 0) 
    FROM pickup_items 
    WHERE pickup_id = 'baa3d8b4-2d3a-4729-9da4-9bbd448c7d84'
  ),
  total_value = (
    SELECT COALESCE(SUM(pi.kilograms * COALESCE(m.rate_per_kg, 0)), 0)
    FROM pickup_items pi
    LEFT JOIN materials m ON pi.material_id = m.id
    WHERE pi.pickup_id = 'baa3d8b4-2d3a-4729-9da4-9bbd448c7d84'
  )
WHERE id = 'baa3d8b4-2d3a-4729-9da4-9bbd448c7d84';
*/
