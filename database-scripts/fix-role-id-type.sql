-- ============================================================================
-- FIX ROLE_ID COLUMN TYPE TO MATCH ROLES TABLE
-- ============================================================================
-- This script fixes the role_id column type to be compatible with the roles table

-- Step 1: Check current column types
SELECT 'Current column types:' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('role_id', 'id')
AND table_schema = 'public'
ORDER BY column_name;

SELECT 'Roles table column types:' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'roles' 
AND column_name = 'id'
AND table_schema = 'public';

-- Step 2: Check if there are any existing foreign key constraints
SELECT 'Existing foreign key constraints:' as info;
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.users'::regclass 
AND contype = 'f';

-- Step 3: Drop existing foreign key constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.users'::regclass 
        AND conname = 'users_role_id_fkey'
    ) THEN
        ALTER TABLE public.users DROP CONSTRAINT users_role_id_fkey;
        RAISE NOTICE 'Dropped existing foreign key constraint';
    ELSE
        RAISE NOTICE 'No existing foreign key constraint found';
    END IF;
END $$;

-- Step 4: Update role_id column type to UUID
ALTER TABLE public.users 
ALTER COLUMN role_id TYPE UUID USING role_id::uuid;

-- Step 5: Add the foreign key constraint with correct types
ALTER TABLE public.users 
ADD CONSTRAINT users_role_id_fkey 
FOREIGN KEY (role_id) REFERENCES public.roles(id);

-- Step 6: Verify the constraint was added
SELECT 'Updated foreign key constraint:' as info;
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.users'::regclass 
AND conname = 'users_role_id_fkey';

-- Step 7: Verify column types are now compatible
SELECT 'Updated column types:' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('role_id', 'id')
AND table_schema = 'public'
ORDER BY column_name;

SELECT 'Role ID type fix complete!' as info;
