-- ============================================================================
-- SIMPLE USER ROLES FIX
-- ============================================================================
-- This script fixes user roles by dropping the constraint, updating roles, and recreating it

-- Step 1: Show current users and roles before fix
SELECT 'BEFORE FIX - Current users and roles:' as info;
SELECT u.email, u.full_name, r.name as role_name, u.id as user_id
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
ORDER BY u.email;

-- Step 2: Drop the problematic constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- Step 3: Update specific users based on their email addresses
-- Update collector@wozamali.com to collector role
UPDATE public.users 
SET role_id = (SELECT id FROM public.roles WHERE name = 'collector')
WHERE email = 'collector@wozamali.com';

-- Update admin@wozamali.com to admin role
UPDATE public.users 
SET role_id = (SELECT id FROM public.roles WHERE name = 'admin')
WHERE email = 'admin@wozamali.com';

-- Update superadmin@wozamali.co.za to superadmin role
UPDATE public.users 
SET role_id = (SELECT id FROM public.roles WHERE name = 'superadmin')
WHERE email = 'superadmin@wozamali.co.za';

-- Step 4: Update all users with 'member' role to 'resident' role
UPDATE public.users 
SET role_id = (SELECT id FROM public.roles WHERE name = 'resident')
WHERE role_id = (SELECT id FROM public.roles WHERE name = 'member');

-- Step 5: Update any users without a role to 'resident' role
UPDATE public.users 
SET role_id = (SELECT id FROM public.roles WHERE name = 'resident')
WHERE role_id IS NULL;

-- Step 6: Recreate the constraint with proper role values
ALTER TABLE public.users 
ADD CONSTRAINT users_role_check 
CHECK (role_id IN (SELECT id FROM public.roles));

-- Step 7: Show the updated users and roles
SELECT 'AFTER FIX - Updated users and roles:' as info;
SELECT u.email, u.full_name, r.name as role_name, u.id as user_id
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
ORDER BY u.email;

-- Step 8: Verify the role distribution
SELECT 'Role distribution:' as info;
SELECT r.name as role_name, COUNT(u.id) as user_count
FROM public.roles r
LEFT JOIN public.users u ON r.id = u.role_id
GROUP BY r.id, r.name
ORDER BY r.name;

SELECT 'User roles fix completed successfully' as status;
