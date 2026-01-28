-- ============================================================================
-- ULTRA SIMPLE DEBUG - NO ASSUMPTIONS ABOUT COLUMNS
-- ============================================================================

-- ============================================================================
-- CHECK CURRENT FUND BALANCE
-- ============================================================================

SELECT 'Current Fund Balance:' as info;
SELECT * FROM green_scholar_fund_balance;

-- ============================================================================
-- CHECK WHAT TABLES EXIST
-- ============================================================================

SELECT 'Tables with "green" or "scholar" in name:' as info;
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_name ILIKE '%green%' OR table_name ILIKE '%scholar%'
ORDER BY table_name;

-- ============================================================================
-- CHECK TRANSACTION COUNT (SAFELY)
-- ============================================================================

SELECT 'Transaction counts:' as info;
SELECT 
    'green_scholar_transactions' as table_name,
    COUNT(*) as count
FROM green_scholar_transactions
UNION ALL
SELECT 
    'user_donations' as table_name,
    COUNT(*) as count
FROM user_donations;
