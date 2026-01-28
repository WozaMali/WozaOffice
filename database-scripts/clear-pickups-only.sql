-- ============================================================================
-- CLEAR ONLY PICKUP DATA (PRESERVE USERS AND ADDRESSES)
-- ============================================================================
-- Run this in your Supabase SQL Editor to clear only pickup-related data
-- This keeps user profiles and addresses for easier testing

-- First, let's see what pickup data we currently have
SELECT 'Current Pickup Data (will be deleted):' as info;
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

-- Show pickup counts by status
SELECT 'Pickup Counts by Status:' as info;
SELECT 
  status,
  COUNT(*) as count
FROM public.pickups
GROUP BY status;

-- ============================================================================
-- CLEAR PICKUP-RELATED DATA ONLY
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

-- Show remaining users (profiles)
SELECT 'Remaining Users (profiles):' as info;
SELECT 
  id,
  email,
  full_name,
  role,
  created_at
FROM public.profiles
ORDER BY role, created_at;

-- Show remaining addresses
SELECT 'Remaining Addresses:' as info;
SELECT 
  a.id as address_id,
  p.email as user_email,
  p.full_name as user_name,
  a.line1,
  a.suburb,
  a.city,
  a.is_primary
FROM public.addresses a
JOIN public.profiles p ON a.profile_id = p.id
ORDER BY p.email, a.is_primary DESC;

-- ============================================================================
-- READY FOR FRESH PICKUP TESTING
-- ============================================================================
SELECT 'Pickup data cleared! Ready for fresh testing!' as status;

-- Now you can:
-- 1. Use existing users and addresses to create new pickups
-- 2. Create a new pickup from the collector app
-- 3. Submit it and see it appear in admin dashboard
-- 4. Test the full approval workflow
-- 5. Verify real-time data updates

-- ============================================================================
-- QUICK TEST: Verify you can create a new pickup
-- ============================================================================
-- This query should return 0 pickups (confirming cleanup)
SELECT 'Verification - Current Pickups:' as info;
SELECT COUNT(*) as pickup_count FROM public.pickups;
