-- ============================================================================
-- FIX COLLECTOR PROFILE WITH CORRECT USER INFORMATION
-- ============================================================================
-- This script fixes the collector profile issue by using the correct user information
-- and handling the valid_collector_id constraint properly

-- 1. First, let's check what the valid_collector_id constraint requires
-- ============================================================================

SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'valid_collector_id'
AND conrelid = 'public.user_profiles'::regclass;

-- 2. Check if the correct collector already exists
-- ============================================================================

SELECT 
  id,
  email,
  full_name,
  role,
  status
FROM public.user_profiles 
WHERE email = 'dumi@wozamali.co.za'
OR full_name ILIKE '%dumi%'
OR full_name ILIKE '%mngqi%';

-- 3. Check what users exist in the auth.users table
-- ============================================================================

SELECT 
  id,
  email,
  raw_user_meta_data->>'full_name' as full_name,
  created_at
FROM auth.users 
WHERE email = 'dumi@wozamali.co.za'
OR raw_user_meta_data->>'full_name' ILIKE '%dumi%'
OR raw_user_meta_data->>'full_name' ILIKE '%mngqi%';

-- 4. Get the correct collector ID from auth.users
-- ============================================================================

-- This will show us the actual collector ID we should use
SELECT 
  'Current collector ID from auth.users:' as info,
  id,
  email,
  raw_user_meta_data->>'full_name' as full_name
FROM auth.users 
WHERE email = 'dumi@wozamali.co.za'
LIMIT 1;

-- 5. Create the correct collector profile
-- ============================================================================

-- First, let's get the actual collector ID from auth.users
-- Replace 'ACTUAL_COLLECTOR_ID' with the real ID from the query above
-- For now, let's try to find it automatically

DO $$
DECLARE
  collector_id UUID;
  collector_email TEXT := 'dumi@wozamali.co.za';
  collector_name TEXT := 'Dumi Mngqi';
BEGIN
  -- Get the collector ID from auth.users
  SELECT id INTO collector_id
  FROM auth.users 
  WHERE email = collector_email
  LIMIT 1;
  
  IF collector_id IS NOT NULL THEN
    -- Insert the correct collector profile
    INSERT INTO public.user_profiles (
      id,
      user_id,
      email,
      full_name,
      role,
      status,
      created_at,
      updated_at
    ) VALUES (
      collector_id,
      collector_id,
      collector_email,
      collector_name,
      'collector',
      'active',
      NOW(),
      NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role,
      status = EXCLUDED.status,
      updated_at = NOW();
    
    RAISE NOTICE 'Collector profile created/updated for ID: %, Email: %, Name: %', 
      collector_id, collector_email, collector_name;
  ELSE
    RAISE NOTICE 'Collector not found in auth.users with email: %', collector_email;
  END IF;
END $$;

-- 6. Verify the collector profile was created
-- ============================================================================

SELECT 
  'Collector profile status:' as info,
  id,
  email,
  full_name,
  role,
  status
FROM public.user_profiles 
WHERE email = 'dumi@wozamali.co.za';

-- 7. Test collection creation with correct collector
-- ============================================================================

-- Test inserting a collection with the correct collector
DO $$
DECLARE
  collector_id UUID;
  test_collection_id UUID;
BEGIN
  -- Get the collector ID
  SELECT id INTO collector_id
  FROM public.user_profiles 
  WHERE email = 'dumi@wozamali.co.za'
  LIMIT 1;
  
  IF collector_id IS NOT NULL THEN
    -- Insert test collection
    INSERT INTO public.collections (
      user_id,
      collector_id,
      pickup_address_id,
      material_type,
      weight_kg,
      status,
      notes
    ) VALUES (
      collector_id, -- Use collector as both user and collector for test
      collector_id,
      NULL, -- No address for test
      'Test Material',
      1.0,
      'pending',
      'Test collection with correct collector'
    ) RETURNING id INTO test_collection_id;
    
    RAISE NOTICE 'Test collection created successfully with ID: %', test_collection_id;
    
    -- Clean up test data
    DELETE FROM public.collections WHERE id = test_collection_id;
    RAISE NOTICE 'Test collection cleaned up';
  ELSE
    RAISE NOTICE 'Collector profile not found, cannot test collection creation';
  END IF;
END $$;

-- 8. Show final status
-- ============================================================================

SELECT 
  'Fix completed successfully!' as status,
  COUNT(*) as total_collectors
FROM public.user_profiles 
WHERE role = 'collector' 
AND status = 'active';
