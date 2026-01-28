-- Combined system check - all results in one query
SELECT 
    'user_profiles_columns' as check_type,
    column_name as result_value,
    NULL as additional_info
FROM information_schema.columns 
WHERE table_name = 'user_profiles' AND table_schema = 'public'

UNION ALL

SELECT 
    'admin_users' as check_type,
    email as result_value,
    role as additional_info
FROM public.user_profiles 
WHERE role = 'admin'

UNION ALL

SELECT 
    'pending_pickups' as check_type,
    collection_code as result_value,
    status as additional_info
FROM public.unified_collections 
WHERE status = 'pending'

UNION ALL

SELECT 
    'unified_collections_permissions' as check_type,
    grantee as result_value,
    privilege_type as additional_info
FROM information_schema.table_privileges 
WHERE table_name = 'unified_collections' AND table_schema = 'public'

UNION ALL

SELECT 
    'user_wallets_permissions' as check_type,
    grantee as result_value,
    privilege_type as additional_info
FROM information_schema.table_privileges 
WHERE table_name = 'user_wallets' AND table_schema = 'public'

UNION ALL

SELECT 
    'wallet_function' as check_type,
    routine_name as result_value,
    routine_type as additional_info
FROM information_schema.routines 
WHERE routine_name = 'update_wallet_simple' AND routine_schema = 'public';
