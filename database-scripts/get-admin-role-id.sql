-- ============================================================================
-- GET ADMIN ROLE ID
-- ============================================================================

-- Get the ADMIN role ID
SELECT 
    id,
    name,
    description
FROM roles 
WHERE name = 'ADMIN';

-- Also show all roles for reference
SELECT 'All available roles:' as info;
SELECT 
    id,
    name,
    description
FROM roles 
ORDER BY name;
