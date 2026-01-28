-- ============================================================================
-- SHOW POINTS TRANSACTIONS
-- ============================================================================
-- Script to view points transactions in the database

-- Show all points transactions (where points > 0)
SELECT '=== ALL POINTS TRANSACTIONS ===' as section;
SELECT 
    id,
    user_id,
    amount,
    points,
    source_id,
    created_at
FROM wallet_transactions 
WHERE points > 0
ORDER BY created_at DESC;

-- Show count of points transactions
SELECT 
    COUNT(*) as total_points_transactions,
    'POINTS TRANSACTIONS COUNT' as status
FROM wallet_transactions 
WHERE points > 0;

-- Show points transactions with high point values (top 10)
SELECT '=== TOP 10 POINTS TRANSACTIONS ===' as section;
SELECT 
    id,
    user_id,
    amount,
    points,
    source_id,
    created_at
FROM wallet_transactions 
WHERE points > 0
ORDER BY points DESC
LIMIT 10;

-- Show points transactions by user
SELECT '=== POINTS TRANSACTIONS BY USER ===' as section;
SELECT 
    user_id,
    COUNT(*) as transaction_count,
    SUM(points) as total_points,
    SUM(amount) as total_amount
FROM wallet_transactions 
WHERE points > 0
GROUP BY user_id
ORDER BY total_points DESC;

-- Show recent points transactions (last 20)
SELECT '=== RECENT POINTS TRANSACTIONS (LAST 20) ===' as section;
SELECT 
    id,
    user_id,
    amount,
    points,
    source_id,
    created_at
FROM wallet_transactions 
WHERE points > 0
ORDER BY created_at DESC
LIMIT 20;

-- Show points transactions with zero amount but positive points
SELECT '=== POINTS TRANSACTIONS WITH ZERO AMOUNT ===' as section;
SELECT 
    id,
    user_id,
    amount,
    points,
    source_id,
    created_at
FROM wallet_transactions 
WHERE points > 0 AND amount = 0
ORDER BY created_at DESC;

-- Show points transactions with positive amount and points
SELECT '=== POINTS TRANSACTIONS WITH POSITIVE AMOUNT ===' as section;
SELECT 
    id,
    user_id,
    amount,
    points,
    source_id,
    created_at
FROM wallet_transactions 
WHERE points > 0 AND amount > 0
ORDER BY created_at DESC;

SELECT 'POINTS TRANSACTIONS QUERY COMPLETED' as status;
