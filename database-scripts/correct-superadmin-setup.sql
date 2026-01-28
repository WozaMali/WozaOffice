-- ============================================================================
-- CORRECT SUPERADMIN SETUP (WITH SUPERADMIN ROLE)
-- ============================================================================

-- Step 1: Check what roles are available
SELECT 'Step 1: Available roles:' as info;
SELECT id, name, description FROM roles ORDER BY name;

-- Step 2: Look for SUPERADMIN role specifically
SELECT 'Step 2: Looking for SUPERADMIN role:' as info;
SELECT 
    id,
    name,
    description
FROM roles 
WHERE name IN ('SUPERADMIN', 'SUPER_ADMIN', 'SUPERADMIN_ROLE', 'ADMIN')
ORDER BY name;

-- Step 3: Create SUPERADMIN role if it doesn't exist
INSERT INTO roles (id, name, description, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    'SUPERADMIN',
    'Super Administrator with full system access',
    now(),
    now()
WHERE NOT EXISTS (
    SELECT 1 FROM roles WHERE name = 'SUPERADMIN'
);

-- Step 4: Get the SUPERADMIN role ID
SELECT 'Step 3: SUPERADMIN role ID:' as info;
SELECT id, name FROM roles WHERE name = 'SUPERADMIN';

-- Step 5: Create superadmin user entry with SUPERADMIN role
INSERT INTO users (id, email, first_name, last_name, role_id, status, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    'Super',
    'Admin',
    (SELECT id FROM roles WHERE name = 'SUPERADMIN' LIMIT 1)::uuid,
    'active',
    now(),
    now()
FROM auth.users au
WHERE au.email = 'superadmin@wozamali.co.za'
  AND NOT EXISTS (
    SELECT 1 FROM users u WHERE u.email = 'superadmin@wozamali.co.za'
  );

-- Step 6: Final verification
SELECT 'Step 4: Final verification - superadmin with SUPERADMIN role:' as info;
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    r.name as role_name,
    u.status,
    au.encrypted_password IS NOT NULL as has_password
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
JOIN auth.users au ON u.id = au.id
WHERE u.email = 'superadmin@wozamali.co.za';
