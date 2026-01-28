-- ============================================================================
-- MAKE IDENTITY_NUMBER OPTIONAL IN DATABASE
-- ============================================================================
-- This script makes the identity_number field optional in the users table
-- to prevent form errors when the field is not provided

-- Step 1: Check current constraints on identity_number
SELECT '=== CHECKING CURRENT CONSTRAINTS ===' as step;

SELECT 
    column_name,
    is_nullable,
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'identity_number'
AND table_schema = 'public';

-- Step 2: Make identity_number nullable (if it exists)
SELECT '=== MAKING IDENTITY_NUMBER NULLABLE ===' as step;

-- Check if the column exists first
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'identity_number'
        AND table_schema = 'public'
    ) THEN
        -- Make the column nullable
        ALTER TABLE public.users ALTER COLUMN identity_number DROP NOT NULL;
        RAISE NOTICE 'identity_number column made nullable';
    ELSE
        RAISE NOTICE 'identity_number column does not exist in users table';
    END IF;
END $$;

-- Step 3: Verify the change
SELECT '=== VERIFICATION ===' as step;

SELECT 
    column_name,
    is_nullable,
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'identity_number'
AND table_schema = 'public';

-- Step 4: Test insert without identity_number
SELECT '=== TESTING INSERT WITHOUT IDENTITY_NUMBER ===' as step;

-- This is just a test query to show the structure, not an actual insert
SELECT 
    'Test query to verify structure' as test,
    column_name,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'IDENTITY_NUMBER MADE OPTIONAL SUCCESSFULLY' as result;
