-- Simple diagnostic - check table structure
-- This script checks the actual table structure and permissions

-- Step 1: Check user_profiles table structure
SELECT 'USER_PROFILES TABLE COLUMNS:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Check admin users
SELECT 'ADMIN USERS:' as info;
SELECT 
    id,
    email,
    role,
    created_at
FROM public.user_profiles 
WHERE role = 'admin'
ORDER BY created_at;

-- Step 3: Check pending pickups
SELECT 'PENDING PICKUPS:' as info;
SELECT 
    id,
    collection_code,
    customer_name,
    status,
    total_weight_kg,
    total_value,
    customer_id
FROM public.unified_collections
WHERE status = 'pending'
ORDER BY created_at DESC;

-- Step 4: Check permissions
SELECT 'UNIFIED_COLLECTIONS PERMISSIONS:' as info;
SELECT 
    grantee,
    privilege_type
FROM information_schema.table_privileges 
WHERE table_name = 'unified_collections' 
AND table_schema = 'public'
ORDER BY grantee, privilege_type;

SELECT 'USER_WALLETS PERMISSIONS:' as info;
SELECT 
    grantee,
    privilege_type
FROM information_schema.table_privileges 
WHERE table_name = 'user_wallets' 
AND table_schema = 'public'
ORDER BY grantee, privilege_type;

-- Step 5: Check wallet function
SELECT 'WALLET FUNCTION:' as info;
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name = 'update_wallet_simple' 
AND routine_schema = 'public';

-- Step 6: Success message
SELECT 'DIAGNOSTIC COMPLETE!' as result;