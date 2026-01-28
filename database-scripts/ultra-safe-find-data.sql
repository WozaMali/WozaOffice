-- ============================================================================
-- ULTRA SAFE FIND GREEN SCHOLAR FUND DATA
-- ============================================================================
-- This script safely shows where the R15.00 values are coming from

-- ============================================================================
-- 1. CHECK CURRENT FUND BALANCE VALUES
-- ============================================================================

SELECT '=== CURRENT FUND BALANCE ===' as section;
SELECT * FROM green_scholar_fund_balance;

-- ============================================================================
-- 2. CHECK ALL TRANSACTIONS
-- ============================================================================

SELECT '=== ALL GREEN SCHOLAR TRANSACTIONS ===' as section;
SELECT * FROM green_scholar_transactions
ORDER BY created_at DESC;

-- ============================================================================
-- 3. CHECK USER DONATIONS
-- ============================================================================

SELECT '=== USER DONATIONS ===' as section;
SELECT * FROM user_donations
ORDER BY created_at DESC;

-- ============================================================================
-- 4. CHECK WHAT TABLES EXIST
-- ============================================================================

SELECT '=== FUND-RELATED TABLES ===' as section;
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
-- 5. CHECK WHAT COLUMNS EXIST IN FUND TABLES
-- ============================================================================

SELECT '=== COLUMNS IN FUND TABLES ===' as section;
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name IN (
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_name ILIKE '%fund%' 
       OR table_name ILIKE '%green%' 
       OR table_name ILIKE '%scholar%'
       OR table_name ILIKE '%donation%'
)
ORDER BY table_name, column_name;

-- ============================================================================
-- 6. COUNT RECORDS IN EACH TABLE
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
