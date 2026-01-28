-- ============================================================================
-- CHECK ALL AVAILABLE ROLES
-- ============================================================================

-- Show all available roles
SELECT 'All available roles:' as info;
SELECT 
    id,
    name,
    description,
    created_at
FROM roles 
ORDER BY name;

-- Check if SUPERADMIN role exists
SELECT 'Checking for SUPERADMIN role:' as info;
SELECT 
    id,
    name,
    description
FROM roles 
WHERE name = 'SUPERADMIN' OR name = 'SUPER_ADMIN' OR name = 'SUPERADMIN_ROLE';

-- Check what roles exist that contain 'admin' or 'super'
SELECT 'Roles containing admin or super:' as info;
SELECT 
    id,
    name,
    description
FROM roles 
WHERE LOWER(name) LIKE '%admin%' OR LOWER(name) LIKE '%super%'
ORDER BY name;
