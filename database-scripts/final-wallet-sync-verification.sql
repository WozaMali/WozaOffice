-- Final Wallet Sync Verification
-- This script just checks the current state without inserting duplicate data

-- 1. Check current roles (should already exist)
SELECT 'Current Roles:' as info;
SELECT id, name, description FROM public.roles ORDER BY name;

-- 2. Check current materials
SELECT 'Current Materials:' as info;
SELECT id, name, unit_price FROM public.materials ORDER BY name;

-- 3. Check current areas
SELECT 'Current Areas:' as info;
SELECT id, name FROM public.areas ORDER BY name;

-- 4. Test wallet balance function
SELECT 'Wallet Balance Test:' as info;
SELECT public.get_user_wallet_balance('00000000-0000-0000-0000-000000000000') as test_balance;

-- 5. Test wallet update function
SELECT 'Wallet Update Test:' as info;
SELECT public.update_wallet_simple('00000000-0000-0000-0000-000000000000', 5.00, 3) as test_update;

-- 6. Check collections count
SELECT 'Collections Count:' as info;
SELECT COUNT(*) as collection_count FROM public.collections;

-- 7. Check wallets count
SELECT 'Wallets Count:' as info;
SELECT COUNT(*) as wallet_count FROM public.wallets;

-- 8. Grant permissions (safe to run multiple times)
GRANT ALL ON public.wallets TO authenticated;
GRANT ALL ON public.user_wallets TO authenticated;
GRANT ALL ON public.collections TO authenticated;
GRANT ALL ON public.materials TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.roles TO authenticated;
GRANT ALL ON public.areas TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

SELECT 'Permissions granted successfully!' as status;
