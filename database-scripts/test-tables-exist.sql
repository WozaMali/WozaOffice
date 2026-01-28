-- ============================================================================
-- TEST: CHECK IF REQUIRED TABLES EXIST
-- ============================================================================
-- Run this in your Supabase SQL Editor to verify table structure

-- Check if profiles table exists and show its structure
SELECT 'PROFILES TABLE STRUCTURE:' as test_name;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if addresses table exists and show its structure
SELECT 'ADDRESSES TABLE STRUCTURE:' as test_name;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'addresses' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check what roles currently exist in profiles
SELECT 'EXISTING ROLES IN PROFILES:' as test_name;
SELECT DISTINCT role FROM profiles WHERE role IS NOT NULL;

-- Check if we can insert a test profile
SELECT 'TESTING PROFILE INSERT:' as test_name;
INSERT INTO profiles (
  id,
  email,
  full_name,
  phone,
  role,
  is_active,
  created_at
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'test@wozamali.com',
  'Test User',
  '+27 999 999 999',
  'collector',
  true,
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  created_at = NOW();

-- Show the test profile
SELECT 'TEST PROFILE CREATED:' as test_name;
SELECT * FROM profiles WHERE id = '11111111-1111-1111-1111-111111111111';

-- Clean up test data
DELETE FROM profiles WHERE id = '11111111-1111-1111-1111-111111111111';
SELECT 'TEST PROFILE CLEANED UP' as status;
