-- Check all user wallet balances
SELECT 'Individual wallet balances:' as info;
SELECT 
    uw.user_id,
    up.email,
    up.full_name,
    uw.balance,
    uw.created_at
FROM public.user_wallets uw
JOIN public.user_profiles up ON uw.user_id = up.id
ORDER BY uw.balance DESC;

-- Check total wallet balance
SELECT 'Total wallet balance:' as info;
SELECT SUM(balance) as total_balance FROM public.user_wallets;

-- Check wallet transactions
SELECT 'Recent wallet transactions:' as info;
SELECT 
    pt.id,
    pt.user_id,
    up.email,
    pt.amount,
    pt.transaction_type,
    pt.description,
    pt.created_at
FROM public.points_transactions pt
JOIN public.user_profiles up ON pt.user_id = up.id
ORDER BY pt.created_at DESC
LIMIT 10;
