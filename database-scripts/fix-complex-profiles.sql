-- ============================================================================
-- FIX COMPLEX PROFILES TABLE WITH ADDRESS FIELDS
-- ============================================================================

-- First, let's see the complete table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Check what roles currently exist and their exact values
SELECT DISTINCT role FROM profiles;

-- Check the current constraint definition
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'profiles'::regclass 
AND contype = 'c';

-- Show a sample of existing data to understand the structure
SELECT * FROM profiles LIMIT 3;

-- Let's see what the exact role values are (including whitespace)
SELECT 
    role,
    LENGTH(role) as role_length,
    '|' || role || '|' as role_with_pipes
FROM profiles 
GROUP BY role;

-- Update any problematic role values (trim whitespace, standardize)
UPDATE profiles 
SET role = TRIM(role);

-- Now let's see what we have after trimming
SELECT DISTINCT role FROM profiles;

-- Drop the existing constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Create a new constraint that allows our roles
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('ADMIN', 'STAFF', 'COLLECTOR', 'CUSTOMER'));

-- Verify the constraint was created
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'profiles'::regclass 
AND contype = 'c';

-- Now try to insert the sample admin user
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

-- Verify the insert worked
SELECT id, email, username, first_name, last_name, role, is_active 
FROM profiles 
WHERE email = 'admin@wozamali.com';

-- Show final state of all profiles
SELECT id, email, role, created_at FROM profiles;
