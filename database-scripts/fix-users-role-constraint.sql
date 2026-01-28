-- ============================================================================
-- FIX USERS ROLE CONSTRAINT TO ALLOW SUPER_ADMIN
-- ============================================================================
-- This script fixes the role check constraint to allow SUPER_ADMIN role

-- Step 1: Check current constraint
SELECT 'Current role constraint:' as info;
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.users'::regclass 
AND conname LIKE '%role%';

-- Step 2: Drop the existing role constraint if it exists
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

-- Step 3: Add the updated role constraint that allows SUPER_ADMIN
ALTER TABLE public.users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'STAFF', 'COLLECTOR', 'MEMBER', 'CUSTOMER'));

-- Step 4: Verify the constraint was added
SELECT 'Updated role constraint:' as info;
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.users'::regclass 
AND conname LIKE '%role%';

-- Step 5: Now try to insert the superadmin user again
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

-- Step 6: Verify the user was created successfully
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

SELECT 'Role constraint fix complete!' as info;
