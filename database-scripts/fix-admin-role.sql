-- Fix admin user role
UPDATE public.user_profiles 
SET role = 'admin' 
WHERE email = 'admin@wozamali.com';

-- Verify the change
SELECT id, email, role FROM public.user_profiles WHERE email = 'admin@wozamali.com';

-- Also fix the permissions while we're at it
GRANT INSERT ON public.user_wallets TO authenticated;
GRANT INSERT ON public.points_transactions TO authenticated;

SELECT 'Admin role fixed and permissions granted' as result;
