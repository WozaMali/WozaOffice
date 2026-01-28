-- ============================================================================
-- COMPLETE SUPER ADMIN REGISTRATION AND PERMISSIONS FIX
-- ============================================================================
-- This script will:
-- 1. Create the SUPER_ADMIN role with full permissions
-- 2. Create the superadmin@wozamali.co.za user
-- 3. Fix admin role permissions
-- 4. Set up proper RLS policies
-- 5. Verify everything is working

-- Step 1: Create/Update roles table with proper structure
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create/Update users table with proper structure
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
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
   "can_reset_system": true,
   "can_manage_roles": true,
   "can_manage_permissions": true,
   "can_access_admin_panel": true,
   "can_manage_system_settings": true
 }')
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    updated_at = NOW();

-- Step 4: Insert/Update ADMIN role with appropriate permissions
INSERT INTO public.roles (id, name, description, permissions) VALUES
('00000000-0000-0000-0000-000000000002', 'ADMIN', 'System Administrator with management privileges', 
 '{
   "can_manage_users": true,
   "can_view_analytics": true,
   "can_manage_collections": true,
   "can_manage_pickups": true,
   "can_manage_rewards": true,
   "can_manage_withdrawals": true,
   "can_view_transactions": true,
   "can_manage_beneficiaries": true,
   "can_access_admin_panel": true,
   "can_approve_collections": true,
   "can_manage_team_members": true
 }')
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    updated_at = NOW();

-- Step 5: Insert/Update STAFF role
INSERT INTO public.roles (id, name, description, permissions) VALUES
('00000000-0000-0000-0000-000000000003', 'STAFF', 'Office Staff with limited privileges', 
 '{
   "can_view_analytics": true,
   "can_view_collections": true,
   "can_view_pickups": true,
   "can_view_transactions": true,
   "can_manage_own_profile": true
 }')
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    updated_at = NOW();

-- Step 6: Insert/Update COLLECTOR role
INSERT INTO public.roles (id, name, description, permissions) VALUES
('00000000-0000-0000-0000-000000000004', 'COLLECTOR', 'Waste Collection Staff', 
 '{
   "can_collect_waste": true,
   "can_view_assigned_areas": true,
   "can_view_own_collections": true,
   "can_manage_own_profile": true
 }')
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    updated_at = NOW();

-- Step 7: Check if superadmin@wozamali.co.za exists in auth.users
SELECT 'Checking if superadmin@wozamali.co.za exists in auth.users:' as info;
SELECT id, email, created_at FROM auth.users WHERE email = 'superadmin@wozamali.co.za';

-- Step 8: Create superadmin user in users table (will be updated when auth user is created)
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

-- Step 9: If no auth user exists, create a placeholder entry
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

-- Step 10: Update the user ID to match the actual auth user if it exists
UPDATE public.users 
SET 
    id = au.id,
    updated_at = NOW()
FROM auth.users au
WHERE au.email = 'superadmin@wozamali.co.za' 
  AND public.users.email = 'superadmin@wozamali.co.za'
  AND public.users.id = '00000000-0000-0000-0000-000000000001'::uuid;

-- Step 11: Ensure the user has the correct role and permissions
UPDATE public.users 
SET 
    role_id = '00000000-0000-0000-0000-000000000001'::uuid,
    role = 'SUPER_ADMIN',
    status = 'active',
    is_approved = true,
    updated_at = NOW()
WHERE email = 'superadmin@wozamali.co.za';

-- Step 12: Create user_profiles table if it doesn't exist (for main app compatibility)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role TEXT DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 13: Create user_profiles entry for superadmin
INSERT INTO public.user_profiles (user_id, role)
SELECT 
    COALESCE(au.id, '00000000-0000-0000-0000-000000000001'::uuid),
    'SUPER_ADMIN'
FROM auth.users au
WHERE au.email = 'superadmin@wozamali.co.za'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_profiles up WHERE up.user_id = COALESCE(au.id, '00000000-0000-0000-0000-000000000001'::uuid)
  );

-- Step 14: Create RLS policies for proper access control
-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see their own data
CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Create policy for SUPER_ADMIN to see all users
CREATE POLICY "SUPER_ADMIN can view all users" ON public.users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'SUPER_ADMIN'
        )
    );

-- Create policy for ADMIN to see users (but not SUPER_ADMIN)
CREATE POLICY "ADMIN can view non-superadmin users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'ADMIN'
        )
        AND role != 'SUPER_ADMIN'
    );

-- Step 15: Final verification
SELECT '=== FINAL VERIFICATION ===' as info;

-- Show all roles
SELECT 'Available roles:' as info;
SELECT id, name, description, permissions FROM public.roles ORDER BY name;

-- Show the superadmin user
SELECT 'Superadmin user details:' as info;
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

-- Show auth user status
SELECT 'Auth user status:' as info;
SELECT 
    id, 
    email, 
    created_at,
    CASE 
        WHEN encrypted_password IS NOT NULL THEN 'Password set'
        ELSE 'No password - needs to be created in Supabase Dashboard'
    END as password_status
FROM auth.users 
WHERE email = 'superadmin@wozamali.co.za';

-- Show user_profiles entry
SELECT 'User profiles entry:' as info;
SELECT 
    up.user_id,
    up.role,
    au.email
FROM public.user_profiles up
LEFT JOIN auth.users au ON up.user_id = au.id
WHERE au.email = 'superadmin@wozamali.co.za' OR up.user_id = '00000000-0000-0000-0000-000000000001'::uuid;

-- Step 16: Instructions for completing the setup
SELECT '=== NEXT STEPS ===' as info;
SELECT '1. Create the auth user in Supabase Dashboard > Authentication > Users' as step;
SELECT '2. Set password for superadmin@wozamali.co.za' as step;
SELECT '3. The user will automatically get SUPER_ADMIN role and permissions' as step;
SELECT '4. Login to the app with superadmin@wozamali.co.za' as step;
SELECT '5. You should now see all super admin functions' as step;
