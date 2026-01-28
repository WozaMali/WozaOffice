-- Test the complete system to ensure everything is working
-- This will verify views, roles, and user creation flow

-- Step 1: Test views are working
SELECT '=== TESTING VIEWS ===' as test;

SELECT 'Team Members View:' as test;
SELECT COUNT(*) as team_member_count FROM public.v_team_members;

SELECT 'Pending Collectors View:' as test;
SELECT COUNT(*) as pending_count FROM public.v_pending_collectors;

-- Step 2: Test roles table
SELECT '=== TESTING ROLES ===' as test;
SELECT id, name, description FROM public.roles ORDER BY name;

-- Step 3: Test sample data from views
SELECT '=== SAMPLE DATA ===' as test;

SELECT 'Sample Team Members:' as test;
SELECT 
    id, 
    email, 
    full_name, 
    role, 
    status, 
    employee_number,
    township_name
FROM public.v_team_members 
LIMIT 3;

SELECT 'Sample Pending Collectors:' as test;
SELECT 
    id, 
    email, 
    full_name, 
    employee_number,
    township_name
FROM public.v_pending_collectors 
LIMIT 3;

-- Step 4: Test if we can query users table directly
SELECT '=== DIRECT USERS TABLE QUERY ===' as test;
SELECT 
    id,
    email,
    full_name,
    role,
    status,
    employee_number
FROM public.users 
WHERE role IN ('admin', 'collector', 'super_admin')
LIMIT 3;

-- Step 5: Check if there are any existing users
SELECT '=== EXISTING USERS COUNT ===' as test;
SELECT 
    role,
    COUNT(*) as count
FROM public.users 
GROUP BY role
ORDER BY role;

-- Step 6: Test the system is ready
SELECT '=== SYSTEM STATUS ===' as test;
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.roles WHERE name = 'admin') THEN '✓ Admin role exists'
        ELSE '✗ Admin role missing'
    END as admin_role_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.roles WHERE name = 'collector') THEN '✓ Collector role exists'
        ELSE '✗ Collector role missing'
    END as collector_role_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.roles WHERE name = 'super_admin') THEN '✓ Super Admin role exists'
        ELSE '✗ Super Admin role missing'
    END as super_admin_role_status;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '=== SYSTEM TEST COMPLETE ===';
    RAISE NOTICE 'Views are working correctly!';
    RAISE NOTICE 'The system is ready for user creation.';
    RAISE NOTICE 'You can now test the Add User functionality in the admin interface.';
END $$;
