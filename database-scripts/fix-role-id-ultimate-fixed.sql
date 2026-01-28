-- ============================================================================
-- ULTIMATE ROLE_ID FIX - HANDLES ALL DEPENDENCIES PROPERLY (FIXED)
-- ============================================================================
-- This script handles all dependencies (views, policies, constraints) and fixes the role_id column

-- Step 1: Check what policies depend on the role_id column
SELECT 'Policies that depend on role_id column:' as info;
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
AND qual LIKE '%role_id%';

-- Step 2: Drop all policies that depend on role_id
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop policies on users table
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'users'
        AND qual LIKE '%role_id%'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.users';
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
    
    -- Drop policies on rewards table
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'rewards'
        AND qual LIKE '%role_id%'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.rewards';
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
    
    -- Drop policies on other tables that might depend on role_id
    FOR policy_record IN 
        SELECT tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND qual LIKE '%role_id%'
        AND tablename NOT IN ('users', 'rewards')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.' || policy_record.tablename;
        RAISE NOTICE 'Dropped policy: % on table: %', policy_record.policyname, policy_record.tablename;
    END LOOP;
END $$;

-- Step 3: Drop ALL views and triggers that depend on role_id
-- First, let's see what views exist that might depend on role_id
SELECT 'Views that might depend on role_id:' as info;
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE schemaname = 'public' 
AND definition LIKE '%role_id%';

-- Check for triggers that depend on role_id
SELECT 'Triggers that might depend on role_id:' as info;
SELECT 
    t.trigger_name,
    t.event_manipulation,
    t.action_timing,
    t.action_statement
FROM information_schema.triggers t
WHERE t.trigger_schema = 'public'
AND t.action_statement LIKE '%role_id%';

-- Drop known views that depend on role_id
DROP VIEW IF EXISTS public.v_team_members CASCADE;
DROP VIEW IF EXISTS public.v_users CASCADE;
DROP VIEW IF EXISTS public.v_user_profiles CASCADE;
DROP VIEW IF EXISTS public.v_team_members_with_roles CASCADE;
DROP VIEW IF EXISTS public.residents_view CASCADE;

-- Drop known triggers that depend on role_id
DROP TRIGGER IF EXISTS before_users_ins_upd_role ON public.users;

-- Dynamically drop any remaining views that depend on role_id
DO $$ 
DECLARE
    view_record RECORD;
BEGIN
    FOR view_record IN 
        SELECT schemaname, viewname
        FROM pg_views 
        WHERE schemaname = 'public' 
        AND definition LIKE '%role_id%'
    LOOP
        EXECUTE 'DROP VIEW IF EXISTS ' || view_record.schemaname || '.' || view_record.viewname || ' CASCADE';
        RAISE NOTICE 'Dropped view: %', view_record.viewname;
    END LOOP;
END $$;

-- Dynamically drop any remaining triggers that depend on role_id
DO $$ 
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT trigger_name, event_object_table
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
        AND action_statement LIKE '%role_id%'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_record.trigger_name || ' ON public.' || trigger_record.event_object_table;
        RAISE NOTICE 'Dropped trigger: %', trigger_record.trigger_name;
    END LOOP;
END $$;

-- Step 4: Check if there are any remaining dependencies
SELECT 'Remaining policies that depend on role_id:' as info;
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
AND qual LIKE '%role_id%';

-- Step 5: Now fix the role_id column
-- First, drop the default value
ALTER TABLE public.users ALTER COLUMN role_id DROP DEFAULT;

-- Then update the column type to UUID
ALTER TABLE public.users ALTER COLUMN role_id TYPE UUID USING role_id::uuid;

-- Set a new default value (NULL is fine for UUID)
ALTER TABLE public.users ALTER COLUMN role_id SET DEFAULT NULL;

-- Step 6: Create roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 7: Create SUPER_ADMIN role first
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

-- Step 8: Create ADMIN role
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

-- Step 9: Create other roles
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

-- Step 10: Fix role constraint by dropping and recreating it
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

-- Step 11: Update any existing users with invalid roles
UPDATE public.users 
SET role = 'MEMBER'
WHERE role IS NULL OR role NOT IN ('SUPER_ADMIN', 'ADMIN', 'STAFF', 'COLLECTOR', 'MEMBER', 'CUSTOMER');

-- Step 12: Add the updated role constraint
ALTER TABLE public.users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'STAFF', 'COLLECTOR', 'MEMBER', 'CUSTOMER'));

-- Step 13: Check existing foreign key constraints
SELECT 'Existing foreign key constraints on users table:' as info;
SELECT 
    conname as constraint_name,
    confrelid::regclass as referenced_table,
    a.attname as column_name,
    af.attname as referenced_column
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
JOIN pg_attribute af ON af.attrelid = c.confrelid AND af.attnum = ANY(c.confkey)
WHERE c.conrelid = 'public.users'::regclass
AND c.contype = 'f'
ORDER BY conname;

