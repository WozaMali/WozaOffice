-- Fix Dumisani's role to make them a collector
-- This will allow them to access the collector portal

-- First, check current status
SELECT 'Before Update:' as status;
SELECT 
  id,
  email,
  full_name,
  phone,
  role,
  is_active,
  created_at
FROM profiles 
WHERE email = 'dumisani@wozamali.co.za';

-- Update Dumisani's role to 'collector'
UPDATE profiles 
SET 
  role = 'collector',
  is_active = true,
  updated_at = NOW()
WHERE email = 'dumisani@wozamali.co.za';

-- If no profile exists, create one
INSERT INTO profiles (
  id,
  email,
  full_name,
  phone,
  role,
  is_active,
  created_at
) VALUES (
  gen_random_uuid(),
  'dumisani@wozamali.co.za',
  'Dumisani',
  '+27 123 456 789',
  'collector',
  true,
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Check final status
SELECT 'After Update:' as status;
SELECT 
  id,
  email,
  full_name,
  phone,
  role,
  is_active,
  created_at
FROM profiles 
WHERE email = 'dumisani@wozamali.co.za';

-- Verify the role was updated
SELECT 
  CASE 
    WHEN role = 'collector' THEN '✅ SUCCESS: Dumisani is now a collector'
    WHEN role = 'admin' THEN '✅ SUCCESS: Dumisani is an admin'
    ELSE '❌ FAILED: Dumisani still has role: ' || role
  END as result
FROM profiles 
WHERE email = 'dumisani@wozamali.co.za';
