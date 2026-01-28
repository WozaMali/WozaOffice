-- ============================================================================
-- ULTIMATE ROLE_ID FIX - COMPLETE VERSION (HANDLES ALL DEPENDENCIES)
-- ============================================================================
-- This script handles ALL dependencies and fixes the role_id column properly

-- Step 1: Check current database state
SELECT '=== CURRENT DATABASE STATE ===' as info;

-- Show current users table structure
SELECT 'Current users table structure:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- Show existing foreign key constraints
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

-- Show existing views that depend on role_id
SELECT 'Views that depend on role_id:' as info;
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE schemaname = 'public' 
AND definition LIKE '%role_id%';

-- Show existing triggers that depend on role_id
SELECT 'Triggers that depend on role_id:' as info;
SELECT 
    t.trigger_name,
    t.event_manipulation,
    t.action_timing,
    t.action_statement
FROM information_schema.triggers t
WHERE t.trigger_schema = 'public'
AND t.action_statement LIKE '%role_id%';

-- Show existing functions that depend on role_id
SELECT 'Functions that depend on role_id:' as info;
SELECT 
    r.routine_name,
    r.routine_type,
    r.data_type,
    r.routine_definition
FROM information_schema.routines r
WHERE r.routine_schema = 'public'
AND r.routine_definition LIKE '%role_id%';

-- Show existing policies that depend on role_id
SELECT 'Policies that depend on role_id:' as info;
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

-- Step 2: Drop ALL dependencies that prevent column type change
SELECT '=== DROPPING ALL DEPENDENCIES ===' as info;

-- Drop all policies that depend on role_id
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

-- Drop all views that depend on role_id
DROP VIEW IF EXISTS public.v_team_members CASCADE;
DROP VIEW IF EXISTS public.v_users CASCADE;
DROP VIEW IF EXISTS public.v_user_profiles CASCADE;
DROP VIEW IF EXISTS public.v_team_members_with_roles CASCADE;
DROP VIEW IF EXISTS public.residents_view CASCADE;

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

-- Drop all triggers that depend on role_id
DROP TRIGGER IF EXISTS before_users_ins_upd_role ON public.users;

-- Drop any functions that might depend on role_id
DROP FUNCTION IF EXISTS public.set_default_resident_role() CASCADE;

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

-- Dynamically drop any remaining functions that might depend on role_id
DO $$ 
DECLARE
    function_record RECORD;
BEGIN
    FOR function_record IN 
        SELECT routine_name
        FROM information_schema.routines
        WHERE routine_schema = 'public'
        AND routine_definition LIKE '%role_id%'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS public.' || function_record.routine_name || '() CASCADE';
        RAISE NOTICE 'Dropped function: %', function_record.routine_name;
    END LOOP;
END $$;

-- Drop ALL foreign key constraints on users table
DO $$ 
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN 
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.users'::regclass
        AND contype = 'f'
    LOOP
        EXECUTE 'ALTER TABLE public.users DROP CONSTRAINT ' || constraint_record.conname;
        RAISE NOTICE 'Dropped foreign key constraint: %', constraint_record.conname;
    END LOOP;
END $$;

-- Step 3: Fix the role_id column type
SELECT '=== FIXING ROLE_ID COLUMN TYPE ===' as info;

-- First, let's see what data exists in role_id column
SELECT 'Current role_id values:' as info;
SELECT DISTINCT role_id, role FROM public.users WHERE role_id IS NOT NULL;

-- Update existing users with invalid role_id values to NULL
-- Since role_id is now UUID type, we need to handle this differently
-- First, let's see what invalid values exist by checking if they can be cast to UUID
SELECT 'Invalid role_id values that need to be cleaned:' as info;
SELECT role_id, role FROM public.users 
WHERE role_id IS NOT NULL 
AND NOT (role_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- Update existing users with invalid role_id values to NULL
-- Use a safer approach that handles UUID conversion errors
DO $$ 
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN 
        SELECT id, role_id, role
        FROM public.users 
        WHERE role_id IS NOT NULL
    LOOP
        -- Try to validate the UUID format
        BEGIN
            -- If this doesn't throw an error, the UUID is valid
            PERFORM user_record.role_id::text;
            -- Check if it matches UUID pattern
            IF NOT (user_record.role_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') THEN
                UPDATE public.users SET role_id = NULL WHERE id = user_record.id;
                RAISE NOTICE 'Cleaned invalid role_id for user: %', user_record.id;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                -- If there's any error, set role_id to NULL
                UPDATE public.users SET role_id = NULL WHERE id = user_record.id;
                RAISE NOTICE 'Cleaned invalid role_id for user: % (error: %)', user_record.id, SQLERRM;
        END;
    END LOOP;
END $$;

-- Remove any default value from role_id
ALTER TABLE public.users ALTER COLUMN role_id DROP DEFAULT;

-- Change the column type to UUID
ALTER TABLE public.users ALTER COLUMN role_id TYPE UUID USING role_id::uuid;

-- Set a new default value (NULL is fine for UUID)
ALTER TABLE public.users ALTER COLUMN role_id SET DEFAULT NULL;

-- Step 4: Create/Update roles table
SELECT '=== CREATING/UPDATING ROLES TABLE ===' as info;

CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create SUPER_ADMIN role first
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

-- Create ADMIN role
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

-- Create other roles
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

-- Step 5: Fix role constraint
SELECT '=== FIXING ROLE CONSTRAINT ===' as info;

-- Drop the role constraint if it exists
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- Update any existing users with invalid roles
UPDATE public.users 
SET role = 'MEMBER'
WHERE role IS NULL OR role NOT IN ('SUPER_ADMIN', 'ADMIN', 'STAFF', 'COLLECTOR', 'MEMBER', 'CUSTOMER');

-- Add the updated role constraint
ALTER TABLE public.users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'STAFF', 'COLLECTOR', 'MEMBER', 'CUSTOMER'));

