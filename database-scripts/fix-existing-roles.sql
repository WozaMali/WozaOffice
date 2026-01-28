-- ============================================================================
-- FIX EXISTING ROLES BEFORE UPDATING CONSTRAINT
-- ============================================================================

-- First, let's see what roles currently exist in the table
SELECT DISTINCT role FROM profiles;

-- Check what the current constraint allows
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'profiles'::regclass 
AND contype = 'c';

-- Show all existing profiles to see what we're working with
SELECT id, email, role, created_at FROM profiles;

-- Update existing roles to match our expected values
-- This will handle common variations like lowercase, different spellings, etc.
UPDATE profiles 
SET role = CASE 
    WHEN LOWER(role) IN ('admin', 'administrator', 'super_admin') THEN 'ADMIN'
    WHEN LOWER(role) IN ('staff', 'manager', 'moderator') THEN 'STAFF'
    WHEN LOWER(role) IN ('collector', 'collection_agent', 'pickup_agent') THEN 'COLLECTOR'
    WHEN LOWER(role) IN ('customer', 'user', 'member') THEN 'CUSTOMER'
    ELSE 'STAFF' -- Default fallback
END;

-- Verify the updates
SELECT DISTINCT role FROM profiles;

-- Now we can safely update the constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Create the new constraint
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('ADMIN', 'STAFF', 'COLLECTOR', 'CUSTOMER'));

-- Now try to insert the sample data
INSERT INTO profiles (id, email, username, first_name, last_name, role, is_active)
VALUES (
  gen_random_uuid(),
  'admin@wozamali.com',
  'admin',
  'System',
  'Administrator',
  'ADMIN',
  true
) ON CONFLICT (email) DO NOTHING;

-- Verify everything works
SELECT id, email, username, first_name, last_name, role, is_active 
FROM profiles 
WHERE email = 'admin@wozamali.com';

-- Show final state
SELECT * FROM profiles;
