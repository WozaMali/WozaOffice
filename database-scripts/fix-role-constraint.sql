-- ============================================================================
-- FIX ROLE CONSTRAINT ISSUE
-- ============================================================================

-- First, let's see what's in the roles table
SELECT 'Roles table contents:' as info;
SELECT * FROM roles;

-- Check if the collector role ID exists
SELECT 'Checking if collector role exists:' as info;
SELECT * FROM roles WHERE id = '8d5db8bb-52a3-4865-bb18-e1805249c4a2';

-- If the role doesn't exist, let's see what roles are available
SELECT 'Available roles:' as info;
SELECT id, name, description FROM roles;

-- Check the foreign key constraint details
SELECT 'Foreign key constraints on users table:' as info;
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

-- If the collector role doesn't exist, create it
INSERT INTO roles (id, name, description, created_at, updated_at)
VALUES (
    '8d5db8bb-52a3-4865-bb18-e1805249c4a2',
    'collector',
    'Waste collector role',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Verify the role was created
SELECT 'After creating collector role:' as info;
SELECT * FROM roles WHERE id = '8d5db8bb-52a3-4865-bb18-e1805249c4a2';