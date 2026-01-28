-- ============================================================================
-- DEBUG GREEN SCHOLAR FUND - FIND THE SOURCE OF THE R15.00
-- ============================================================================
-- This script helps us understand where the R15.00 is coming from

-- ============================================================================
-- CHECK WHAT TABLES/VIEWS EXIST
-- ============================================================================

SELECT 'Tables and Views:' as info;
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name LIKE '%green%' OR table_name LIKE '%scholar%'
ORDER BY table_name;

-- ============================================================================
-- CHECK CURRENT FUND BALANCE
-- ============================================================================

SELECT 'Current Fund Balance:' as info;
SELECT 
    total_balance,
    pet_donations_total,
    direct_donations_total,
    expenses_total,
    last_updated
FROM green_scholar_fund_balance;

-- ============================================================================
-- CHECK TRANSACTIONS (if table exists)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'green_scholar_transactions') THEN
        RAISE NOTICE 'Green Scholar Transactions table exists';
    ELSE
        RAISE NOTICE 'Green Scholar Transactions table does not exist';
    END IF;
END $$;

-- Show transactions if table exists
SELECT 'Green Scholar Transactions:' as info;
SELECT 
    transaction_type,
    amount,
    description,
    status,
    created_at
FROM green_scholar_transactions
WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'green_scholar_transactions')
ORDER BY created_at DESC;

-- ============================================================================
-- CHECK USER DONATIONS (if table exists)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_donations') THEN
        RAISE NOTICE 'User Donations table exists';
    ELSE
        RAISE NOTICE 'User Donations table does not exist';
    END IF;
END $$;

-- Show donations if table exists
SELECT 'User Donations:' as info;
SELECT 
    amount,
    donation_type,
    beneficiary_type,
    status,
    created_at
FROM user_donations
WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_donations')
ORDER BY created_at DESC;

-- ============================================================================
-- CHECK IF THERE ARE OTHER SOURCES
-- ============================================================================

-- Check if there are any other tables that might contribute to the fund
SELECT 'Other potential fund sources:' as info;
SELECT 
    table_name,
    column_name
FROM information_schema.columns 
WHERE column_name LIKE '%green%' OR column_name LIKE '%scholar%' OR column_name LIKE '%fund%'
ORDER BY table_name, column_name;
