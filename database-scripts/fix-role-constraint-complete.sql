-- ============================================================================
-- COMPLETE ROLE CONSTRAINT FIX - HANDLES EXISTING DATA
-- ============================================================================
-- This script fixes the role constraint by first checking existing data
-- and then updating the constraint to allow all valid roles

-- Step 1: Check what roles currently exist in the users table
SELECT 'Current roles in users table:' as info;
SELECT DISTINCT role, COUNT(*) as count
FROM public.users 
WHERE role IS NOT NULL
GROUP BY role
ORDER BY role;

-- Step 2: Check what roles exist in the roles table
SELECT 'Current roles in roles table:' as info;
SELECT name, description
FROM public.roles
ORDER BY name;

-- Step 3: Drop the existing role constraint
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
    ELSE
        RAISE NOTICE 'No existing role constraint found';
    END IF;
END $$;

-- Step 4: Update any existing users with invalid roles to have valid roles
UPDATE public.users 
SET role = 'MEMBER'
WHERE role IS NULL OR role NOT IN ('SUPER_ADMIN', 'ADMIN', 'STAFF', 'COLLECTOR', 'MEMBER', 'CUSTOMER');

-- Step 5: Add the updated role constraint that allows all valid roles
ALTER TABLE public.users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'STAFF', 'COLLECTOR', 'MEMBER', 'CUSTOMER'));

-- Step 6: Verify the constraint was added
SELECT 'Updated role constraint:' as info;
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.users'::regclass 
AND conname LIKE '%role%';

-- Step 7: Now create/update the superadmin user
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

-- Step 8: Verify the superadmin user was created successfully
SELECT 'Superadmin user created successfully:' as info;
SELECT 
    id,
    email,
    full_name,
    role,
    status,
    is_approved,
    created_at
FROM public.users 
WHERE id = 'b1b84587-6a12-43e9-85ef-d465cbf8ece3';

-- Step 9: Show all users and their roles
SELECT 'All users and their roles:' as info;
SELECT 
    id,
    email,
    full_name,
    role,
    status,
    is_approved
FROM public.users 
ORDER BY role, email;

-- Step 10: Final verification
SELECT 'Role constraint fix complete!' as info;
SELECT 'You can now proceed with the superadmin setup!' as info;
