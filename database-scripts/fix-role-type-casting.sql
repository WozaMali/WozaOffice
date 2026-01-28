-- Quick fix for role_id type casting issues
-- Run this if you encounter the "operator does not exist: text = uuid" error

-- First, let's check the current data types
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('role_id', 'id')
ORDER BY column_name;

-- Fix 1: Ensure role_id is UUID type
DO $$ 
BEGIN
    -- Check if role_id exists and is not UUID
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
          AND column_name = 'role_id' 
          AND data_type != 'uuid'
    ) THEN
        -- Convert role_id to UUID
        ALTER TABLE public.users 
        ALTER COLUMN role_id TYPE UUID USING role_id::uuid;
        
        RAISE NOTICE 'role_id column converted to UUID type';
    ELSE
        RAISE NOTICE 'role_id column is already UUID type or does not exist';
    END IF;
END $$;

-- Fix 2: Update the view with proper type casting
CREATE OR REPLACE VIEW public.v_team_members AS
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.full_name,
    u.phone,
    u.employee_number,
    u.role,
    u.status,
    u.township,
    u.department,
    u.created_at,
    u.updated_at,
    r.name as role_name,
    r.permissions
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
WHERE u.status = 'active' 
  AND u.role IN ('admin', 'collector', 'super_admin')
ORDER BY u.created_at DESC;

-- Fix 3: Alternative view with text casting if UUID conversion fails
CREATE OR REPLACE VIEW public.v_team_members_text AS
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.full_name,
    u.phone,
    u.employee_number,
    u.role,
    u.status,
    u.township,
    u.department,
    u.created_at,
    u.updated_at,
    r.name as role_name,
    r.permissions
FROM public.users u
LEFT JOIN public.roles r ON u.role_id::text = r.id::text
WHERE u.status = 'active' 
  AND u.role IN ('admin', 'collector', 'super_admin')
ORDER BY u.created_at DESC;

-- Fix 4: Simple view without role join if both fail
CREATE OR REPLACE VIEW public.v_team_members_simple AS
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.full_name,
    u.phone,
    u.employee_number,
    u.role,
    u.status,
    u.township,
    u.department,
    u.created_at,
    u.updated_at,
    u.role as role_name,
    '{}'::jsonb as permissions
FROM public.users u
WHERE u.status = 'active' 
  AND u.role IN ('admin', 'collector', 'super_admin')
ORDER BY u.created_at DESC;

-- Test the views
SELECT 'Testing v_team_members...' as test;
SELECT COUNT(*) as team_member_count FROM public.v_team_members;

SELECT 'Testing v_team_members_text...' as test;
SELECT COUNT(*) as team_member_count FROM public.v_team_members_text;

SELECT 'Testing v_team_members_simple...' as test;
SELECT COUNT(*) as team_member_count FROM public.v_team_members_simple;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Type casting fixes applied successfully!';
    RAISE NOTICE 'Three views created:';
    RAISE NOTICE '1. v_team_members - Uses UUID comparison (preferred)';
    RAISE NOTICE '2. v_team_members_text - Uses text casting (fallback)';
    RAISE NOTICE '3. v_team_members_simple - No role join (simplest)';
    RAISE NOTICE 'Use whichever view works best for your setup.';
END $$;
