-- ============================================================================
-- SHOW ALL TRANSACTIONS
-- ============================================================================
-- Simple script to view all transactions in the database

-- Show all wallet transactions
SELECT '=== ALL WALLET TRANSACTIONS ===' as section;
SELECT 
    id,
    user_id,
    amount,
    points,
    source_id,
    created_at
FROM wallet_transactions 
ORDER BY created_at DESC;

-- Show count of wallet transactions
SELECT 
    COUNT(*) as total_wallet_transactions,
    'WALLET TRANSACTIONS COUNT' as status
FROM wallet_transactions;

-- Show all unified collections
SELECT '=== ALL UNIFIED COLLECTIONS ===' as section;
SELECT 
    id,
    total_value,
    computed_value,
    status,
    created_at
FROM unified_collections 
ORDER BY created_at DESC;

-- Show count of unified collections
SELECT 
    COUNT(*) as total_unified_collections,
    'UNIFIED COLLECTIONS COUNT' as status
FROM unified_collections;

-- Show all collections
SELECT '=== ALL COLLECTIONS ===' as section;
SELECT 
    id,
    status,
    created_at
FROM collections 
ORDER BY created_at DESC;

-- Show count of collections
SELECT 
    COUNT(*) as total_collections,
    'COLLECTIONS COUNT' as status
FROM collections;

-- Show recent transactions (last 20)
SELECT '=== RECENT TRANSACTIONS (LAST 20) ===' as section;
SELECT 
    id,
    user_id,
    amount,
    points,
    source_id,
    created_at
FROM wallet_transactions 
ORDER BY created_at DESC
LIMIT 20;

SELECT 'QUERY COMPLETED' as status;
