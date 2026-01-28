-- ============================================================================
-- WALLET BALANCE DISCREPANCY DIAGNOSIS
-- ============================================================================
-- This script helps diagnose why customer dashboard shows R325 but office shows R0

-- Check if wallets table exists and has data
SELECT 'WALLETS TABLE STATUS' as check_type, 
       CASE 
         WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wallets') 
         THEN 'EXISTS' 
         ELSE 'MISSING' 
       END as status;

-- Check if wallets table has any records
SELECT 'WALLETS RECORDS' as check_type,
       COUNT(*) as total_wallets,
       COUNT(CASE WHEN balance > 0 THEN 1 END) as wallets_with_balance,
       SUM(balance) as total_balance
FROM public.wallets;

-- Check if enhanced_wallets table exists (from rewards system)
SELECT 'ENHANCED_WALLETS TABLE STATUS' as check_type,
       CASE 
         WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'enhanced_wallets') 
         THEN 'EXISTS' 
         ELSE 'MISSING' 
       END as status;

-- Check if enhanced_wallets has any records
SELECT 'ENHANCED_WALLETS RECORDS' as check_type,
       COUNT(*) as total_enhanced_wallets,
       COUNT(CASE WHEN balance > 0 THEN 1 END) as enhanced_wallets_with_balance,
       SUM(balance) as total_enhanced_balance
FROM public.enhanced_wallets;

-- Check customer profiles and their pickup data
SELECT 'CUSTOMER PICKUP ANALYSIS' as check_type,
       p.id as customer_id,
       p.full_name,
       p.email,
       COUNT(pk.id) as total_pickups,
       SUM(COALESCE(pi.total_kg, 0)) as total_kg,
       SUM(COALESCE(pi.total_value, 0)) as total_value,
       -- Calculate what customer dashboard would show (30% of total value)
       ROUND(SUM(COALESCE(pi.total_value, 0)) * 0.3, 2) as calculated_wallet_balance,
       -- Check actual wallet balance
       COALESCE(w.balance, 0) as actual_wallet_balance,
       -- Check if wallet record exists
       CASE WHEN w.id IS NOT NULL THEN 'YES' ELSE 'NO' END as has_wallet_record
FROM public.profiles p
LEFT JOIN public.pickups pk ON p.id = pk.user_id
LEFT JOIN (
  SELECT 
    pickup_id,
    SUM(kilograms) as total_kg,
    SUM(kilograms * m.rate_per_kg) as total_value
  FROM public.pickup_items pi
  JOIN public.materials m ON pi.material_id = m.id
  GROUP BY pickup_id
) pi ON pk.id = pi.pickup_id
LEFT JOIN public.wallets w ON p.id = w.user_id
WHERE p.role = 'CUSTOMER'
GROUP BY p.id, p.full_name, p.email, w.balance, w.id
ORDER BY calculated_wallet_balance DESC;

-- Check if calculate_fund_allocation function exists
SELECT 'FUND ALLOCATION FUNCTION' as check_type,
       CASE 
         WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'calculate_fund_allocation') 
         THEN 'EXISTS' 
         ELSE 'MISSING' 
       END as status;

-- Test the calculate_fund_allocation function with a sample value
SELECT 'FUND ALLOCATION TEST' as check_type,
       calculate_fund_allocation(100.00) as test_result;

-- Check if there are any wallet transactions or payments
SELECT 'WALLET TRANSACTIONS' as check_type,
       COUNT(*) as total_transactions,
       COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_transactions,
       SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_completed_amount
FROM public.payments;

-- Check if there are any withdrawals
SELECT 'WITHDRAWALS' as check_type,
       COUNT(*) as total_withdrawals,
       COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_withdrawals,
       SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_completed_amount
FROM public.withdrawals;

-- Check if there are any wallet balance update triggers or functions
SELECT 'WALLET UPDATE FUNCTIONS' as check_type,
       routine_name,
       routine_type
FROM information_schema.routines 
WHERE routine_name LIKE '%wallet%' OR routine_name LIKE '%balance%';

-- Check if there are any wallet-related triggers
SELECT 'WALLET TRIGGERS' as check_type,
       trigger_name,
       event_manipulation,
       action_timing
FROM information_schema.triggers 
WHERE trigger_name LIKE '%wallet%' OR trigger_name LIKE '%balance%';
