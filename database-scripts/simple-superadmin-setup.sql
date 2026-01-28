-- ============================================================================
-- SIMPLE SUPERADMIN SETUP (AVOIDS TYPE CASTING ISSUES)
-- ============================================================================

-- Step 1: Create SUPER_ADMIN role if it doesn't exist
INSERT INTO roles (id, name, description, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    'SUPER_ADMIN',
    'Super Administrator with full system access',
    now(),
    now()
WHERE NOT EXISTS (
    SELECT 1 FROM roles WHERE name = 'SUPER_ADMIN'
);

-- Step 2: Show the SUPER_ADMIN role ID
SELECT 'SUPER_ADMIN role created/found:' as info;
SELECT id, name FROM roles WHERE name = 'SUPER_ADMIN';

-- Step 3: Create superadmin user entry (using subquery to avoid type issues)
INSERT INTO users (id, email, first_name, last_name, role_id, status, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    'Super',
    'Admin',
    (SELECT id FROM roles WHERE name = 'SUPER_ADMIN' LIMIT 1),
    'active',
    now(),
    now()
FROM auth.users au
WHERE au.email = 'superadmin@wozamali.co.za'
  AND NOT EXISTS (
    SELECT 1 FROM users u WHERE u.email = 'superadmin@wozamali.co.za'
  );

-- Step 4: Simple verification (avoiding JOINs that cause type issues)
SELECT 'User created successfully:' as info;
SELECT 
    id,
    email,
    first_name,
    last_name,
    role_id,
    status
FROM users 
WHERE email = 'superadmin@wozamali.co.za';

-- Step 5: Check password is set
SELECT 'Password verification:' as info;
SELECT 
    id,
    email,
    encrypted_password IS NOT NULL as has_password
FROM auth.users 
WHERE email = 'superadmin@wozamali.co.za';
