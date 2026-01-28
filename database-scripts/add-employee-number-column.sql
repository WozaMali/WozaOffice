-- ============================================================================
-- ADD EMPLOYEE_NUMBER COLUMN TO USERS TABLE
-- ============================================================================
-- This script adds the employee_number column to the users table
-- to support the Collector app employee number functionality

-- Step 1: Check if the column already exists
SELECT '=== CHECKING IF EMPLOYEE_NUMBER COLUMN EXISTS ===' as step;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'employee_number'
AND table_schema = 'public';

-- Step 2: Add the employee_number column if it doesn't exist
SELECT '=== ADDING EMPLOYEE_NUMBER COLUMN ===' as step;

DO $$
BEGIN
    -- Check if the column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'employee_number'
        AND table_schema = 'public'
    ) THEN
        -- Add the column
        ALTER TABLE public.users 
        ADD COLUMN employee_number VARCHAR(20);
        
        -- Add a comment
        COMMENT ON COLUMN public.users.employee_number IS 'Employee number for collectors (e.g., SNW-C0001)';
        
        RAISE NOTICE 'employee_number column added successfully';
    ELSE
        RAISE NOTICE 'employee_number column already exists';
    END IF;
END $$;

-- Step 3: Verify the column was added
SELECT '=== VERIFICATION ===' as step;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'employee_number'
AND table_schema = 'public';

-- Step 4: Test insert with employee_number
SELECT '=== TESTING COLUMN STRUCTURE ===' as step;

-- Show the current users table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'EMPLOYEE_NUMBER COLUMN ADDED SUCCESSFULLY' as result;
