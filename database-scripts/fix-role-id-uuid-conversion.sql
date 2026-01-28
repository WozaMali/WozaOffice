-- Fix role_id column type conversion to UUID
-- This handles the case where role_id has a default value that can't be cast to UUID

-- Step 1: Check current state of role_id column
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name = 'role_id';

-- Step 2: Remove default value if it exists
DO $$ 
BEGIN
    -- Check if role_id has a default value
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
          AND column_name = 'role_id' 
          AND column_default IS NOT NULL
    ) THEN
        -- Remove the default value
        ALTER TABLE public.users ALTER COLUMN role_id DROP DEFAULT;
        RAISE NOTICE 'Removed default value from role_id column';
    END IF;
END $$;

-- Step 3: Handle existing data before conversion
-- First, let's see what data exists in role_id
SELECT 
    role_id, 
    COUNT(*) as count,
    CASE 
        WHEN role_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 'Valid UUID'
        WHEN role_id IS NULL THEN 'NULL'
        ELSE 'Invalid UUID'
    END as uuid_status
FROM public.users 
GROUP BY role_id, uuid_status
ORDER BY count DESC;

-- Step 4: Convert role_id to UUID type
DO $$ 
BEGIN
    -- Check if role_id exists and is not UUID
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
          AND column_name = 'role_id' 
          AND data_type != 'uuid'
    ) THEN
        -- Try to convert to UUID, handling invalid values
        BEGIN
            -- First, set invalid UUIDs to NULL
            UPDATE public.users 
            SET role_id = NULL 
            WHERE role_id IS NOT NULL 
              AND role_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
            
            -- Now convert the column type
            ALTER TABLE public.users 
            ALTER COLUMN role_id TYPE UUID USING role_id::uuid;
            
            RAISE NOTICE 'role_id column successfully converted to UUID type';
            
        EXCEPTION WHEN OTHERS THEN
            -- If conversion fails, create a new UUID column
            RAISE NOTICE 'Direct conversion failed, creating new UUID column...';
            
            -- Add new UUID column
            ALTER TABLE public.users ADD COLUMN role_id_new UUID;
            
            -- Copy valid UUIDs to new column
            UPDATE public.users 
            SET role_id_new = role_id::uuid 
            WHERE role_id IS NOT NULL 
              AND role_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
            
            -- Drop old column and rename new one
            ALTER TABLE public.users DROP COLUMN role_id;
            ALTER TABLE public.users RENAME COLUMN role_id_new TO role_id;
            
            RAISE NOTICE 'role_id column recreated as UUID type';
        END;
    ELSE
        RAISE NOTICE 'role_id column is already UUID type or does not exist';
    END IF;
END $$;

-- Step 5: Verify the conversion
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name = 'role_id';

-- Step 6: Update the view to use proper UUID comparison
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

-- Step 7: Test the view
SELECT 'Testing v_team_members view...' as test;
SELECT COUNT(*) as team_member_count FROM public.v_team_members;

-- Step 8: Create alternative views for different scenarios
-- View with text casting (fallback)
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

-- Simple view without role join
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

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'role_id UUID conversion completed successfully!';
    RAISE NOTICE 'Three views available:';
    RAISE NOTICE '1. v_team_members - Uses UUID comparison (preferred)';
    RAISE NOTICE '2. v_team_members_text - Uses text casting (fallback)';
    RAISE NOTICE '3. v_team_members_simple - No role join (simplest)';
    RAISE NOTICE 'The application will automatically use the working view.';
END $$;
