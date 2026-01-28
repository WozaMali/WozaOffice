-- ============================================================================
-- CLEAR TEST PICKUP DATA FOR FRESH TESTING
-- ============================================================================
-- Run this in your Supabase SQL Editor to clear all test pickup data
-- This will allow you to test with fresh, live pickups

-- First, let's see what we currently have
SELECT 'Current Data Counts:' as info;
SELECT 
  'Profiles' as table_name,
  COUNT(*) as count
FROM public.profiles
UNION ALL
SELECT 
  'Addresses' as table_name,
  COUNT(*) as count
FROM public.addresses
UNION ALL
SELECT 
  'Pickups' as table_name,
  COUNT(*) as count
FROM public.pickups
UNION ALL
SELECT 
  'Pickup Items' as table_name,
  COUNT(*) as count
FROM public.pickup_items
UNION ALL
SELECT 
  'Pickup Photos' as table_name,
  COUNT(*) as count
FROM public.pickup_photos;

-- Show current pickups before deletion
SELECT 'Current Pickups (will be deleted):' as info;
SELECT 
  p.id as pickup_id,
  c.email as customer_email,
  c.full_name as customer_name,
  col.email as collector_email,
  col.full_name as collector_name,
  p.status,
  p.started_at,
  p.submitted_at
FROM public.pickups p
JOIN public.profiles c ON p.customer_id = c.id
JOIN public.profiles col ON p.collector_id = col.id
ORDER BY p.started_at DESC;

-- ============================================================================
-- CLEAR ALL PICKUP-RELATED DATA
-- ============================================================================

-- Clear pickup photos first (foreign key dependency)
DELETE FROM public.pickup_photos;
SELECT 'Deleted pickup photos' as status;

-- Clear pickup items (foreign key dependency)
DELETE FROM public.pickup_items;
SELECT 'Deleted pickup items' as status;

-- Clear pickups
DELETE FROM public.pickups;
SELECT 'Deleted pickups' as status;

-- Clear addresses (keep profiles for users)
DELETE FROM public.addresses;
SELECT 'Deleted addresses' as status;

-- ============================================================================
-- VERIFY CLEANUP
-- ============================================================================

-- Show final counts after cleanup
SELECT 'Final Data Counts (after cleanup):' as info;
SELECT 
  'Profiles' as table_name,
  COUNT(*) as count
FROM public.profiles
UNION ALL
SELECT 
  'Addresses' as table_name,
  COUNT(*) as count
FROM public.addresses
UNION ALL
SELECT 
  'Pickups' as table_name,
  COUNT(*) as count
FROM public.pickups
UNION ALL
SELECT 
  'Pickup Items' as table_name,
  COUNT(*) as count
FROM public.pickup_items
UNION ALL
SELECT 
  'Pickup Photos' as table_name,
  COUNT(*) as count
FROM public.pickup_photos;

-- Show remaining profiles (users)
SELECT 'Remaining Users:' as info;
SELECT 
  id,
  email,
  full_name,
  role,
  created_at
FROM public.profiles
ORDER BY role, created_at;

-- ============================================================================
-- OPTIONAL: RESET AUTO-INCREMENT SEQUENCES (if using them)
-- ============================================================================
-- Note: This is only needed if you're using auto-increment IDs
-- Most tables use UUIDs, so this may not be necessary

-- Check if any sequences exist
SELECT 'Checking for sequences:' as info;
SELECT 
  sequence_name,
  last_value
FROM information_schema.sequences
WHERE sequence_schema = 'public';

-- ============================================================================
-- READY FOR FRESH TESTING
-- ============================================================================
SELECT 'Database cleared and ready for fresh pickup testing!' as status;

-- Now you can:
-- 1. Create a new pickup from the collector app
-- 2. Submit it and see it appear in admin dashboard
-- 3. Test the full approval workflow
-- 4. Verify real-time data updates
