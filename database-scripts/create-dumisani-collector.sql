-- Create Dumisani as a collector user
-- This script will create a new user account and profile for Dumisani

-- First, create the user in auth.users (this would normally be done through Supabase Auth UI)
-- For now, we'll create a profile entry that can be linked to an existing auth user

-- Insert profile for Dumisani
INSERT INTO profiles (
  id,
  email,
  full_name,
  role,
  phone,
  is_verified,
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(), -- Generate a new UUID for the profile
  'dumisani@wozamali.co.za',
  'Dumisani',
  'COLLECTOR',
  '+27 123 456 789', -- You can update this phone number
  true,
  true,
  NOW(),
  NOW()
);

-- Note: To complete the setup, you'll need to:
-- 1. Go to your Supabase Dashboard > Authentication > Users
-- 2. Click "Add User" 
-- 3. Enter: dumisani@wozamali.co.za
-- 4. Set password: Dumisani123
-- 5. Copy the user ID from the created user
-- 6. Update the profile ID to match the auth user ID

-- Alternative: If you want to create the user programmatically, you can use:
-- INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, created_at, updated_at)
-- VALUES ('dumisani@wozamali.co.za', crypt('Dumisani123', gen_salt('bf')), NOW(), NOW(), NOW());

-- Then link the profile to the auth user by updating the profile ID
