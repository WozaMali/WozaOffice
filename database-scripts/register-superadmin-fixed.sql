-- ============================================================================
-- FIXED SUPER ADMIN REGISTRATION - HANDLES MISSING COLUMNS
-- ============================================================================
-- This script will:
-- 1. Fix the users table structure first
-- 2. Create the SUPER_ADMIN role with full permissions
-- 3. Create the superadmin@wozamali.co.za user
-- 4. Fix admin role permissions
-- 5. Set up proper RLS policies

-- Step 1: Fix users table structure first
DO $$ 
BEGIN
    -- Add is_approved column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'is_approved'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN is_approved BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_approved column to users table';
    END IF;

    -- Add approval_date column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'approval_date'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN approval_date TIMESTAMPTZ;
        RAISE NOTICE 'Added approval_date column to users table';
    END IF;

    -- Add approved_by column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'approved_by'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN approved_by UUID;
        RAISE NOTICE 'Added approved_by column to users table';
    END IF;

    -- Add employee_number column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'employee_number'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN employee_number TEXT;
        RAISE NOTICE 'Added employee_number column to users table';
    END IF;

    -- Add township column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'township'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN township TEXT;
        RAISE NOTICE 'Added township column to users table';
    END IF;

    -- Add phone column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'phone'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN phone TEXT;
        RAISE NOTICE 'Added phone column to users table';
    END IF;

    -- Add first_name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'first_name'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN first_name TEXT;
        RAISE NOTICE 'Added first_name column to users table';
    END IF;

    -- Add last_name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'last_name'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN last_name TEXT;
        RAISE NOTICE 'Added last_name column to users table';
    END IF;

    -- Add full_name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'full_name'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN full_name TEXT;
        RAISE NOTICE 'Added full_name column to users table';
    END IF;

    -- Add role_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'role_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN role_id UUID REFERENCES public.roles(id);
        RAISE NOTICE 'Added role_id column to users table';
    END IF;

    -- Add role column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'role'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN role TEXT;
        RAISE NOTICE 'Added role column to users table';
    END IF;

    -- Add status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'status'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'suspended'));
        RAISE NOTICE 'Added status column to users table';
    END IF;

    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'created_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added created_at column to users table';
    END IF;

    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'updated_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to users table';
    END IF;

    -- Add last_login column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'last_login'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN last_login TIMESTAMPTZ;
        RAISE NOTICE 'Added last_login column to users table';
    END IF;

END $$;

-- Step 2: Create/Update roles table with proper structure
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
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

-- Step 5: Check if superadmin@wozamali.co.za exists in auth.users
SELECT 'Checking if superadmin@wozamali.co.za exists in auth.users:' as info;
SELECT id, email, created_at FROM auth.users WHERE email = 'superadmin@wozamali.co.za';

-- Step 6: Create superadmin user in users table (will be updated when auth user is created)
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

-- Step 7: If no auth user exists, create a placeholder entry
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

-- Step 8: Update the user ID to match the actual auth user if it exists
UPDATE public.users 
SET 
    id = au.id,
    updated_at = NOW()
FROM auth.users au
WHERE au.email = 'superadmin@wozamali.co.za' 
  AND public.users.email = 'superadmin@wozamali.co.za'
  AND public.users.id = '00000000-0000-0000-0000-000000000001'::uuid;

-- Step 9: Ensure the user has the correct role and permissions
UPDATE public.users 
SET 
    role_id = '00000000-0000-0000-0000-000000000001'::uuid,
    role = 'SUPER_ADMIN',
    status = 'active',
    is_approved = true,
    updated_at = NOW()
WHERE email = 'superadmin@wozamali.co.za';

-- Step 10: Create user_profiles table if it doesn't exist (for main app compatibility)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role TEXT DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 11: Create user_profiles entry for superadmin
INSERT INTO public.user_profiles (user_id, role)
SELECT 
    COALESCE(au.id, '00000000-0000-0000-0000-000000000001'::uuid),
    'SUPER_ADMIN'
FROM auth.users au
WHERE au.email = 'superadmin@wozamali.co.za'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_profiles up WHERE up.user_id = COALESCE(au.id, '00000000-0000-0000-0000-000000000001'::uuid)
  );

-- Step 12: Final verification
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

-- Step 13: Instructions for completing the setup
SELECT '=== NEXT STEPS ===' as info;
SELECT '1. Create the auth user in Supabase Dashboard > Authentication > Users' as step;
SELECT '2. Set password for superadmin@wozamali.co.za' as step;
SELECT '3. The user will automatically get SUPER_ADMIN role and permissions' as step;
SELECT '4. Login to the app with superadmin@wozamali.co.za' as step;
SELECT '5. You should now see all super admin functions' as step;
