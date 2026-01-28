-- ============================================================================
-- DEBUG PICKUP ERROR - DIAGNOSTIC SCRIPT
-- ============================================================================
-- This script helps diagnose the "Error fetching recent pickups: {}" issue
-- Run this in your Supabase SQL Editor to check the current state

-- 1. Check if pickups table exists and its structure
SELECT 'PICKUPS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'pickups'
ORDER BY ordinal_position;

-- 2. Check if profiles table exists and its structure
SELECT 'PROFILES TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 3. Check RLS policies on pickups table
SELECT 'PICKUPS RLS POLICIES:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'pickups'
ORDER BY policyname;

-- 4. Check if auth_role() function exists
SELECT 'AUTH_ROLE FUNCTION:' as info;
SELECT routine_name, routine_type, routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'auth_role';

-- 5. Test basic select on pickups table (this should work for admins)
SELECT 'PICKUP COUNT TEST:' as info;
SELECT COUNT(*) as pickup_count FROM public.pickups;

-- 6. Test the exact query from admin-services.ts
SELECT 'EXACT QUERY TEST:' as info;
SELECT id, status, created_at, updated_at, customer_id
FROM public.pickups
ORDER BY created_at DESC
LIMIT 10;

-- 7. Check current user context
SELECT 'CURRENT USER CONTEXT:' as info;
SELECT 
  auth.uid() as current_user_id,
  auth.role() as current_auth_role,
  (SELECT role FROM public.profiles WHERE id = auth.uid()) as profile_role;

-- 8. Check if there are any pickups with customer_id
SELECT 'PICKUP CUSTOMER IDS:' as info;
SELECT DISTINCT customer_id, COUNT(*) as count
FROM public.pickups 
WHERE customer_id IS NOT NULL
GROUP BY customer_id
LIMIT 5;

-- 9. Check if profiles exist for pickup customers
SELECT 'CUSTOMER PROFILES CHECK:' as info;
SELECT p.id, p.full_name, p.role, COUNT(pk.id) as pickup_count
FROM public.profiles p
LEFT JOIN public.pickups pk ON pk.customer_id = p.id
GROUP BY p.id, p.full_name, p.role
LIMIT 5;
