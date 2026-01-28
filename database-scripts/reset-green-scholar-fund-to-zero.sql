-- ============================================================================
-- RESET GREEN SCHOLAR FUND TO ZERO
-- ============================================================================
-- This script resets all Green Scholar Fund values to 0 as requested
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- CLEAR ALL TRANSACTIONS (Only if tables exist)
-- ============================================================================

-- Delete all Green Scholar transactions (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'green_scholar_transactions') THEN
        DELETE FROM green_scholar_transactions;
        RAISE NOTICE 'Cleared green_scholar_transactions table';
    ELSE
        RAISE NOTICE 'green_scholar_transactions table does not exist, skipping';
    END IF;
END $$;

-- Delete all user donations (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_donations') THEN
        DELETE FROM user_donations;
        RAISE NOTICE 'Cleared user_donations table';
    ELSE
        RAISE NOTICE 'user_donations table does not exist, skipping';
    END IF;
END $$;

-- Delete all collection Green Scholar contributions (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'collection_green_scholar_contributions') THEN
        DELETE FROM collection_green_scholar_contributions;
        RAISE NOTICE 'Cleared collection_green_scholar_contributions table';
    ELSE
        RAISE NOTICE 'collection_green_scholar_contributions table does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- RESET FUND BALANCE TO ZERO
-- ============================================================================

-- Note: Since green_scholar_fund_balance appears to be a view,
-- clearing the transactions above will automatically reset the balance to zero.
-- The view calculates the balance from the transaction data.

DO $$
BEGIN
    RAISE NOTICE 'Fund balance will be automatically reset to zero when transactions are cleared';
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show the reset fund balance (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'green_scholar_fund_balance') THEN
        RAISE NOTICE 'Green Scholar Fund Reset Complete!';
        RAISE NOTICE 'Fund Balance:';
    ELSE
        RAISE NOTICE 'green_scholar_fund_balance table does not exist';
    END IF;
END $$;

-- Show fund balance if table or view exists
SELECT 
    'Fund Balance:' as info,
    total_balance,
    pet_donations_total,
    direct_donations_total,
    expenses_total,
    last_updated
FROM green_scholar_fund_balance
WHERE EXISTS (
    SELECT FROM information_schema.tables WHERE table_name = 'green_scholar_fund_balance'
    UNION
    SELECT FROM information_schema.views WHERE table_name = 'green_scholar_fund_balance'
);

-- Show transaction counts (only for existing tables)
SELECT 'Transaction Counts:' as info;
SELECT 
    'Green Scholar Transactions:' as table_name,
    COUNT(*) as count
FROM green_scholar_transactions
WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'green_scholar_transactions')
UNION ALL
SELECT 
    'User Donations:' as table_name,
    COUNT(*) as count
FROM user_donations
WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_donations');
