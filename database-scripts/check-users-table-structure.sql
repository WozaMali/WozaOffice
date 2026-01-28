-- Check the actual structure of the users table
-- This will help us understand what columns exist

-- Step 1: Check all columns in users table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Step 2: Check if department column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'department'
        ) THEN 'EXISTS'
        ELSE 'DOES NOT EXIST'
    END as department_status;

-- Step 3: Check if township_id column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'township_id'
        ) THEN 'EXISTS'
        ELSE 'DOES NOT EXIST'
    END as township_id_status;

-- Step 4: Check if employee_number column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'employee_number'
        ) THEN 'EXISTS'
        ELSE 'DOES NOT EXIST'
    END as employee_number_status;

-- Step 5: Check if role column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'role'
        ) THEN 'EXISTS'
        ELSE 'DOES NOT EXIST'
    END as role_status;

-- Step 6: Check if status column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'status'
        ) THEN 'EXISTS'
        ELSE 'DOES NOT EXIST'
    END as status_status;
