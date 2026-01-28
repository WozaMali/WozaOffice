-- Update all users with 'member' role to 'resident' role
UPDATE public.users
SET role_id = (SELECT id FROM public.roles WHERE name = 'resident')
WHERE role_id = (SELECT id FROM public.roles WHERE name = 'member');

-- Verify the update
SELECT 
    u.email,
    u.full_name,
    r.name as role_name
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
ORDER BY u.email;
