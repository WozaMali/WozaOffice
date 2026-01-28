-- ============================================================================
-- CHECK ROLE CONSTRAINTS
-- ============================================================================
-- This script checks what role values are allowed in the users table

-- Check the constraint on the users table
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.users'::regclass 
  AND conname LIKE '%role%';

-- Check what roles currently exist in the users table
SELECT 'Current roles in users table:' as info;
SELECT DISTINCT role, COUNT(*) as count
FROM public.users 
WHERE role IS NOT NULL
GROUP BY role
ORDER BY role;

-- Check if there are any role constraints
SELECT 'Table constraints:' as info;
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'users' 
  AND tc.table_schema = 'public';
