-- ============================================================================
-- SAFE FIND GREEN SCHOLAR FUND DATA SOURCE
-- ============================================================================
-- This script safely shows where the R15.00 values are coming from

-- ============================================================================
-- 1. CHECK CURRENT FUND BALANCE VALUES
-- ============================================================================

SELECT '=== CURRENT FUND BALANCE ===' as section;
SELECT * FROM green_scholar_fund_balance;

-- ============================================================================
-- 2. CHECK ALL TRANSACTIONS (SAFELY)
-- ============================================================================

SELECT '=== ALL GREEN SCHOLAR TRANSACTIONS ===' as section;
SELECT * FROM green_scholar_transactions
ORDER BY created_at DESC;

-- ============================================================================
-- 3. CHECK USER DONATIONS (SAFELY)
-- ============================================================================

SELECT '=== USER DONATIONS ===' as section;
SELECT * FROM user_donations
ORDER BY created_at DESC;

-- ============================================================================
-- 4. CHECK IF THERE ARE OTHER FUND-RELATED TABLES
-- ============================================================================

SELECT '=== OTHER FUND-RELATED TABLES ===' as section;
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name ILIKE '%fund%' 
   OR table_name ILIKE '%green%' 
   OR table_name ILIKE '%scholar%'
   OR table_name ILIKE '%donation%'
ORDER BY table_name;

-- ============================================================================
-- 5. CHECK FOR FUND-RELATED COLUMNS IN OTHER TABLES
-- ============================================================================

SELECT '=== FUND-RELATED COLUMNS IN OTHER TABLES ===' as section;
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE column_name ILIKE '%fund%' 
   OR column_name ILIKE '%green%' 
   OR column_name ILIKE '%scholar%'
   OR column_name ILIKE '%donation%'
ORDER BY table_name, column_name;

-- ============================================================================
-- 6. CHECK COLLECTIONS TABLE FOR FUND DATA (IF EXISTS)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'collections') THEN
        RAISE NOTICE 'Collections table exists - checking for fund data';
    ELSE
        RAISE NOTICE 'Collections table does not exist';
    END IF;
END $$;

-- Check collections table if it exists
SELECT '=== COLLECTIONS TABLE FUND DATA ===' as section;
SELECT 
    'Collections with fund data:' as info,
    COUNT(*) as count
FROM collections
WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'collections')
AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'collections' AND column_name = 'green_scholar_fund_amount')
AND green_scholar_fund_amount > 0;

-- ============================================================================
-- 7. COUNT RECORDS IN EACH TABLE
-- ============================================================================

SELECT '=== RECORD COUNTS ===' as section;
SELECT 
    'green_scholar_transactions' as table_name,
    COUNT(*) as record_count
FROM green_scholar_transactions
UNION ALL
SELECT 
    'user_donations' as table_name,
    COUNT(*) as record_count
FROM user_donations
UNION ALL
SELECT 
    'green_scholar_fund_balance' as table_name,
    COUNT(*) as record_count
FROM green_scholar_fund_balance;
