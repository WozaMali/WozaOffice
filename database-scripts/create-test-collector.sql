-- Create a test collector account
-- This script will create a collector profile and user account for testing

-- First, create the user in auth.users (this would normally be done through Supabase Auth UI)
-- For testing, we'll create a profile directly

INSERT INTO profiles (
  id,
  email,
  first_name,
  last_name,
  phone,
  role,
  is_active,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'collector@wozamali.com',
  'Test',
  'Collector',
  '+27 123 456 789',
  'COLLECTOR',
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Add a test address for the collector
INSERT INTO addresses (
  id,
  profile_id,
  line1,
  suburb,
  city,
  postal_code,
  is_primary,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  '123 Collector Street',
  'Test Suburb',
  'Cape Town',
  '8001',
  true,
  NOW(),
  NOW()
);

-- Create some test materials if they don't exist
INSERT INTO materials (id, name, unit, rate_per_kg, is_active, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'PET Bottles', 'kg', 1.50, true, NOW(), NOW()),
  (gen_random_uuid(), 'Aluminum Cans', 'kg', 1.20, true, NOW(), NOW()),
  (gen_random_uuid(), 'Glass', 'kg', 0.80, true, NOW(), NOW()),
  (gen_random_uuid(), 'Paper', 'kg', 0.60, true, NOW(), NOW()),
  (gen_random_uuid(), 'Cardboard', 'kg', 0.40, true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Create a test customer profile
INSERT INTO profiles (
  id,
  email,
  first_name,
  last_name,
  phone,
  role,
  is_active,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  'customer@wozamali.com',
  'Test',
  'Customer',
  '+27 987 654 321',
  'CUSTOMER',
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Add a test address for the customer
INSERT INTO addresses (
  id,
  profile_id,
  line1,
  suburb,
  city,
  postal_code,
  is_primary,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000002',
  '456 Customer Avenue',
  'Customer Suburb',
  'Johannesburg',
  '2000',
  true,
  NOW(),
  NOW()
);

-- Note: To actually use these accounts, you'll need to:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Create a user with email 'collector@wozamali.com' and password
-- 3. The profile will automatically link to the auth user
-- 4. Or use the Supabase Auth API to create the user programmatically

SELECT 'Test accounts created successfully!' as status;