-- Step 6: Update existing users with correct role_id values
SELECT '=== UPDATING EXISTING USERS WITH CORRECT ROLE_ID ===' as info;

-- Update existing users based on their role text field
UPDATE public.users 
SET role_id = (SELECT id FROM public.roles WHERE name = public.users.role)
WHERE role IN ('SUPER_ADMIN', 'ADMIN', 'STAFF', 'COLLECTOR', 'MEMBER', 'CUSTOMER')
AND role_id IS NULL;

-- Show updated users
SELECT 'Users after role_id update:' as info;
SELECT id, email, role, role_id FROM public.users WHERE role_id IS NOT NULL;

-- Step 7: Add the correct foreign key constraint
SELECT '=== ADDING CORRECT FOREIGN KEY CONSTRAINT ===' as info;

ALTER TABLE public.users 
ADD CONSTRAINT users_role_id_fkey 
FOREIGN KEY (role_id) REFERENCES public.roles(id);

-- Step 8: Verify roles exist before creating superadmin user
SELECT '=== VERIFYING ROLES EXIST ===' as info;

-- Show all roles that should exist
SELECT 'Roles that should exist:' as info;
SELECT id, name, description FROM public.roles ORDER BY name;

-- Check if SUPER_ADMIN role exists
SELECT 'SUPER_ADMIN role check:' as info;
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.roles WHERE name = 'SUPER_ADMIN') 
        THEN 'SUPER_ADMIN role exists'
        ELSE 'SUPER_ADMIN role missing'
    END as status;

-- Create the superadmin user only if SUPER_ADMIN role exists
SELECT '=== CREATING SUPERADMIN USER ===' as info;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM public.roles WHERE name = 'SUPER_ADMIN') THEN
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
            (SELECT id FROM public.roles WHERE name = 'SUPER_ADMIN'),
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
        
        RAISE NOTICE 'Superadmin user created/updated successfully';
    ELSE
        RAISE NOTICE 'SUPER_ADMIN role does not exist, skipping superadmin user creation';
    END IF;
END $$;

-- Step 9: Create user_profiles table and entry
SELECT '=== CREATING USER_PROFILES ===' as info;

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role TEXT DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_profiles entry only if superadmin user exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM public.users WHERE id = 'b1b84587-6a12-43e9-85ef-d465cbf8ece3'::uuid) THEN
        INSERT INTO public.user_profiles (user_id, role)
        VALUES ('b1b84587-6a12-43e9-85ef-d465cbf8ece3'::uuid, 'SUPER_ADMIN')
        ON CONFLICT (user_id) DO UPDATE SET
            role = EXCLUDED.role,
            updated_at = NOW();
        
        RAISE NOTICE 'User profile created/updated successfully';
    ELSE
        RAISE NOTICE 'Superadmin user does not exist, skipping user profile creation';
    END IF;
END $$;

-- Step 10: Recreate all views
SELECT '=== RECREATING VIEWS ===' as info;

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

-- Step 11: Recreate the trigger
SELECT '=== RECREATING TRIGGER ===' as info;

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

-- Recreate the set_default_resident_role function with proper UUID handling
CREATE OR REPLACE FUNCTION public.set_default_resident_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Set default role_id to MEMBER if not provided
    IF NEW.role_id IS NULL THEN
        NEW.role_id = (SELECT id FROM public.roles WHERE name = 'MEMBER');
        NEW.role = 'MEMBER';
    END IF;
    
    -- Update the updated_at timestamp
    NEW.updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for set_default_resident_role
DO $$ 
BEGIN
    -- Drop the trigger if it exists first
    DROP TRIGGER IF EXISTS set_default_resident_role_trigger ON public.users;
    
    -- Create the trigger
    CREATE TRIGGER set_default_resident_role_trigger
        BEFORE INSERT ON public.users
        FOR EACH ROW
        EXECUTE FUNCTION public.set_default_resident_role();
    
    RAISE NOTICE 'Created trigger set_default_resident_role_trigger';
END $$;

-- Step 12: Recreate RLS policies
SELECT '=== RECREATING RLS POLICIES ===' as info;

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "SUPER_ADMIN can view all users" ON public.users;
DROP POLICY IF EXISTS "SUPER_ADMIN can manage all users" ON public.users;
DROP POLICY IF EXISTS "ADMIN can view non-superadmin users" ON public.users;
DROP POLICY IF EXISTS "ADMIN can manage non-superadmin users" ON public.users;

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

-- Recreate policies on other tables if needed
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rewards' AND table_schema = 'public') THEN
        ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing rewards policy first
        DROP POLICY IF EXISTS "Allow office users to manage rewards" ON public.rewards;
        
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

-- Step 13: Final verification
SELECT '=== FINAL VERIFICATION ===' as info;

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
AND trigger_name IN ('before_users_ins_upd_role', 'set_default_resident_role_trigger');

-- Show functions recreated
SELECT 'Functions recreated:' as info;
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('before_users_ins_upd_role', 'set_default_resident_role');

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
