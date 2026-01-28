-- Check wallet details with user information
SELECT 'Wallet details with user info:' as info;
SELECT 
    uw.user_id,
    up.email,
    up.full_name,
    uw.current_points,
    uw.total_points_earned,
    uw.total_points_spent,
    uw.last_updated
FROM public.user_wallets uw
JOIN public.user_profiles up ON uw.user_id = up.id
ORDER BY uw.current_points DESC;

-- Check points transactions for the user with 35 points
SELECT 'Points transactions for user with 35 points:' as info;
SELECT 
    pt.id,
    pt.wallet_id,
    up.email,
    pt.points,
    pt.transaction_type,
    pt.description,
    pt.created_at
FROM public.points_transactions pt
JOIN public.user_wallets uw ON pt.wallet_id = uw.id
JOIN public.user_profiles up ON uw.user_id = up.id
WHERE uw.user_id = '6b29872e-f6d7-4be7-bb38-2104dc7491cb'
ORDER BY pt.created_at DESC;

-- Check total points in the system
SELECT 'Total points in system:' as info;
SELECT SUM(current_points) as total_points FROM public.user_wallets;
