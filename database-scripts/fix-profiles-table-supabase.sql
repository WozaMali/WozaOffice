-- ============================================================================
-- FIX PROFILES TABLE FOR SUPABASE AUTH
-- ============================================================================
-- This script handles the foreign key constraint to auth.users

-- First, let's check the current table structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- Check foreign key constraints
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'profiles';

-- ============================================================================
-- OPTION 1: CREATE AUTH USER FIRST (RECOMMENDED)
-- ============================================================================
-- This creates a user in Supabase Auth, then links to profiles

-- First, create the user in auth.users (this requires admin privileges)
-- You'll need to do this through Supabase Dashboard or use the admin API
-- For now, let's check if the user already exists

SELECT 
    id,
    email,
    created_at,
    email_confirmed_at
FROM auth.users 
WHERE email = 'dumisani@wozamali.co.za';

-- ============================================================================
-- OPTION 2: MODIFY THE PROFILES TABLE STRUCTURE
-- ============================================================================
-- If you want to remove the foreign key constraint temporarily

-- Check if we can modify the constraint
DO $$
BEGIN
    -- Try to drop the foreign key constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_id_fkey' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;
        RAISE NOTICE 'Dropped foreign key constraint profiles_id_fkey';
    ELSE
        RAISE NOTICE 'Foreign key constraint profiles_id_fkey does not exist';
    END IF;
    
    -- Now we can insert without the constraint
    INSERT INTO profiles (id, email, full_name, phone, role, is_active) VALUES
        (uuid_generate_v4(), 'dumisani@wozamali.co.za', 'Dumisani Dlamini', '+27722126004', 'collector', true);
    
    RAISE NOTICE 'Successfully inserted collector profile';
END $$;

-- ============================================================================
-- OPTION 3: USE EXISTING USER ID (IF AVAILABLE)
-- ============================================================================
-- If you already have a user in auth.users, use that ID

-- Check for any existing users that might be suitable
SELECT 
    id,
    email,
    created_at
FROM auth.users 
WHERE email LIKE '%wozamali%' 
   OR email LIKE '%dumisani%'
   OR email LIKE '%collector%'
LIMIT 5;

-- ============================================================================
-- VERIFY THE RESULT
-- ============================================================================

-- Check if the profile was created
SELECT 
    id,
    email,
    full_name,
    phone,
    role,
    is_active,
    created_at
FROM profiles 
WHERE email = 'dumisani@wozamali.co.za';

-- ============================================================================
-- RECOMMENDED APPROACH FOR PRODUCTION
-- ============================================================================
/*
For production use, you should:

1. Create users through Supabase Auth (signup/signin)
2. Let Supabase handle the auth.users table
3. Use the auth.uid() function in RLS policies
4. Link profiles to auth.users through the id field

Example of proper user creation flow:
1. User signs up with email/password
2. Supabase creates entry in auth.users
3. Your app creates corresponding entry in profiles
4. Use auth.uid() for RLS policies
*/
