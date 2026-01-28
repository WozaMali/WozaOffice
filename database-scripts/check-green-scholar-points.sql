-- ============================================================================
-- CHECK GREEN SCHOLAR POINTS
-- ============================================================================
-- Check if Green Scholar points are correctly showing 0 after transaction deletion

-- Step 1: Check wallet_transactions for all users (should be empty or minimal)
SELECT '=== ALL WALLET TRANSACTIONS ===' as step;
SELECT 
    id,
    user_id,
    amount,
    points,
    source_id,
    created_at
FROM wallet_transactions 
ORDER BY created_at DESC;

-- Step 2: Check total points by user
SELECT '=== POINTS BY USER ===' as step;
SELECT 
    user_id,
    COUNT(*) as transaction_count,
    SUM(points) as total_points,
    SUM(amount) as total_amount
FROM wallet_transactions 
GROUP BY user_id
ORDER BY total_points DESC;

-- Step 3: Check if there are any points transactions left
SELECT '=== POINTS TRANSACTIONS REMAINING ===' as step;
SELECT 
    COUNT(*) as total_points_transactions,
    SUM(points) as total_points_value
FROM wallet_transactions 
WHERE points > 0;

-- Step 4: Check specific users that might have been in the deleted transactions
-- (These are the user_ids from the transactions we deleted)
SELECT '=== CHECKING SPECIFIC USERS ===' as step;
SELECT 
    user_id,
    COUNT(*) as transaction_count,
    SUM(points) as total_points,
    SUM(amount) as total_amount
FROM wallet_transactions 
WHERE user_id IN (
    '3625eb83-2732-4973-945f-c3a663ee44e7',
    'c1995e1f-6695-462a-92ce-233c375e32df',
    'ec5ad854-189e-4db8-953b-a8447b82abc6',
    '97dbcdc2-0909-4c2c-84c4-359d8085f23b',
    'a88f69f0-fdaf-4946-8442-27d8f84637b4'
)
GROUP BY user_id
ORDER BY total_points DESC;

-- Step 5: Check unified_collections for these users (should also be empty)
SELECT '=== UNIFIED COLLECTIONS FOR SPECIFIC USERS ===' as step;
SELECT 
    id,
    customer_id,
    total_value,
    computed_value,
    status,
    created_at
FROM unified_collections 
WHERE customer_id IN (
    '3625eb83-2732-4973-945f-c3a663ee44e7',
    'c1995e1f-6695-462a-92ce-233c375e32df',
    'ec5ad854-189e-4db8-953b-a8447b82abc6',
    '97dbcdc2-0909-4c2c-84c4-359d8085f23b',
    'a88f69f0-fdaf-4946-8442-27d8f84637b4'
)
ORDER BY created_at DESC;

-- Step 6: Check collections table for these users
SELECT '=== COLLECTIONS FOR SPECIFIC USERS ===' as step;
SELECT 
    id,
    user_id,
    status,
    created_at
FROM collections 
WHERE user_id IN (
    '3625eb83-2732-4973-945f-c3a663ee44e7',
    'c1995e1f-6695-462a-92ce-233c375e32df',
    'ec5ad854-189e-4db8-953b-a8447b82abc6',
    '97dbcdc2-0909-4c2c-84c4-359d8085f23b',
    'a88f69f0-fdaf-4946-8442-27d8f84637b4'
)
ORDER BY created_at DESC;

-- Step 7: Check if there are any other wallet-related tables that might have points
SELECT '=== CHECKING OTHER WALLET TABLES ===' as step;

-- Check if user_wallets table exists and has data
SELECT 
    'user_wallets' as table_name,
    COUNT(*) as record_count
FROM user_wallets
UNION ALL
SELECT 
    'points_transactions' as table_name,
    COUNT(*) as record_count
FROM points_transactions
UNION ALL
SELECT 
    'wallet_transactions' as table_name,
    COUNT(*) as record_count
FROM wallet_transactions;

-- Step 8: Show total counts
SELECT '=== TOTAL COUNTS ===' as step;
SELECT 
    'wallet_transactions' as table_name,
    COUNT(*) as total_count
FROM wallet_transactions
UNION ALL
SELECT 
    'unified_collections' as table_name,
    COUNT(*) as total_count
FROM unified_collections
UNION ALL
SELECT 
    'collections' as table_name,
    COUNT(*) as total_count
FROM collections;

SELECT 'GREEN SCHOLAR POINTS CHECK COMPLETED' as status;
