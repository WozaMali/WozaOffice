-- ============================================================================
-- FIX PROFILES TABLE RLS POLICY
-- ============================================================================
-- Run this in your Supabase SQL Editor to fix the missing SELECT policy

-- Add a policy that allows authenticated users to read profiles
-- This policy will allow collectors to read member profiles for pickup assignments
CREATE POLICY "Authenticated users can read profiles" ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'profiles'
  AND cmd = 'SELECT';

-- Test if the policy works by trying to read profiles
SELECT 'Testing profiles access after policy creation:' as test_name;
SELECT COUNT(*) as total_profiles FROM public.profiles;

-- Test reading member profiles specifically
SELECT 'Testing member profiles access:' as test_name;
SELECT id, email, full_name, role 
FROM public.profiles 
WHERE role = 'member'
LIMIT 3;
