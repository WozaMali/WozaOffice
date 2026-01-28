-- ============================================================================
-- FIXED SUPERADMIN PASSWORD RESET (HANDLES TYPE CASTING)
-- ============================================================================

-- Step 1: Check if superadmin user exists in auth.users
SELECT 'Step 1: Checking superadmin in auth.users:' as info;
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at,
    last_sign_in_at,
    encrypted_password IS NOT NULL as has_password
FROM auth.users 
WHERE email = 'superadmin@wozamali.co.za';

-- Step 2: Update password to 123456
UPDATE auth.users 
SET 
    encrypted_password = crypt('123456', gen_salt('bf')),
    updated_at = now()
WHERE email = 'superadmin@wozamali.co.za';

-- Step 3: Verify password was updated
SELECT 'Step 2: Password updated - verification:' as info;
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at,
    last_sign_in_at,
    encrypted_password IS NOT NULL as has_password,
    updated_at
FROM auth.users 
WHERE email = 'superadmin@wozamali.co.za';

-- Step 4: Check if user exists in users table
SELECT 'Step 3: Checking users table:' as info;
SELECT 
    id,
    email,
    first_name,
    last_name,
    role_id,
    status
FROM users 
WHERE email = 'superadmin@wozamali.co.za';

-- Step 5: Get ADMIN role ID
SELECT 'Step 4: Getting ADMIN role ID:' as info;
SELECT id, name FROM roles WHERE name = 'ADMIN';

-- Step 6: Create user entry if it doesn't exist (using the role ID from step 5)
-- Note: Replace 'ROLE_ID_HERE' with the actual UUID from step 5
-- INSERT INTO users (id, email, first_name, last_name, role_id, status, created_at, updated_at)
-- SELECT 
--     au.id,
--     au.email,
--     'Super',
--     'Admin',
--     'ROLE_ID_HERE'::uuid,
--     'active',
--     now(),
--     now()
-- FROM auth.users au
-- WHERE au.email = 'superadmin@wozamali.co.za'
--   AND NOT EXISTS (
--     SELECT 1 FROM users u WHERE u.email = 'superadmin@wozamali.co.za'
--   );

-- Step 7: Final verification (run after creating user entry)
-- SELECT 'Step 5: Final verification:' as info;
-- SELECT 
--     u.id,
--     u.email,
--     u.first_name,
--     u.last_name,
--     r.name as role_name,
--     u.status,
--     au.encrypted_password IS NOT NULL as has_password
-- FROM users u
-- LEFT JOIN roles r ON u.role_id = r.id
-- JOIN auth.users au ON u.id = au.id
-- WHERE u.email = 'superadmin@wozamali.co.za';
