-- Fix missing INSERT permission on user_wallets
-- Grant INSERT permission to authenticated users on user_wallets

GRANT INSERT ON public.user_wallets TO authenticated;

-- Also grant INSERT on points_transactions
GRANT INSERT ON public.points_transactions TO authenticated;

-- Verify the permissions were granted
SELECT 'Updated user_wallets permissions:' as info;
SELECT grantee, privilege_type 
FROM information_schema.table_privileges 
WHERE table_name = 'user_wallets' 
AND table_schema = 'public'
ORDER BY grantee, privilege_type;

SELECT 'Updated points_transactions permissions:' as info;
SELECT grantee, privilege_type 
FROM information_schema.table_privileges 
WHERE table_name = 'points_transactions' 
AND table_schema = 'public'
ORDER BY grantee, privilege_type;
