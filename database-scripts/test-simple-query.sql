-- ============================================================================
-- SIMPLE SUPABASE CONNECTION TEST
-- ============================================================================
-- Run this in your Supabase SQL Editor to verify basic connectivity

-- Test 1: Basic profiles query
SELECT 'Basic Profiles Query:' as test_name;
SELECT id, email, full_name, role 
FROM public.profiles 
WHERE role = 'member'
LIMIT 3;

-- Test 2: Check if the view exists
SELECT 'View Existence Check:' as test_name;
SELECT 
  schemaname,
  viewname,
  viewowner
FROM pg_views 
WHERE viewname = 'collector_dashboard_view';

-- Test 3: Simple count queries
SELECT 'Table Counts:' as test_name;
SELECT 
  'profiles' as table_name,
  COUNT(*) as row_count
FROM public.profiles
UNION ALL
SELECT 
  'pickups' as table_name,
  COUNT(*) as row_count
FROM public.pickups
UNION ALL
SELECT 
  'materials' as table_name,
  COUNT(*) as row_count
FROM public.materials
UNION ALL
SELECT 
  'addresses' as table_name,
  COUNT(*) as row_count
FROM public.addresses;

-- Test 4: Check RLS status
SELECT 'RLS Status:' as test_name;
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'pickups', 'materials', 'addresses');
