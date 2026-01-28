-- ============================================================================
-- RESET GREEN SCHOLAR FUND
-- ============================================================================
-- Reset Green Scholar Fund data to 0 after transaction deletion

-- Step 1: Check current Green Scholar Fund data
SELECT '=== CHECKING GREEN SCHOLAR FUND DATA ===' as step;

-- Check green_scholar_fund_balance
SELECT '=== GREEN SCHOLAR FUND BALANCE ===' as step;
SELECT 
    id,
    total_balance,
    pet_donations_total,
    direct_donations_total,
    expenses_total,
    created_at,
    updated_at
FROM green_scholar_fund_balance
ORDER BY created_at DESC;

-- Check green_scholar_transactions
SELECT '=== GREEN SCHOLAR TRANSACTIONS ===' as step;
SELECT 
    id,
    transaction_type,
    amount,
    description,
    created_at
FROM green_scholar_transactions
ORDER BY created_at DESC;

-- Check collection_green_scholar_contributions
SELECT '=== COLLECTION GREEN SCHOLAR CONTRIBUTIONS ===' as step;
SELECT 
    id,
    collection_id,
    material_name,
    total_value,
    green_scholar_contribution,
    user_wallet_contribution,
    created_at
FROM collection_green_scholar_contributions
ORDER BY created_at DESC;

-- Step 2: Check totals
SELECT '=== TOTALS ===' as step;
SELECT 
    'green_scholar_fund_balance' as table_name,
    COUNT(*) as record_count
FROM green_scholar_fund_balance
UNION ALL
SELECT 
    'green_scholar_transactions' as table_name,
    COUNT(*) as record_count
FROM green_scholar_transactions
UNION ALL
SELECT 
    'collection_green_scholar_contributions' as table_name,
    COUNT(*) as record_count
FROM collection_green_scholar_contributions;

-- Step 3: Calculate current PET revenue
SELECT '=== CURRENT PET REVENUE CALCULATION ===' as step;
SELECT 
    COALESCE(SUM(CASE WHEN transaction_type IN ('pet_contribution', 'pet_donation') THEN amount ELSE 0 END), 0) as pet_revenue_from_transactions,
    COALESCE(SUM(CASE WHEN transaction_type IN ('donation', 'direct_donation') THEN amount ELSE 0 END), 0) as direct_donations,
    COALESCE(SUM(CASE WHEN transaction_type IN ('distribution', 'expense') THEN amount ELSE 0 END), 0) as distributions
FROM green_scholar_transactions;

-- Step 4: RESET GREEN SCHOLAR FUND DATA
SELECT '=== RESETTING GREEN SCHOLAR FUND DATA ===' as step;

-- Delete all green_scholar_transactions
DELETE FROM green_scholar_transactions;
SELECT 'Deleted all green_scholar_transactions' as status;

-- Delete all collection_green_scholar_contributions
DELETE FROM collection_green_scholar_contributions;
SELECT 'Deleted all collection_green_scholar_contributions' as status;

-- Reset green_scholar_fund_balance to 0
UPDATE green_scholar_fund_balance 
SET 
    total_balance = 0.00,
    pet_donations_total = 0.00,
    direct_donations_total = 0.00,
    expenses_total = 0.00,
    updated_at = NOW()
WHERE id IS NOT NULL;
SELECT 'Reset green_scholar_fund_balance to 0' as status;

-- Step 5: Verify reset
SELECT '=== VERIFICATION ===' as step;

-- Check green_scholar_fund_balance after reset
SELECT 
    id,
    total_balance,
    pet_donations_total,
    direct_donations_total,
    expenses_total,
    updated_at
FROM green_scholar_fund_balance;

-- Check if any transactions remain
SELECT 
    COUNT(*) as remaining_transactions,
    'GREEN SCHOLAR TRANSACTIONS REMAINING' as status
FROM green_scholar_transactions;

-- Check if any contributions remain
SELECT 
    COUNT(*) as remaining_contributions,
    'GREEN SCHOLAR CONTRIBUTIONS REMAINING' as status
FROM collection_green_scholar_contributions;

-- Calculate PET revenue after reset (should be 0)
SELECT 
    COALESCE(SUM(CASE WHEN transaction_type IN ('pet_contribution', 'pet_donation') THEN amount ELSE 0 END), 0) as pet_revenue_after_reset,
    'PET REVENUE AFTER RESET' as status
FROM green_scholar_transactions;

SELECT 'GREEN SCHOLAR FUND RESET COMPLETED' as status;
