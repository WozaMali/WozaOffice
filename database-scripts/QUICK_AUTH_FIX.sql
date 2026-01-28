-- ============================================================================
-- QUICK AUTHENTICATION FIX
-- ============================================================================
-- This script provides a quick fix for authentication issues by
-- temporarily disabling RLS and ensuring basic functionality works.

-- Step 1: Disable RLS temporarily for development
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.unified_collections DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.deleted_transactions DISABLE ROW LEVEL SECURITY;

-- Step 2: Grant all permissions to all roles
GRANT ALL ON public.users TO authenticated, service_role, anon;
GRANT ALL ON public.profiles TO authenticated, service_role, anon;
GRANT ALL ON public.unified_collections TO authenticated, service_role, anon;
GRANT ALL ON public.deleted_transactions TO authenticated, service_role, anon;

-- Step 3: Ensure roles table exists and has proper data
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE
);

INSERT INTO public.roles (name) VALUES 
    ('superadmin'), 
    ('admin'), 
    ('collector'), 
    ('resident'),
    ('member')
ON CONFLICT (name) DO NOTHING;

-- Step 4: Ensure users table has proper structure
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL;

-- Step 5: Update user roles to fix authentication
UPDATE public.users
SET role_id = (SELECT id FROM public.roles WHERE name = 'admin')
WHERE email = 'admin@wozamali.com';

UPDATE public.users
SET role_id = (SELECT id FROM public.roles WHERE name = 'collector')
WHERE email = 'collector@wozamali.com';

UPDATE public.users
SET role_id = (SELECT id FROM public.roles WHERE name = 'superadmin')
WHERE email = 'superadmin@wozamali.co.za';

-- Set default role for other users
UPDATE public.users
SET role_id = (SELECT id FROM public.roles WHERE name = 'resident')
WHERE role_id IS NULL;

-- Step 6: Verify the fix
SELECT 'Quick auth fix completed successfully' as status;
SELECT 'Users with roles:' as info;
SELECT u.email, r.name as role_name
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
ORDER BY u.email;
