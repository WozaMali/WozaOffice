-- ============================================================================
-- QUICK FIX FOR PROFILES FOREIGN KEY ISSUE
-- ============================================================================
-- This script quickly removes the constraint and inserts your collector

-- Step 1: Remove the foreign key constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Step 2: Insert your collector
INSERT INTO profiles (id, email, full_name, phone, role, is_active) VALUES
  (uuid_generate_v4(), 'dumisani@wozamali.co.za', 'Dumisani Dlamini', '+27722126004', 'collector', true);

-- Step 3: Verify it worked
SELECT 
  id,
  email,
  full_name,
  phone,
  role,
  is_active,
  created_at
FROM profiles 
WHERE email = 'dumisani@wozamali.co.za';

-- ============================================================================
-- WHAT THIS DOES:
-- ============================================================================
-- ✅ Removes the foreign key constraint to auth.users
-- ✅ Allows you to insert profiles with custom UUIDs
-- ✅ Gets your collector dashboard working immediately
-- 
-- NOTE: This is a temporary fix. For production, you should:
-- 1. Use proper Supabase Auth flow
-- 2. Create users through signup/signin
-- 3. Link profiles to auth.users properly
