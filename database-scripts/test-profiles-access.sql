-- ============================================================================
-- TEST PROFILES ACCESS AFTER RLS POLICY FIX
-- ============================================================================
-- Run this to verify the profiles table is now accessible

-- Test 1: Basic count
SELECT 'Total profiles count:' as test_name;
SELECT COUNT(*) as total FROM public.profiles;

-- Test 2: Member profiles specifically
SELECT 'Member profiles:' as test_name;
SELECT id, email, full_name, role 
FROM public.profiles 
WHERE role = 'member';

-- Test 3: All profiles with roles
SELECT 'All profiles with roles:' as test_name;
SELECT id, email, full_name, role 
FROM public.profiles 
ORDER BY role, full_name;

-- Test 4: Check if the policy was created
SELECT 'RLS policies on profiles:' as test_name;
SELECT policyname, cmd, roles, qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'profiles';

-- Test 5: Verify RLS is still enabled
SELECT 'RLS status:' as test_name;
SELECT tablename, rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'profiles';
