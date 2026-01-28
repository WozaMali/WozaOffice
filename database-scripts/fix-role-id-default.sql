-- ============================================================================
-- FIX ROLE_ID COLUMN DEFAULT VALUE AND TYPE
-- ============================================================================
-- This script fixes the role_id column default value and type issues

-- Step 1: Check current column definition
SELECT 'Current role_id column definition:' as info;
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'role_id'
AND table_schema = 'public';

-- Step 2: Drop the default value first
ALTER TABLE public.users ALTER COLUMN role_id DROP DEFAULT;

-- Step 3: Update the column type to UUID
ALTER TABLE public.users ALTER COLUMN role_id TYPE UUID USING role_id::uuid;

-- Step 4: Set a new default value (NULL is fine for UUID)
ALTER TABLE public.users ALTER COLUMN role_id SET DEFAULT NULL;

-- Step 5: Verify the column is now properly configured
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

-- Step 6: Check if there are any existing foreign key constraints
SELECT 'Existing foreign key constraints:' as info;
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.users'::regclass 
AND contype = 'f';

-- Step 7: Add the foreign key constraint if it doesn't exist
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

-- Step 8: Final verification
SELECT 'Role ID type and default fix complete!' as info;
