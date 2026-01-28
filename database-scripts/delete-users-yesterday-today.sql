-- ============================================================================
-- DELETE USERS CREATED YESTERDAY AND TODAY
-- ============================================================================
-- This script deletes users created yesterday and today from the users table
-- WARNING: This will permanently delete users. Make sure you have a backup!

-- Step 1: Preview users that will be deleted (SAFETY CHECK)
SELECT '=== USERS TO BE DELETED (YESTERDAY AND TODAY) ===' as info;

SELECT 
    id,
    email,
    full_name,
    first_name,
    last_name,
    phone,
    status,
    created_at,
    (SELECT name FROM roles WHERE id = users.role_id) as role_name
FROM public.users
WHERE created_at >= DATE_TRUNC('day', CURRENT_DATE - INTERVAL '1 day')
  AND created_at < DATE_TRUNC('day', CURRENT_DATE + INTERVAL '1 day')
ORDER BY created_at DESC;

-- Step 2: Count how many users will be deleted
SELECT '=== COUNT OF USERS TO BE DELETED ===' as info;

SELECT COUNT(*) as users_to_delete
FROM public.users
WHERE created_at >= DATE_TRUNC('day', CURRENT_DATE - INTERVAL '1 day')
  AND created_at < DATE_TRUNC('day', CURRENT_DATE + INTERVAL '1 day');

-- Step 3: Check if any of these users have collections (SAFETY CHECK)
SELECT '=== USERS WITH COLLECTIONS (WILL NOT BE DELETED) ===' as info;

SELECT DISTINCT
    u.id,
    u.email,
    u.full_name,
    COUNT(uc.id) as collection_count
FROM public.users u
LEFT JOIN public.unified_collections uc ON (uc.customer_id = u.id OR uc.collector_id = u.id)
WHERE u.created_at >= DATE_TRUNC('day', CURRENT_DATE - INTERVAL '1 day')
  AND u.created_at < DATE_TRUNC('day', CURRENT_DATE + INTERVAL '1 day')
  AND uc.id IS NOT NULL
GROUP BY u.id, u.email, u.full_name;

-- Step 4: DELETE USERS (ONLY RUN AFTER REVIEWING STEPS 1-3)
-- Uncomment the following lines to actually delete:

/*
-- Delete users created yesterday and today (excluding those with collections)
DELETE FROM public.users
WHERE created_at >= DATE_TRUNC('day', CURRENT_DATE - INTERVAL '1 day')
  AND created_at < DATE_TRUNC('day', CURRENT_DATE + INTERVAL '1 day')
  AND id NOT IN (
    -- Exclude users with collections
    SELECT DISTINCT customer_id FROM public.unified_collections WHERE customer_id IS NOT NULL
    UNION
    SELECT DISTINCT collector_id FROM public.unified_collections WHERE collector_id IS NOT NULL
  )
  AND id NOT IN (
    -- Exclude admin/super_admin users (safety)
    SELECT u.id 
    FROM public.users u
    LEFT JOIN public.roles r ON u.role_id = r.id
    WHERE LOWER(r.name) IN ('admin', 'super_admin', 'superadmin')
       OR LOWER(u.email) = 'superadmin@wozamali.co.za'
  );
*/

-- Step 5: Verify deletion (run after deletion)
SELECT '=== REMAINING USERS FROM YESTERDAY/TODAY (SHOULD BE EMPTY OR ONLY ADMINS) ===' as info;

SELECT 
    id,
    email,
    full_name,
    created_at,
    (SELECT name FROM roles WHERE id = users.role_id) as role_name
FROM public.users
WHERE created_at >= DATE_TRUNC('day', CURRENT_DATE - INTERVAL '1 day')
  AND created_at < DATE_TRUNC('day', CURRENT_DATE + INTERVAL '1 day')
ORDER BY created_at DESC;

