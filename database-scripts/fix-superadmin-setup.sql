-- ============================================================================
-- FIX SUPERADMIN SETUP - CREATE ROLES AND USER
-- ============================================================================

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

-- Step 3: Insert roles
INSERT INTO public.roles (id, name, description, permissions) VALUES
('00000000-0000-0000-0000-000000000001', 'SUPER_ADMIN', 'Super Administrator with full system access', '{"can_manage_all": true, "can_view_analytics": true, "can_manage_users": true, "can_access_team_members": true}'),
('00000000-0000-0000-0000-000000000002', 'ADMIN', 'System administrators', '{"can_manage_all": true, "can_view_analytics": true, "can_manage_users": true}'),
('00000000-0000-0000-0000-000000000003', 'STAFF', 'Office staff', '{"can_view_analytics": true, "can_manage_users": false}'),
('00000000-0000-0000-0000-000000000004', 'COLLECTOR', 'Waste collection staff', '{"can_collect_waste": true, "can_view_assigned_areas": true}')
ON CONFLICT (name) DO NOTHING;

-- Step 4: Create superadmin user in users table
INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    full_name,
    role_id,
    status,
    is_approved,
    created_at,
    updated_at
)
SELECT 
    au.id,
    'superadmin@wozamali.co.za',
    'Super',
    'Admin',
    'Super Admin',
    '00000000-0000-0000-0000-000000000001'::uuid,
    'active',
    true,
    NOW(),
    NOW()
FROM auth.users au
WHERE au.email = 'superadmin@wozamali.co.za'
  AND NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.email = 'superadmin@wozamali.co.za'
  );

-- Step 5: If superadmin user doesn't exist in auth.users, create a placeholder
-- (This will need to be updated when the actual auth user is created)
INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    full_name,
    role_id,
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
    'active',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.email = 'superadmin@wozamali.co.za'
);

-- Step 6: Update the user ID to match the actual auth user if it exists
UPDATE public.users 
SET id = (
    SELECT id FROM auth.users 
    WHERE email = 'superadmin@wozamali.co.za' 
    LIMIT 1
)
WHERE email = 'superadmin@wozamali.co.za' 
AND id = '00000000-0000-0000-0000-000000000001'::uuid;

-- Step 7: Final verification
SELECT 'Final verification - superadmin setup:' as info;
SELECT 
    u.id,
    u.email,
    u.full_name,
    r.name as role_name,
    u.status,
    u.is_approved
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
WHERE u.email = 'superadmin@wozamali.co.za';

-- Step 8: Show all available roles
SELECT 'Available roles:' as info;
SELECT id, name, description FROM public.roles ORDER BY name;
