-- ============================================================================
-- FINAL SUPERADMIN SETUP (WITH SUPER_ADMIN ROLE)
-- ============================================================================

-- Step 1: Check current roles
SELECT 'Step 1: Current roles:' as info;
SELECT id, name, description FROM roles ORDER BY name;

-- Step 2: Create SUPER_ADMIN role if it doesn't exist
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

-- Step 3: Get the SUPER_ADMIN role ID
SELECT 'Step 2: SUPER_ADMIN role ID:' as info;
SELECT id, name FROM roles WHERE name = 'SUPER_ADMIN';

-- Step 4: Create superadmin user entry with SUPER_ADMIN role
INSERT INTO users (id, email, first_name, last_name, role_id, status, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    'Super',
    'Admin',
    (SELECT id FROM roles WHERE name = 'SUPER_ADMIN' LIMIT 1)::uuid,
    'active',
    now(),
    now()
FROM auth.users au
WHERE au.email = 'superadmin@wozamali.co.za'
  AND NOT EXISTS (
    SELECT 1 FROM users u WHERE u.email = 'superadmin@wozamali.co.za'
  );

-- Step 5: Final verification
SELECT 'Step 3: Final verification - superadmin with SUPER_ADMIN role:' as info;
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    r.name as role_name,
    u.status,
    au.encrypted_password IS NOT NULL as has_password
FROM users u
LEFT JOIN roles r ON u.role_id::text = r.id::text
JOIN auth.users au ON u.id = au.id
WHERE u.email = 'superadmin@wozamali.co.za';
