-- Create a test collector user for the collector app
-- This script creates a user that can authenticate and access the collector portal

-- First, create the user in auth.users (this would normally be done through Supabase Auth UI)
-- For testing, we'll create a profile entry that can be linked to an existing auth user

-- Insert profile for test collector
INSERT INTO profiles (
  id,
  email,
  full_name,
  phone,
  role,
  is_active,
  created_at
) VALUES (
  '11111111-1111-1111-1111-111111111111', -- Use a specific UUID for testing
  'col001@wozamali.com',
  'John Smith',
  '+27 123 456 789',
  'collector', -- Use lowercase role to match the code expectations
  true,
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  created_at = NOW();

-- Add a test address for the collector
INSERT INTO addresses (
  id,
  profile_id,
  line1,
  suburb,
  city,
  postal_code,
  is_primary,
  created_at
) VALUES (
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  '123 Collector Street',
  'Test Suburb',
  'Cape Town',
  '8001',
  true,
  NOW()
);

-- Create a test admin user as well
INSERT INTO profiles (
  id,
  email,
  full_name,
  phone,
  role,
  is_active,
  created_at
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  'admin@wozamali.com',
  'Admin User',
  '+27 111 222 333',
  'admin', -- Use lowercase role
  true,
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  created_at = NOW();

-- Show the created profiles
SELECT 'Test accounts created successfully!' as status;

-- Display the created profiles
SELECT 
  id,
  email,
  full_name,
  role,
  is_active,
  created_at
FROM profiles 
WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
);

-- Note: To actually use these accounts, you'll need to:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Create a user with email 'col001@wozamali.com' and password 'collector123'
-- 3. Copy the user ID from the created user
-- 4. Update the profile ID to match the auth user ID
-- 5. Or use the Supabase Auth API to create the user programmatically
