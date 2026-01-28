-- ============================================================================
-- SET SUPERADMIN PASSWORD TO 123456
-- ============================================================================

-- First, check if superadmin user exists
SELECT 'Checking superadmin user exists:' as info;
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at,
    last_sign_in_at,
    encrypted_password IS NOT NULL as has_password
FROM auth.users 
WHERE email = 'superadmin@wozamali.co.za';

-- Update the password for superadmin@wozamali.co.za
-- Note: This uses Supabase's built-in password hashing
UPDATE auth.users 
SET 
    encrypted_password = crypt('123456', gen_salt('bf')),
    updated_at = now()
WHERE email = 'superadmin@wozamali.co.za';

-- Verify the password was updated
SELECT 'Password updated successfully:' as info;
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

-- Also ensure the user exists in the users table with proper role
SELECT 'Checking users table entry:' as info;
SELECT 
    id,
    email,
    first_name,
    last_name,
    role_id,
    status
FROM users 
WHERE email = 'superadmin@wozamali.co.za';

-- If user doesn't exist in users table, create the entry
INSERT INTO users (id, email, first_name, last_name, role_id, status, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    'Super',
    'Admin',
    r.id::uuid as role_id,
    'active',
    now(),
    now()
FROM auth.users au
CROSS JOIN roles r
WHERE au.email = 'superadmin@wozamali.co.za'
  AND r.name = 'ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM users u WHERE u.email = 'superadmin@wozamali.co.za'
  );

-- Final verification
SELECT 'Final verification - superadmin should be able to login:' as info;
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    r.name as role_name,
    u.status,
    au.encrypted_password IS NOT NULL as has_password
FROM users u
JOIN roles r ON u.role_id::text = r.id::text
JOIN auth.users au ON u.id = au.id
WHERE u.email = 'superadmin@wozamali.co.za';