-- Remove any incorrect foreign key constraints first
DO $$ 
BEGIN
    -- Drop the incorrect foreign key constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.users'::regclass 
        AND conname = 'users_role_name_fkey'
    ) THEN
        ALTER TABLE public.users DROP CONSTRAINT users_role_name_fkey;
        RAISE NOTICE 'Dropped incorrect foreign key constraint users_role_name_fkey';
    END IF;
    
    -- Drop any other incorrect foreign key constraints that might exist
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.users'::regclass 
        AND conname LIKE '%role%'
        AND conname != 'users_role_id_fkey'
    ) THEN
        ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_fkey;
        ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_name_fkey;
        ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_id_fkey;
        RAISE NOTICE 'Dropped any existing role-related foreign key constraints';
    END IF;
END $$;

-- Step 14: Add the correct foreign key constraint to roles table
ALTER TABLE public.users 
ADD CONSTRAINT users_role_id_fkey 
FOREIGN KEY (role_id) REFERENCES public.roles(id);

-- Step 14: Now create the superadmin user
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

-- Step 15: Create user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role TEXT DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 16: Create user_profiles entry for superadmin
INSERT INTO public.user_profiles (user_id, role)
VALUES ('b1b84587-6a12-43e9-85ef-d465cbf8ece3'::uuid, 'SUPER_ADMIN')
ON CONFLICT (user_id) DO UPDATE SET
    role = EXCLUDED.role,
    updated_at = NOW();

-- Step 17: Recreate the views
CREATE VIEW public.v_team_members AS
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.full_name,
    u.role_id,
    u.role,
    u.status,
    u.is_approved,
    u.created_at,
    u.updated_at,
    r.name as role_name,
    r.permissions
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
WHERE u.role IN ('SUPER_ADMIN', 'ADMIN', 'STAFF', 'COLLECTOR');

CREATE VIEW public.v_users AS
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.full_name,
    u.role_id,
    u.role,
    u.status,
    u.is_approved,
    u.created_at,
    u.updated_at,
    r.name as role_name,
    r.permissions
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id;

CREATE VIEW public.v_user_profiles AS
SELECT 
    up.id,
    up.user_id,
    up.role,
    up.created_at,
    up.updated_at,
    u.email,
    u.full_name,
    u.status
FROM public.user_profiles up
LEFT JOIN public.users u ON up.user_id = u.id;

-- Recreate residents_view if it existed
CREATE VIEW public.residents_view AS
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.full_name,
    u.phone,
    u.township,
    u.role_id,
    u.role,
    u.status,
    u.is_approved,
    u.created_at,
    u.updated_at,
    r.name as role_name,
    r.permissions
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
WHERE u.role IN ('MEMBER', 'CUSTOMER');

-- Recreate the trigger that was dropped
CREATE OR REPLACE FUNCTION public.before_users_ins_upd_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the role text field based on role_id
    IF NEW.role_id IS NOT NULL THEN
        SELECT name INTO NEW.role FROM public.roles WHERE id = NEW.role_id;
    END IF;
    
    -- Update the updated_at timestamp
    NEW.updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_users_ins_upd_role
    BEFORE INSERT OR UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.before_users_ins_upd_role();

-- Step 18: Recreate RLS policies
-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see their own data
CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Create policy for SUPER_ADMIN to see all users
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

CREATE POLICY "ADMIN can manage non-superadmin users" ON public.users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'ADMIN'
        )
        AND role != 'SUPER_ADMIN'
    );

-- Step 19: Recreate policies on other tables if needed
-- Enable RLS on rewards table if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rewards' AND table_schema = 'public') THEN
        ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
        
        -- Create policy for office users to manage rewards
        CREATE POLICY "Allow office users to manage rewards" ON public.rewards
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.users u 
                    WHERE u.id = auth.uid() 
                    AND u.role IN ('SUPER_ADMIN', 'ADMIN', 'STAFF')
                )
            );
        
        RAISE NOTICE 'Created rewards policy';
    END IF;
END $$;

-- Step 20: Final verification
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

-- Show views recreated
SELECT 'Views recreated:' as info;
SELECT 
    schemaname,
    viewname
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN ('v_team_members', 'v_users', 'v_user_profiles', 'residents_view')
ORDER BY viewname;

-- Show triggers recreated
SELECT 'Triggers recreated:' as info;
SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name = 'before_users_ins_upd_role';

-- Show policies recreated
SELECT 'Policies recreated:' as info;
SELECT 
    schemaname,
    tablename,
    policyname
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'users'
ORDER BY policyname;

-- Show foreign key constraints after fix
SELECT 'Foreign key constraints after fix:' as info;
SELECT 
    conname as constraint_name,
    confrelid::regclass as referenced_table,
    a.attname as column_name,
    af.attname as referenced_column
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
JOIN pg_attribute af ON af.attrelid = c.confrelid AND af.attnum = ANY(c.confkey)
WHERE c.conrelid = 'public.users'::regclass
AND c.contype = 'f'
ORDER BY conname;

SELECT '=== NEXT STEPS ===' as info;
SELECT '1. Login to the app with superadmin@wozamali.co.za' as step;
SELECT '2. You should now see all super admin functions' as step;
SELECT '3. Test creating admin users' as step;
SELECT '4. All permissions should be working correctly' as step;
