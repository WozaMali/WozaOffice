-- ============================================================================
-- CHECK ROLES TABLE STRUCTURE
-- ============================================================================

-- Check roles table structure
SELECT 'Roles table structure:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'roles' 
ORDER BY ordinal_position;

-- Check users table structure for role_id
SELECT 'Users table role_id column:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'role_id';

-- Check actual data in roles table
SELECT 'Roles table data:' as info;
SELECT 
    id,
    name,
    description,
    created_at
FROM roles 
ORDER BY name;

-- Check users table role_id values
SELECT 'Users table role_id values:' as info;
SELECT 
    id,
    email,
    role_id,
    status
FROM users 
WHERE email = 'superadmin@wozamali.co.za';
