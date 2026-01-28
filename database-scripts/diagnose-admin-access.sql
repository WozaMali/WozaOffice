-- ============================================================================
-- DIAGNOSE ADMIN ACCESS ISSUES
-- ============================================================================
-- Run this in your Supabase SQL Editor to check what's happening

-- 1. Check if the admin profile exists and has correct role
SELECT 
  id,
  email,
  full_name,
  role,
  is_active,
  created_at
FROM public.profiles 
WHERE email = 'admin@wozamali.com';

-- 2. Check if the pickups table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'pickups'
) as pickups_table_exists;

-- 3. Check if the payments table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'payments'
) as payments_table_exists;

-- 4. Check table structure for pickups
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'pickups'
ORDER BY ordinal_position;

-- 5. Check table structure for payments
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'payments'
ORDER BY ordinal_position;

-- 6. Check RLS policies on pickups table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'pickups';

-- 7. Check RLS policies on payments table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'payments';

-- 8. Test basic select on pickups table
SELECT COUNT(*) as pickup_count FROM public.pickups;

-- 9. Test basic select on payments table
SELECT COUNT(*) as payment_count FROM public.payments;
