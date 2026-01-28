-- ============================================================================
-- FIX ROLE_ID COLUMN WITH VIEW DEPENDENCIES
-- ============================================================================
-- This script handles views that depend on the role_id column

-- Step 1: Check what views depend on the role_id column
SELECT 'Views that depend on role_id column:' as info;
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE schemaname = 'public' 
AND definition LIKE '%role_id%';

-- Step 2: Check for rules that depend on role_id
SELECT 'Rules that depend on role_id column:' as info;
SELECT 
    schemaname,
    tablename,
    rulename,
    definition
FROM pg_rules 
WHERE schemaname = 'public' 
AND (tablename = 'users' OR definition LIKE '%role_id%');

-- Step 3: Drop the v_team_members view if it exists
DROP VIEW IF EXISTS public.v_team_members CASCADE;

-- Step 4: Drop any other views that might depend on role_id
DROP VIEW IF EXISTS public.v_users CASCADE;
DROP VIEW IF EXISTS public.v_user_profiles CASCADE;
DROP VIEW IF EXISTS public.v_team_members_with_roles CASCADE;

-- Step 5: Check if there are any remaining dependencies
SELECT 'Remaining dependencies:' as info;
SELECT 
    schemaname,
    viewname
FROM pg_views 
WHERE schemaname = 'public' 
AND definition LIKE '%role_id%';

-- Step 6: Now fix the role_id column
-- First, drop the default value
ALTER TABLE public.users ALTER COLUMN role_id DROP DEFAULT;

-- Then update the column type to UUID
ALTER TABLE public.users ALTER COLUMN role_id TYPE UUID USING role_id::uuid;

-- Set a new default value (NULL is fine for UUID)
ALTER TABLE public.users ALTER COLUMN role_id SET DEFAULT NULL;

-- Step 7: Recreate the v_team_members view
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

-- Step 8: Create other useful views
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

-- Step 9: Verify the column is now properly configured
SELECT 'Updated role_id column definition:' as info;
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'role_id'
AND table_schema = 'public';

-- Step 10: Check if there are any existing foreign key constraints
SELECT 'Existing foreign key constraints:' as info;
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.users'::regclass 
AND contype = 'f';

-- Step 11: Add the foreign key constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.users'::regclass 
        AND conname = 'users_role_id_fkey'
    ) THEN
        ALTER TABLE public.users 
        ADD CONSTRAINT users_role_id_fkey 
        FOREIGN KEY (role_id) REFERENCES public.roles(id);
        RAISE NOTICE 'Added foreign key constraint';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists';
    END IF;
END $$;

-- Step 12: Final verification
SELECT 'Role ID type fix with views complete!' as info;
SELECT 'Views recreated successfully!' as info;
