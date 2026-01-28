-- Create a test collector account with CORRECT lowercase roles
-- This script will create a collector profile and user account for testing

-- First, create the user in auth.users (this would normally be done through Supabase Auth UI)
-- For testing, we'll create a profile directly

INSERT INTO profiles (
  id,
  email,
  full_name,
  phone,
  role,
  is_active,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'collector@wozamali.com',
  'Test Collector',
  '+27 123 456 789',
  'collector',
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
  '00000000-0000-0000-0000-000000000001',
  '123 Collector Street',
  'Test Suburb',
  'Cape Town',
  '8001',
  true,
  NOW()
);

-- Create a test admin account as well
INSERT INTO profiles (
  id,
  email,
  full_name,
  phone,
  role,
  is_active,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000003',
  'admin@wozamali.com',
  'Test Admin',
  '+27 111 222 333',
  'admin',
  true,
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  created_at = NOW();

-- Create a test customer profile
INSERT INTO profiles (
  id,
  email,
  full_name,
  phone,
  role,
  is_active,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  'customer@wozamali.com',
  'Test Customer',
  '+27 987 654 321',
  'customer',
  true,
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  created_at = NOW();

-- Add a test address for the customer
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
  '00000000-0000-0000-0000-000000000002',
  '456 Customer Avenue',
  'Customer Suburb',
  'Johannesburg',
  '2000',
  true,
  NOW()
);

-- Note: To actually use these accounts, you'll need to:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Create a user with email 'collector@wozamali.com' and password
-- 3. The profile will automatically link to the auth user
-- 4. Or use the Supabase Auth API to create the user programmatically

SELECT 'Test accounts created successfully with CORRECT lowercase roles!' as status;
