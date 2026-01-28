-- ============================================================================
-- VERIFY ADMIN DASHBOARD DATA
-- ============================================================================
-- This script verifies that the collection data is properly formatted for the admin dashboard

-- 1. Show the collection that should appear in admin dashboard
SELECT 'COLLECTION FOR ADMIN DASHBOARD:' as info;
SELECT 
  uc.id as collection_id,
  uc.collection_code,
  uc.customer_name,
  uc.collector_name,
  uc.status,
  uc.total_weight_kg,
  uc.total_value,
  uc.created_at,
  uc.customer_email,
  uc.pickup_address
FROM unified_collections uc
ORDER BY uc.created_at DESC;

-- 2. Show collection materials for this collection
SELECT 'COLLECTION MATERIALS:' as info;
SELECT 
  cm.id,
  cm.collection_id,
  cm.material_name,
  cm.quantity,
  cm.unit_price,
  cm.total_price,
  uc.collection_code,
  uc.customer_name
FROM collection_materials cm
JOIN unified_collections uc ON uc.id = cm.collection_id
ORDER BY cm.created_at DESC;

-- 3. Show user profiles that are referenced
SELECT 'USER PROFILES:' as info;
SELECT 
  up.id,
  up.full_name,
  up.email,
  up.role,
  up.status
FROM user_profiles up
WHERE up.id IN (
  SELECT DISTINCT customer_id FROM unified_collections WHERE customer_id IS NOT NULL
  UNION
  SELECT DISTINCT collector_id FROM unified_collections WHERE collector_id IS NOT NULL
);

-- 4. Test the exact query that admin-services.ts will run
SELECT 'ADMIN SERVICES QUERY TEST:' as info;
SELECT 
  uc.id,
  uc.customer_id,
  uc.collector_id,
  uc.status,
  uc.created_at,
  uc.updated_at,
  uc.total_weight_kg,
  uc.total_value,
  uc.customer_name,
  uc.customer_email,
  uc.customer_phone,
  uc.collector_name,
  uc.collector_phone,
  uc.pickup_address,
  uc.admin_notes
FROM unified_collections uc
ORDER BY uc.created_at DESC
LIMIT 10;

-- 5. Test collection materials query
SELECT 'COLLECTION MATERIALS QUERY TEST:' as info;
SELECT 
  cm.id,
  cm.collection_id,
  cm.quantity,
  cm.unit_price,
  cm.material_name,
  cm.material_category
FROM collection_materials cm
WHERE cm.collection_id IN (
  SELECT id FROM unified_collections ORDER BY created_at DESC LIMIT 10
);

-- 6. Verify the data structure matches what the admin dashboard expects
SELECT 'DATA STRUCTURE VERIFICATION:' as info;
SELECT 
  id as collection_id,
  customer_name,
  collector_name,
  status,
  total_weight_kg,
  total_value,
  created_at
FROM unified_collections 
LIMIT 1;
