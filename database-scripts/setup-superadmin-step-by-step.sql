-- ============================================================================
-- STEP-BY-STEP SUPER ADMIN SETUP - HANDLES ALL CONSTRAINTS
-- ============================================================================
-- This script handles all constraints and creates everything in the right order

-- Step 1: Fix users table structure first
DO $$ 
BEGIN
    -- Add all missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_approved' AND table_schema = 'public') THEN
        ALTER TABLE public.users ADD COLUMN is_approved BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'approval_date' AND table_schema = 'public') THEN
        ALTER TABLE public.users ADD COLUMN approval_date TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'approved_by' AND table_schema = 'public') THEN
        ALTER TABLE public.users ADD COLUMN approved_by UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'employee_number' AND table_schema = 'public') THEN
        ALTER TABLE public.users ADD COLUMN employee_number TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'township' AND table_schema = 'public') THEN
        ALTER TABLE public.users ADD COLUMN township TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone' AND table_schema = 'public') THEN
        ALTER TABLE public.users ADD COLUMN phone TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'first_name' AND table_schema = 'public') THEN
        ALTER TABLE public.users ADD COLUMN first_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_name' AND table_schema = 'public') THEN
        ALTER TABLE public.users ADD COLUMN last_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'full_name' AND table_schema = 'public') THEN
        ALTER TABLE public.users ADD COLUMN full_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role_id' AND table_schema = 'public') THEN
        ALTER TABLE public.users ADD COLUMN role_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role' AND table_schema = 'public') THEN
        ALTER TABLE public.users ADD COLUMN role TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'status' AND table_schema = 'public') THEN
        ALTER TABLE public.users ADD COLUMN status TEXT DEFAULT 'active';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_at' AND table_schema = 'public') THEN
        ALTER TABLE public.users ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at' AND table_schema = 'public') THEN
        ALTER TABLE public.users ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_login' AND table_schema = 'public') THEN
        ALTER TABLE public.users ADD COLUMN last_login TIMESTAMPTZ;
    END IF;
END $$;

-- Step 2: Create roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create SUPER_ADMIN role first
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
   "can_manage_system_settings": true,
   "can_manage_wallets": true,
   "can_manage_reports": true,
   "can_export_data": true,
   "can_manage_notifications": true,
   "can_manage_integrations": true
 }')
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    updated_at = NOW();

-- Step 4: Create ADMIN role
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
   "can_manage_team_members": true,
   "can_manage_wallets": true,
   "can_manage_reports": true,
   "can_export_data": true,
   "can_manage_notifications": true
 }')
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    updated_at = NOW();

-- Step 5: Create other roles
INSERT INTO public.roles (id, name, description, permissions) VALUES
('00000000-0000-0000-0000-000000000003', 'STAFF', 'Office Staff with limited privileges', 
 '{
   "can_view_analytics": true,
   "can_view_collections": true,
   "can_view_pickups": true,
   "can_view_transactions": true,
   "can_manage_own_profile": true,
   "can_view_reports": true
 }')
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    updated_at = NOW();

INSERT INTO public.roles (id, name, description, permissions) VALUES
('00000000-0000-0000-0000-000000000004', 'COLLECTOR', 'Waste Collection Staff', 
 '{
   "can_collect_waste": true,
   "can_view_assigned_areas": true,
   "can_view_own_collections": true,
   "can_manage_own_profile": true,
   "can_view_own_reports": true
 }')
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    updated_at = NOW();

INSERT INTO public.roles (id, name, description, permissions) VALUES
('00000000-0000-0000-0000-000000000005', 'MEMBER', 'Regular Member', 
 '{
   "can_view_own_data": true,
   "can_make_collections": true,
   "can_manage_own_profile": true
 }')
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    updated_at = NOW();

INSERT INTO public.roles (id, name, description, permissions) VALUES
('00000000-0000-0000-0000-000000000006', 'CUSTOMER', 'Customer', 
 '{
   "can_view_own_data": true,
   "can_make_collections": true,
   "can_manage_own_profile": true
 }')
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    updated_at = NOW();

-- Step 6: Verify roles were created
SELECT 'Roles created:' as info;
SELECT id, name, description FROM public.roles ORDER BY name;

-- Step 7: Fix role constraint by dropping and recreating it
DO $$ 
BEGIN
    -- Drop the role constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.users'::regclass 
        AND conname LIKE '%role%'
    ) THEN
        ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
        RAISE NOTICE 'Dropped existing role constraint';
    END IF;
END $$;

-- Step 8: Update any existing users with invalid roles
UPDATE public.users 
SET role = 'MEMBER'
WHERE role IS NULL OR role NOT IN ('SUPER_ADMIN', 'ADMIN', 'STAFF', 'COLLECTOR', 'MEMBER', 'CUSTOMER');

-- Step 9: Add the updated role constraint
ALTER TABLE public.users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'STAFF', 'COLLECTOR', 'MEMBER', 'CUSTOMER'));

-- Step 10: Add foreign key constraint to roles table
ALTER TABLE public.users 
ADD CONSTRAINT users_role_id_fkey 
FOREIGN KEY (role_id) REFERENCES public.roles(id);

-- Step 11: Now create the superadmin user
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
) VALUES (
    'b1b84587-6a12-43e9-85ef-d465cbf8ece3'::uuid,
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
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    full_name = EXCLUDED.full_name,
    role_id = EXCLUDED.role_id,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    is_approved = EXCLUDED.is_approved,
    updated_at = NOW();

-- Step 12: Create user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role TEXT DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 13: Create user_profiles entry for superadmin
INSERT INTO public.user_profiles (user_id, role)
VALUES ('b1b84587-6a12-43e9-85ef-d465cbf8ece3'::uuid, 'SUPER_ADMIN')
ON CONFLICT (user_id) DO UPDATE SET
    role = EXCLUDED.role,
    updated_at = NOW();

-- Step 14: Final verification
SELECT '=== SUPER ADMIN SETUP COMPLETE ===' as info;

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
WHERE u.id = 'b1b84587-6a12-43e9-85ef-d465cbf8ece3';

-- Show auth user status
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
WHERE id = 'b1b84587-6a12-43e9-85ef-d465cbf8ece3';

-- Show all roles
SELECT 'Available roles:' as info;
SELECT id, name, description FROM public.roles ORDER BY name;

SELECT '=== NEXT STEPS ===' as info;
SELECT '1. Login to the app with superadmin@wozamali.co.za' as step;
SELECT '2. You should now see all super admin functions' as step;
SELECT '3. Test creating admin users' as step;
SELECT '4. All permissions should be working correctly' as step;
