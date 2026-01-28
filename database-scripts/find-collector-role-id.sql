-- ============================================================================
-- FIND THE CORRECT COLLECTOR ROLE ID
-- ============================================================================

-- Find the collector role that already exists
SELECT 'Existing collector role:' as info;
SELECT id, name, description FROM roles WHERE name = 'collector';

-- Show all roles for reference
SELECT 'All available roles:' as info;
SELECT id, name, description FROM roles ORDER BY name;

-- Check what the current role_id constraint expects
SELECT 'Foreign key constraint details:' as info;
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name='users'
AND kcu.column_name LIKE '%role%';
