-- Simple test to check database connectivity and table structure
-- Run this in Supabase SQL Editor to verify everything is working

-- Test 1: Check if we can connect and see tables
SELECT 'Database connection test:' as info;
SELECT current_database() as database_name, current_user as current_user;

-- Test 2: Check if profiles table exists
SELECT 'Checking if profiles table exists:' as info;
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_name = 'profiles';

-- Test 3: Check profiles table structure
SELECT 'Profiles table structure:' as info;
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Test 4: Check if there are any profiles at all
SELECT 'Checking profiles table content:' as info;
SELECT COUNT(*) as total_profiles FROM profiles;

-- Test 5: Check what roles exist (if any profiles exist)
SELECT 'Checking existing roles:' as info;
SELECT 
  role,
  COUNT(*) as count
FROM profiles 
GROUP BY role
ORDER BY role;

-- Test 6: Check if addresses table exists
SELECT 'Checking if addresses table exists:' as info;
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_name = 'addresses';

-- Test 7: Check if we can do a simple join
SELECT 'Testing profiles + addresses join:' as info;
SELECT 
  p.id,
  p.email,
  p.role,
  COUNT(a.id) as address_count
FROM profiles p
LEFT JOIN addresses a ON p.id = a.profile_id
GROUP BY p.id, p.email, p.role
LIMIT 5;
