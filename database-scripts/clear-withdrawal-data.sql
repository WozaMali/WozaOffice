-- ============================================================================
-- CLEAR WITHDRAWAL DATA - KEEP LOGIC INTACT
-- ============================================================================
-- This script clears all withdrawal data but preserves the system logic

-- ============================================================================
-- 1. SHOW CURRENT WITHDRAWAL DATA BEFORE CLEARING
-- ============================================================================

SELECT '=== CURRENT WITHDRAWAL DATA ===' as section;

-- Check withdrawal_requests table
SELECT 
    'withdrawal_requests' as table_name,
    COUNT(*) as record_count,
    COALESCE(SUM(amount), 0) as total_amount
FROM withdrawal_requests;

-- Check withdrawals table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'withdrawals') THEN
        RAISE NOTICE 'withdrawals table exists';
    ELSE
        RAISE NOTICE 'withdrawals table does not exist';
    END IF;
END $$;

-- Check payments table for withdrawal transactions
SELECT 
    'payments (withdrawal type)' as table_name,
    COUNT(*) as record_count,
    COALESCE(SUM(amount), 0) as total_amount
FROM payments
WHERE transaction_type = 'withdrawal';

-- ============================================================================
-- 2. CLEAR WITHDRAWAL REQUESTS
-- ============================================================================

SELECT '=== CLEARING WITHDRAWAL REQUESTS ===' as section;
DELETE FROM withdrawal_requests;

-- ============================================================================
-- 3. CLEAR WITHDRAWALS TABLE (IF EXISTS)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'withdrawals') THEN
        DELETE FROM withdrawals;
        RAISE NOTICE 'Cleared withdrawals table';
    ELSE
        RAISE NOTICE 'withdrawals table does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- 4. CLEAR WITHDRAWAL PAYMENTS
-- ============================================================================

SELECT '=== CLEARING WITHDRAWAL PAYMENTS ===' as section;
DELETE FROM payments WHERE transaction_type = 'withdrawal';

-- ============================================================================
-- 4b. CLEAR WALLET TRANSACTIONS RELATED TO WITHDRAWALS (IF TABLE EXISTS)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'wallet_transactions') THEN
        DELETE FROM wallet_transactions WHERE type = 'withdrawal';
        RAISE NOTICE 'Cleared wallet_transactions of type withdrawal';
    ELSE
        RAISE NOTICE 'wallet_transactions table does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- 4c. CLEAR UNIFIED TRANSACTIONS RELATED TO WITHDRAWALS (IF TABLE EXISTS)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'transactions') THEN
        DELETE FROM transactions WHERE transaction_type = 'withdrawal';
        RAISE NOTICE 'Cleared transactions of type withdrawal';
    ELSE
        RAISE NOTICE 'transactions table does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- 5. VERIFY ALL WITHDRAWAL DATA IS CLEARED
-- ============================================================================

SELECT '=== VERIFICATION - WITHDRAWAL DATA CLEARED ===' as section;

-- Check withdrawal_requests table
SELECT 
    'withdrawal_requests' as table_name,
    COUNT(*) as record_count,
    COALESCE(SUM(amount), 0) as total_amount
FROM withdrawal_requests;

-- Check withdrawals table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'withdrawals') THEN
        RAISE NOTICE 'withdrawals table record count: %', (SELECT COUNT(*) FROM withdrawals);
    END IF;
END $$;

-- Check payments table for withdrawal transactions
SELECT 
    'payments (withdrawal type)' as table_name,
    COUNT(*) as record_count,
    COALESCE(SUM(amount), 0) as total_amount
FROM payments
WHERE transaction_type = 'withdrawal';

-- ============================================================================
-- 6. SHOW REMAINING SYSTEM TABLES (LOGIC PRESERVED)
-- ============================================================================

SELECT '=== SYSTEM TABLES PRESERVED (LOGIC INTACT) ===' as section;
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name IN ('withdrawal_requests', 'withdrawals', 'payments', 'wallet_transactions', 'transactions')
ORDER BY table_name;

-- ============================================================================
-- 7. FINAL SUMMARY
-- ============================================================================

SELECT '=== FINAL SUMMARY ===' as section;
SELECT 
    'Withdrawal data cleared successfully' as status,
    'System logic and tables preserved' as note,
    'Office App withdrawal functionality intact' as result;
