-- ============================================================================
-- COMPLETE PERMISSIONS FIX FOR ADMIN AND SUPER_ADMIN ROLES
-- ============================================================================
-- This script fixes permissions for both admin and super admin roles
-- and ensures proper RLS policies are in place

-- Step 1: Update SUPER_ADMIN role with comprehensive permissions
UPDATE public.roles 
SET 
    permissions = '{
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
    }'::jsonb,
    updated_at = NOW()
WHERE name = 'SUPER_ADMIN';

-- Step 2: Update ADMIN role with appropriate permissions
UPDATE public.roles 
SET 
    permissions = '{
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
    }'::jsonb,
    updated_at = NOW()
WHERE name = 'ADMIN';

-- Step 3: Update STAFF role with limited permissions
UPDATE public.roles 
SET 
    permissions = '{
        "can_view_analytics": true,
        "can_view_collections": true,
        "can_view_pickups": true,
        "can_view_transactions": true,
        "can_manage_own_profile": true,
        "can_view_reports": true
    }'::jsonb,
    updated_at = NOW()
WHERE name = 'STAFF';

-- Step 4: Update COLLECTOR role with collection permissions
UPDATE public.roles 
SET 
    permissions = '{
        "can_collect_waste": true,
        "can_view_assigned_areas": true,
        "can_view_own_collections": true,
        "can_manage_own_profile": true,
        "can_view_own_reports": true
    }'::jsonb,
    updated_at = NOW()
WHERE name = 'COLLECTOR';

-- Step 5: Create RLS policies for users table
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "SUPER_ADMIN can view all users" ON public.users;
DROP POLICY IF EXISTS "ADMIN can view non-superadmin users" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "SUPER_ADMIN can manage all users" ON public.users;
DROP POLICY IF EXISTS "ADMIN can manage non-superadmin users" ON public.users;

-- Create new comprehensive RLS policies
CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "SUPER_ADMIN can view all users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'SUPER_ADMIN'
        )
    );

CREATE POLICY "SUPER_ADMIN can manage all users" ON public.users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'SUPER_ADMIN'
        )
    );

CREATE POLICY "ADMIN can view non-superadmin users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'ADMIN'
        )
        AND role != 'SUPER_ADMIN'
    );

CREATE POLICY "ADMIN can manage non-superadmin users" ON public.users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'ADMIN'
        )
        AND role != 'SUPER_ADMIN'
    );

-- Step 6: Create RLS policies for roles table
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SUPER_ADMIN can view all roles" ON public.roles;
DROP POLICY IF EXISTS "ADMIN can view non-superadmin roles" ON public.roles;
DROP POLICY IF EXISTS "SUPER_ADMIN can manage roles" ON public.roles;

CREATE POLICY "SUPER_ADMIN can view all roles" ON public.roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'SUPER_ADMIN'
        )
    );

CREATE POLICY "ADMIN can view non-superadmin roles" ON public.roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'ADMIN'
        )
        AND name != 'SUPER_ADMIN'
    );

CREATE POLICY "SUPER_ADMIN can manage roles" ON public.roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'SUPER_ADMIN'
        )
    );

-- Step 7: Create helper function to check user permissions
CREATE OR REPLACE FUNCTION public.check_user_permission(permission_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.users u
        JOIN public.roles r ON u.role_id = r.id
        WHERE u.id = auth.uid()
        AND r.permissions ? permission_name
        AND (r.permissions ->> permission_name)::boolean = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create helper function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT u.role 
        FROM public.users u 
        WHERE u.id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Create helper function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT u.role = 'SUPER_ADMIN' 
        FROM public.users u 
        WHERE u.id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT u.role IN ('SUPER_ADMIN', 'ADMIN') 
        FROM public.users u 
        WHERE u.id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 11: Create RPC function to get user permissions
CREATE OR REPLACE FUNCTION public.get_user_permissions()
RETURNS JSONB AS $$
BEGIN
    RETURN (
        SELECT r.permissions 
        FROM public.users u
        JOIN public.roles r ON u.role_id = r.id
        WHERE u.id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 12: Create RPC function to get all users (with proper permissions)
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
    id UUID,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    role TEXT,
    status TEXT,
    is_approved BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    -- Check if user has permission to view all users
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Insufficient permissions';
    END IF;
    
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.full_name,
        u.role,
        u.status,
        u.is_approved,
        u.created_at,
        u.updated_at
    FROM public.users u
    WHERE 
        -- SUPER_ADMIN can see all users
        (public.is_super_admin()) 
        OR 
        -- ADMIN can see all users except SUPER_ADMIN
        (public.get_user_role() = 'ADMIN' AND u.role != 'SUPER_ADMIN');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 13: Create RPC function to create new user (with proper permissions)
CREATE OR REPLACE FUNCTION public.create_user(
    user_email TEXT,
    user_first_name TEXT,
    user_last_name TEXT,
    user_role TEXT,
    user_phone TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    new_user_id UUID;
    role_id UUID;
BEGIN
    -- Check if user has permission to create users
    IF NOT public.check_user_permission('can_manage_users') THEN
        RAISE EXCEPTION 'Insufficient permissions to create users';
    END IF;
    
    -- Check if trying to create SUPER_ADMIN (only SUPER_ADMIN can do this)
    IF user_role = 'SUPER_ADMIN' AND NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Only SUPER_ADMIN can create SUPER_ADMIN users';
    END IF;
    
    -- Get role ID
    SELECT id INTO role_id FROM public.roles WHERE name = user_role;
    IF role_id IS NULL THEN
        RAISE EXCEPTION 'Invalid role: %', user_role;
    END IF;
    
    -- Generate new user ID
    new_user_id := gen_random_uuid();
    
    -- Insert user
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
        new_user_id,
        user_email,
        user_first_name,
        user_last_name,
        user_first_name || ' ' || user_last_name,
        role_id,
        user_role,
        'active',
        true,
        NOW(),
        NOW()
    );
    
    -- Create user_profiles entry
    INSERT INTO public.user_profiles (user_id, role)
    VALUES (new_user_id, user_role);
    
    RETURN jsonb_build_object(
        'success', true,
        'user_id', new_user_id,
        'message', 'User created successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 14: Final verification
SELECT '=== PERMISSIONS FIX COMPLETE ===' as info;

-- Show all roles with their permissions
SELECT 'Updated roles and permissions:' as info;
SELECT 
    r.name,
    r.description,
    r.permissions
FROM public.roles r
ORDER BY r.name;

-- Show RLS policies
SELECT 'RLS policies created:' as info;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'roles')
ORDER BY tablename, policyname;

-- Show helper functions
SELECT 'Helper functions created:' as info;
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'check_user_permission',
    'get_user_role',
    'is_super_admin',
    'is_admin',
    'get_user_permissions',
    'get_all_users',
    'create_user'
)
ORDER BY routine_name;

SELECT '=== NEXT STEPS ===' as info;
SELECT '1. Test login with superadmin@wozamali.co.za' as step;
SELECT '2. Verify you can see all admin functions' as step;
SELECT '3. Test creating admin users' as step;
SELECT '4. Test admin user permissions' as step;
SELECT '5. All permissions should now be working correctly' as step;
