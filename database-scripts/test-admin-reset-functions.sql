-- ============================================================================
-- TEST ADMIN RESET FUNCTIONS
-- ============================================================================
-- This script tests the admin reset functions to ensure they work correctly
-- Run this after setting up the admin reset functions

-- ============================================================================
-- STEP 1: Check if functions exist
-- ============================================================================

-- Check if admin reset functions exist
SELECT 
  routine_name, 
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name LIKE 'admin_reset%'
ORDER BY routine_name;

-- Check if admin views exist
SELECT 
  table_name, 
  table_type
FROM information_schema.tables 
WHERE table_name LIKE 'admin_customer%'
ORDER BY table_name;

-- ============================================================================
-- STEP 2: Check if required tables exist
-- ============================================================================

-- Check profiles table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check pickups table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'pickups' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check pickup_items table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'pickup_items' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check wallets table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'wallets' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check user_activity_log table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_activity_log' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 3: Check sample data
-- ============================================================================

-- Check if there are any customers
SELECT 
  id, 
  full_name, 
  email, 
  role
FROM public.profiles 
WHERE role = 'CUSTOMER'
LIMIT 5;

-- Check if there are any pickups
SELECT 
  id, 
  user_id, 
  status,
  created_at
FROM public.pickups 
LIMIT 5;

-- Check if there are any pickup items
SELECT 
  id, 
  pickup_id, 
  material_id,
  kilograms
FROM public.pickup_items 
LIMIT 5;

-- Check if there are any wallets
SELECT 
  id, 
  user_id, 
  balance
FROM public.wallets 
LIMIT 5;

-- ============================================================================
-- STEP 4: Test admin views (if you have admin access)
-- ============================================================================

-- Test admin customer overview view
-- Note: This will only work if you have admin role
/*
SELECT * FROM admin_customer_overview LIMIT 5;
*/

-- Test admin customers for reset view
-- Note: This will only work if you have admin role
/*
SELECT * FROM admin_customers_for_reset LIMIT 5;
*/

-- ============================================================================
-- STEP 5: Test helper functions (if you have admin access)
-- ============================================================================

-- Test admin reset statistics function
-- Note: This will only work if you have admin role
/*
SELECT get_admin_reset_statistics();
*/

-- Test customer reset history function
-- Note: This will only work if you have admin role
/*
SELECT * FROM get_customer_reset_history(NULL, 30) LIMIT 5;
*/

-- ============================================================================
-- STEP 6: Check RLS policies
-- ============================================================================

-- Check RLS policies on user_activity_log
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'user_activity_log'
ORDER BY policyname;

-- Check RLS policies on admin views
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename LIKE 'admin_customer%'
ORDER BY tablename, policyname;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

SELECT 'Admin reset functions test completed! Check the results above for any issues.' as status;
