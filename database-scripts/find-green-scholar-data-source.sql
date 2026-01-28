-- ============================================================================
-- FIND GREEN SCHOLAR FUND DATA SOURCE
-- ============================================================================
-- This script shows exactly where the R15.00 values are coming from

-- ============================================================================
-- 1. CHECK CURRENT FUND BALANCE VALUES
-- ============================================================================

SELECT '=== CURRENT FUND BALANCE ===' as section;
SELECT 
    'Fund Balance Table/View:' as info,
    total_balance,
    pet_donations_total,
    direct_donations_total,
    expenses_total,
    last_updated
FROM green_scholar_fund_balance;

-- ============================================================================
-- 2. CHECK ALL TRANSACTIONS
-- ============================================================================

SELECT '=== ALL GREEN SCHOLAR TRANSACTIONS ===' as section;
SELECT 
    id,
    transaction_type,
    amount,
    description,
    created_at
FROM green_scholar_transactions
ORDER BY created_at DESC;

-- ============================================================================
-- 3. CHECK USER DONATIONS
-- ============================================================================

SELECT '=== USER DONATIONS ===' as section;
SELECT 
    id,
    amount,
    donation_type,
    beneficiary_type,
    status,
    created_at
FROM user_donations
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
-- 6. CHECK COLLECTIONS TABLE FOR FUND DATA
-- ============================================================================

SELECT '=== COLLECTIONS TABLE FUND DATA ===' as section;
SELECT 
    'Collections with fund data:' as info,
    COUNT(*) as count
FROM collections
WHERE green_scholar_fund_amount > 0;

-- Show actual fund amounts in collections
SELECT 
    id,
    green_scholar_fund_amount,
    contributes_to_green_scholar_fund,
    status,
    created_at
FROM collections
WHERE green_scholar_fund_amount > 0
ORDER BY created_at DESC;

-- ============================================================================
-- 7. SUMMARY OF WHERE R15.00 MIGHT BE COMING FROM
-- ============================================================================

SELECT '=== SUMMARY ===' as section;
SELECT 
    'Total transactions amount:' as source,
    COALESCE(SUM(amount), 0) as total_amount
FROM green_scholar_transactions
UNION ALL
SELECT 
    'Total user donations amount:' as source,
    COALESCE(SUM(amount), 0) as total_amount
FROM user_donations
UNION ALL
SELECT 
    'Total collections fund amount:' as source,
    COALESCE(SUM(green_scholar_fund_amount), 0) as total_amount
FROM collections
WHERE green_scholar_fund_amount > 0;
