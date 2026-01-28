-- ============================================================================
-- DIAGNOSE COLLECTOR DASHBOARD DATABASE ISSUES
-- ============================================================================
-- Run this script in your Supabase SQL editor to check what's missing

-- Check if required extensions exist
SELECT 
  'Extensions' as category,
  extname as name,
  CASE WHEN extname IS NOT NULL THEN '✅' ELSE '❌' END as status
FROM pg_extension 
WHERE extname IN ('uuid-ossp');

-- Check if required tables exist
SELECT 
  'Tables' as category,
  table_name as name,
  CASE WHEN table_name IS NOT NULL THEN '✅' ELSE '❌' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'pickups', 'materials', 'pickup_items', 'pickup_photos')
ORDER BY table_name;

-- Check table structure for profiles
SELECT 
  'Profile Columns' as category,
  column_name as name,
  data_type as type,
  is_nullable as nullable,
  CASE WHEN column_name IS NOT NULL THEN '✅' ELSE '❌' END as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Check table structure for pickups
SELECT 
  'Pickup Columns' as category,
  column_name as name,
  data_type as type,
  is_nullable as nullable,
  CASE WHEN column_name IS NOT NULL THEN '✅' ELSE '❌' END as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'pickups'
ORDER BY ordinal_position;

-- Check if there's any data in profiles
SELECT 
  'Data Check' as category,
  'profiles' as table_name,
  COUNT(*) as row_count,
  CASE WHEN COUNT(*) > 0 THEN '✅' ELSE '❌' END as status
FROM profiles;

-- Check if there's any data in pickups
SELECT 
  'Data Check' as category,
  'pickups' as table_name,
  COUNT(*) as row_count,
  CASE WHEN COUNT(*) > 0 THEN '✅' ELSE '❌' END as status
FROM pickups;

-- Check RLS policies
SELECT 
  'RLS Policies' as category,
  schemaname || '.' || tablename as table_name,
  policyname as policy_name,
  CASE WHEN policyname IS NOT NULL THEN '✅' ELSE '❌' END as status
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'pickups')
ORDER BY tablename, policyname;

-- Check if auth.uid() function exists (Supabase requirement)
SELECT 
  'Auth Functions' as category,
  'auth.uid()' as function_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'auth' AND p.proname = 'uid'
  ) THEN '✅' ELSE '❌' END as status;

-- Check if auth_role function exists
SELECT 
  'Custom Functions' as category,
  'auth_role()' as function_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'auth_role'
  ) THEN '✅' ELSE '❌' END as status;

-- Summary of issues
WITH issues AS (
  SELECT 'Missing Tables' as issue_type, COUNT(*) as count
  FROM (
    SELECT unnest(ARRAY['profiles', 'pickups', 'materials', 'pickup_items', 'pickup_photos']) as required_table
  ) t
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = t.required_table
  )
  
  UNION ALL
  
  SELECT 'Empty Tables' as issue_type, COUNT(*) as count
  FROM (
    SELECT 'profiles' as table_name
    UNION ALL SELECT 'pickups'
  ) t
  WHERE EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = t.table_name
  ) AND (
    SELECT COUNT(*) FROM (SELECT 1 FROM (SELECT table_name::regclass) as t LIMIT 1) s
  ) = 0
)
SELECT 
  'Summary' as category,
  issue_type as issue,
  count as count,
  CASE WHEN count = 0 THEN '✅' ELSE '❌' END as status
FROM issues
ORDER BY issue_type;
