-- ============================================================================
-- FIX SUPERADMIN LOGIN - CHECK AND CREATE USER
-- ============================================================================

-- Step 1: Check if superadmin user exists in auth.users
SELECT 'Step 1: Checking auth.users table' as info;
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at,
    last_sign_in_at,
    encrypted_password IS NOT NULL as has_password
FROM auth.users 
WHERE email = 'superadmin@wozamali.co.za';

-- Step 2: Check if superadmin exists in users table
SELECT 'Step 2: Checking users table' as info;
SELECT 
    id,
    email,
    first_name,
    last_name,
    role_id,
    status,
    created_at
FROM users 
WHERE email = 'superadmin@wozamali.co.za';

-- Step 3: Check what roles exist
SELECT 'Step 3: Available roles' as info;
SELECT id, name, description FROM roles ORDER BY name;

-- Step 4: If superadmin doesn't exist in users table, create the profile
-- (The auth user needs to be created via Supabase Auth UI first)
INSERT INTO users (
    id,
    email,
    first_name,
    last_name,
    role_id,
    status,
    created_at,
    updated_at
)
SELECT 
    '00000000-0000-0000-0000-000000000001'::uuid, -- Temporary ID, will be updated when auth user is created
    'superadmin@wozamali.co.za',
    'Super',
    'Admin',
    'super_admin', -- Use the role name
    'active',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'superadmin@wozamali.co.za'
);

-- Step 5: Update the user ID to match the auth user if it exists
-- This will be done after the auth user is created
UPDATE users 
SET id = (
    SELECT id FROM auth.users 
    WHERE email = 'superadmin@wozamali.co.za' 
    LIMIT 1
)
WHERE email = 'superadmin@wozamali.co.za' 
AND id = '00000000-0000-0000-0000-000000000001'::uuid;

-- Step 6: Final check
SELECT 'Step 6: Final verification' as info;
SELECT 
    'Auth user exists:' as check_type,
    CASE WHEN EXISTS(SELECT 1 FROM auth.users WHERE email = 'superadmin@wozamali.co.za') 
         THEN 'YES' ELSE 'NO' END as result
UNION ALL
SELECT 
    'Users table entry exists:' as check_type,
    CASE WHEN EXISTS(SELECT 1 FROM users WHERE email = 'superadmin@wozamali.co.za') 
         THEN 'YES' ELSE 'NO' END as result;

-- Instructions for creating the auth user:
SELECT 'INSTRUCTIONS TO CREATE AUTH USER:' as info;
SELECT '1. Go to Supabase Dashboard > Authentication > Users' as instruction;
SELECT '2. Click "Add User" button' as instruction;
SELECT '3. Email: superadmin@wozamali.co.za' as instruction;
SELECT '4. Password: [choose a strong password]' as instruction;
SELECT '5. Check "Confirm email" checkbox' as instruction;
SELECT '6. Click "Create User"' as instruction;
SELECT '7. Run this script again to update the user ID' as instruction;
