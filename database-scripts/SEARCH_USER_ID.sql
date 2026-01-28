-- Search for the specific user ID
SELECT 'Searching for user ID: d2eb9cbe-b2d0-41d3-aa2c-06e8a48f9324' as info;

SELECT 
    u.id,
    u.email,
    u.full_name,
    r.name as role_name,
    r.id as role_id
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
WHERE u.id = 'd2eb9cbe-b2d0-41d3-aa2c-06e8a48f9324';

-- If no results, show all users to confirm
SELECT 'All users in database (if above returns no results):' as info;
SELECT 
    u.id,
    u.email,
    u.full_name,
    r.name as role_name
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
ORDER BY u.created_at DESC;
