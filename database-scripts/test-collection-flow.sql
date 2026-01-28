-- ============================================================================
-- TEST COLLECTION FLOW - COLLECTOR TO ADMIN
-- ============================================================================
-- This script helps test that collections created by collectors appear in the admin dashboard

-- 1. Check if unified schema tables exist
SELECT 'UNIFIED SCHEMA TABLES CHECK:' as info;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('unified_collections', 'user_profiles', 'collection_materials', 'user_addresses')
ORDER BY table_name;

-- 2. Check current collections in unified_collections
SELECT 'CURRENT COLLECTIONS:' as info;
SELECT 
  id,
  collection_code,
  customer_name,
  collector_name,
  status,
  total_weight_kg,
  total_value,
  created_at
FROM unified_collections 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Check user profiles (customers and collectors)
SELECT 'USER PROFILES:' as info;
SELECT 
  id,
  full_name,
  email,
  role,
  status
FROM user_profiles 
WHERE role IN ('member', 'collector', 'admin', 'office_staff')
ORDER BY role, full_name;

-- 4. Check collection materials
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
ORDER BY cm.created_at DESC
LIMIT 10;

-- 5. Create test data if no collections exist
DO $$
BEGIN
  -- Only create test data if no collections exist
  IF NOT EXISTS (SELECT 1 FROM unified_collections LIMIT 1) THEN
    
    -- Create test member (customer) if doesn't exist
    INSERT INTO user_profiles (id, full_name, email, role, status)
    VALUES (
      gen_random_uuid(),
      'Test Member',
      'member@test.com',
      'member',
      'active'
    ) ON CONFLICT (email) DO NOTHING;
    
    -- Create test collector if doesn't exist
    INSERT INTO user_profiles (id, full_name, email, role, status)
    VALUES (
      gen_random_uuid(),
      'Test Collector',
      'collector@test.com',
      'collector',
      'active'
    ) ON CONFLICT (email) DO NOTHING;
    
    -- Create test collection
    INSERT INTO unified_collections (
      collection_code,
      collection_type,
      customer_id,
      customer_name,
      customer_email,
      collector_id,
      collector_name,
      pickup_address,
      status,
      total_weight_kg,
      total_value,
      created_at
    )
    SELECT 
      'COL-2024-001',
      'pickup',
      (SELECT id FROM user_profiles WHERE role = 'member' LIMIT 1),
      'Test Member',
      'member@test.com',
      (SELECT id FROM user_profiles WHERE role = 'collector' LIMIT 1),
      'Test Collector',
      '123 Test Street, Test City',
      'pending',
      15.5,
      38.75,
      NOW()
    WHERE EXISTS (SELECT 1 FROM user_profiles WHERE role = 'member')
    AND EXISTS (SELECT 1 FROM user_profiles WHERE role = 'collector');
    
    -- Create test collection material
    INSERT INTO collection_materials (
      collection_id,
      material_name,
      material_category,
      quantity,
      unit,
      unit_price,
      total_price
    )
    SELECT 
      (SELECT id FROM unified_collections WHERE collection_code = 'COL-2024-001'),
      'Plastic Bottles',
      'Plastic',
      15.5,
      'kg',
      2.50,
      38.75
    WHERE EXISTS (SELECT 1 FROM unified_collections WHERE collection_code = 'COL-2024-001');
    
    RAISE NOTICE 'Test data created successfully!';
  ELSE
    RAISE NOTICE 'Collections already exist, skipping test data creation.';
  END IF;
END $$;

-- 6. Final verification - show collections that should appear in admin dashboard
SELECT 'COLLECTIONS FOR ADMIN DASHBOARD:' as info;
SELECT 
  uc.id as collection_id,
  uc.collection_code,
  uc.customer_name,
  uc.collector_name,
  uc.status,
  uc.total_weight_kg,
  uc.total_value,
  uc.created_at,
  COUNT(cm.id) as material_count
FROM unified_collections uc
LEFT JOIN collection_materials cm ON cm.collection_id = uc.id
GROUP BY uc.id, uc.collection_code, uc.customer_name, uc.collector_name, 
         uc.status, uc.total_weight_kg, uc.total_value, uc.created_at
ORDER BY uc.created_at DESC;

-- 7. Test RLS policies (this should work for admin users)
SELECT 'RLS POLICY TEST:' as info;
SELECT COUNT(*) as accessible_collections FROM unified_collections;
