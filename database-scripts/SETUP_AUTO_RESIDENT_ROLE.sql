-- ============================================================================
-- SETUP AUTO RESIDENT ROLE FOR NEW USERS
-- ============================================================================
-- This script sets up automatic role assignment for new users from Main App

-- Step 1: Create a function to automatically assign resident role to new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert user into users table with resident role
  INSERT INTO public.users (
    id,
    email,
    full_name,
    phone,
    status,
    role_id,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'active',
    (SELECT id FROM public.roles WHERE name = 'resident'),
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    phone = COALESCE(EXCLUDED.phone, users.phone),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create trigger to automatically create user profile when auth user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Ensure all existing auth users have profiles in users table
INSERT INTO public.users (
  id,
  email,
  full_name,
  phone,
  status,
  role_id,
  created_at,
  updated_at
)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  COALESCE(au.raw_user_meta_data->>'phone', ''),
  'active',
  (SELECT id FROM public.roles WHERE name = 'resident'),
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE u.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Step 4: Verify the setup
SELECT 'Auto resident role setup completed successfully' as status;
SELECT 'New users from Main App will automatically get resident role' as info;
