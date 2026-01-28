-- ============================================================================
-- CLEAR ALL COLLECTION DATA TO RESET GREEN SCHOLAR FUND
-- ============================================================================
-- This script clears all collection data that's contributing to the fund

-- ============================================================================
-- 1. SHOW CURRENT DATA BEFORE CLEARING
-- ============================================================================

SELECT '=== CURRENT DATA BEFORE CLEARING ===' as section;
SELECT 
    'Collection Materials Total Price:' as source,
    COALESCE(SUM(total_price), 0) as total_amount
FROM collection_materials
WHERE total_price > 0
UNION ALL
SELECT 
    'Unified Collections Total Value:' as source,
    COALESCE(SUM(total_value), 0) as total_amount
FROM unified_collections
WHERE total_value > 0;

-- ============================================================================
-- 2. CLEAR COLLECTION MATERIALS DATA
-- ============================================================================

SELECT '=== CLEARING COLLECTION MATERIALS ===' as section;
DELETE FROM collection_materials;

-- ============================================================================
-- 3. CLEAR UNIFIED COLLECTIONS DATA
-- ============================================================================

SELECT '=== CLEARING UNIFIED COLLECTIONS ===' as section;
DELETE FROM unified_collections;

-- ============================================================================
-- 4. CLEAR ANY OTHER TRANSACTION DATA
-- ============================================================================

SELECT '=== CLEARING OTHER TRANSACTION DATA ===' as section;
DELETE FROM green_scholar_transactions;
DELETE FROM user_donations;

-- ============================================================================
-- 5. VERIFY ALL DATA IS CLEARED
-- ============================================================================

SELECT '=== VERIFICATION - ALL DATA CLEARED ===' as section;
SELECT 
    'Collection Materials Total Price:' as source,
    COALESCE(SUM(total_price), 0) as total_amount
FROM collection_materials
WHERE total_price > 0
UNION ALL
SELECT 
    'Unified Collections Total Value:' as source,
    COALESCE(SUM(total_value), 0) as total_amount
FROM unified_collections
WHERE total_value > 0
UNION ALL
SELECT 
    'Green Scholar Transactions:' as source,
    COALESCE(SUM(amount), 0) as total_amount
FROM green_scholar_transactions
UNION ALL
SELECT 
    'User Donations:' as source,
    COALESCE(SUM(amount), 0) as total_amount
FROM user_donations;

-- ============================================================================
-- 6. CHECK FUND BALANCE VIEW
-- ============================================================================

SELECT '=== FINAL FUND BALANCE ===' as section;
SELECT * FROM green_scholar_fund_balance;

-- ============================================================================
-- 7. RECORD COUNTS
-- ============================================================================

SELECT '=== FINAL RECORD COUNTS ===' as section;
SELECT 
    'collection_materials' as table_name,
    COUNT(*) as record_count
FROM collection_materials
UNION ALL
SELECT 
    'unified_collections' as table_name,
    COUNT(*) as record_count
FROM unified_collections
UNION ALL
SELECT 
    'green_scholar_transactions' as table_name,
    COUNT(*) as record_count
FROM green_scholar_transactions
UNION ALL
SELECT 
    'user_donations' as table_name,
    COUNT(*) as record_count
FROM user_donations;
