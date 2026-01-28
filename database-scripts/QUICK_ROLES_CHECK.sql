-- Quick check of all user roles
SELECT 
    u.email,
    u.full_name,
    r.name as role_name
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
ORDER BY u.email;
