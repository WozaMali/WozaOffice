-- ============================================================================
-- COMPLETE SUPERADMIN SETUP FOR superadmin@wozamali.co.za
-- ============================================================================
-- This script ensures superadmin@wozamali.co.za has proper super admin access
-- and can see all super admin functions in the app

-- Step 1: Create roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    phone TEXT,
    role_id UUID REFERENCES public.roles(id),
    role TEXT, -- Direct role field for compatibility
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'suspended')),
    employee_number TEXT,
    township TEXT,
    is_approved BOOLEAN DEFAULT false,
    approval_date TIMESTAMPTZ,
    approved_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- Step 3: Insert/Update SUPER_ADMIN role with comprehensive permissions
INSERT INTO public.roles (id, name, description, permissions) VALUES
('00000000-0000-0000-0000-000000000001', 'SUPER_ADMIN', 'Super Administrator with full system access', 
 '{
   "can_manage_all": true,
   "can_view_analytics": true,
   "can_manage_users": true,
   "can_access_team_members": true,
   "can_manage_collections": true,
   "can_manage_pickups": true,
   "can_manage_rewards": true,
   "can_manage_withdrawals": true,
   "can_manage_fund": true,
   "can_manage_config": true,
   "can_view_transactions": true,
   "can_manage_beneficiaries": true,
   "can_reset_system": true
 }')
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    updated_at = NOW();

-- Step 4: Check if superadmin@wozamali.co.za exists in auth.users
SELECT 'Checking auth.users for superadmin@wozamali.co.za:' as info;
SELECT id, email, created_at FROM auth.users WHERE email = 'superadmin@wozamali.co.za';

-- Step 5: Create superadmin user in auth.users if it doesn't exist
-- Note: This requires the user to be created through Supabase Auth UI or API
-- We'll create a placeholder that will be updated when the actual auth user is created
INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    full_name,
    role_id,
    role,
    status,
    is_approved,
    created_at,
    updated_at
)
SELECT 
    COALESCE(au.id, '00000000-0000-0000-0000-000000000001'::uuid),
    'superadmin@wozamali.co.za',
    'Super',
    'Admin',
    'Super Admin',
    '00000000-0000-0000-0000-000000000001'::uuid,
    'SUPER_ADMIN',
    'active',
    true,
    NOW(),
    NOW()
FROM auth.users au
WHERE au.email = 'superadmin@wozamali.co.za'
  AND NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.email = 'superadmin@wozamali.co.za'
  );

-- Step 6: If no auth user exists, create a placeholder entry
INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    full_name,
    role_id,
    role,
    status,
    is_approved,
    created_at,
    updated_at
)
SELECT 
    '00000000-0000-0000-0000-000000000001'::uuid,
    'superadmin@wozamali.co.za',
    'Super',
    'Admin',
    'Super Admin',
    '00000000-0000-0000-0000-000000000001'::uuid,
    'SUPER_ADMIN',
    'active',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.email = 'superadmin@wozamali.co.za'
);

-- Step 7: Update the user ID to match the actual auth user if it exists
UPDATE public.users 
SET 
    id = au.id,
    updated_at = NOW()
FROM auth.users au
WHERE au.email = 'superadmin@wozamali.co.za' 
  AND public.users.email = 'superadmin@wozamali.co.za'
  AND public.users.id = '00000000-0000-0000-0000-000000000001'::uuid;

-- Step 8: Ensure the user has the correct role (both role_id and role fields)
UPDATE public.users 
SET 
    role_id = '00000000-0000-0000-0000-000000000001'::uuid,
    role = 'SUPER_ADMIN',
    status = 'active',
    is_approved = true,
    updated_at = NOW()
WHERE email = 'superadmin@wozamali.co.za';

-- Step 9: Create user_profiles entry if it doesn't exist (for main app compatibility)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.user_profiles (user_id, role)
SELECT 
    COALESCE(au.id, '00000000-0000-0000-0000-000000000001'::uuid),
    'SUPER_ADMIN'
FROM auth.users au
WHERE au.email = 'superadmin@wozamali.co.za'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_profiles up WHERE up.user_id = COALESCE(au.id, '00000000-0000-0000-0000-000000000001'::uuid)
  );

-- Step 10: Final verification - show the complete setup
SELECT '=== FINAL VERIFICATION ===' as info;

-- Show the user in users table
SELECT 'User in users table:' as info;
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.role_id,
    u.role,
    u.status,
    u.is_approved,
    r.name as role_name,
    r.permissions
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
WHERE u.email = 'superadmin@wozamali.co.za';

-- Show the user in user_profiles table
SELECT 'User in user_profiles table:' as info;
SELECT 
    up.user_id,
    up.role,
    au.email
FROM public.user_profiles up
LEFT JOIN auth.users au ON up.user_id = au.id
WHERE au.email = 'superadmin@wozamali.co.za' OR up.user_id = '00000000-0000-0000-0000-000000000001'::uuid;

-- Show all available roles
SELECT 'Available roles:' as info;
SELECT id, name, description, permissions FROM public.roles ORDER BY name;

-- Show auth user if exists
SELECT 'Auth user status:' as info;
SELECT 
    id, 
    email, 
    created_at,
    CASE 
        WHEN encrypted_password IS NOT NULL THEN 'Password set'
        ELSE 'No password'
    END as password_status
FROM auth.users 
WHERE email = 'superadmin@wozamali.co.za';

-- Step 11: Instructions for completing the setup
SELECT '=== NEXT STEPS ===' as info;
SELECT '1. Create the auth user in Supabase Dashboard > Authentication > Users' as step;
SELECT '2. Set password for superadmin@wozamali.co.za' as step;
SELECT '3. The user will automatically get SUPER_ADMIN role and permissions' as step;
SELECT '4. Login to the app with superadmin@wozamali.co.za' as step;