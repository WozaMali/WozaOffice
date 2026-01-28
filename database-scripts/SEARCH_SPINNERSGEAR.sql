-- Search for any user with 'spinnersgear' in their email
SELECT 'Searching for users with spinnersgear in email:' as info;

SELECT 
    u.id,
    u.email,
    u.full_name,
    u.status,
    r.name as role_name,
    r.id as role_id
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
WHERE u.email ILIKE '%spinnersgear%';

-- If no results, show all emails to help find the correct one
SELECT 'All user emails in database:' as info;
SELECT 
    u.id,
    u.email,
    u.full_name,
    r.name as role_name
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
ORDER BY u.email;
