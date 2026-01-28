-- ============================================================================
-- READ WALLET/POINTS TABLES
-- ============================================================================
-- Comprehensive queries to read all wallet and points data

-- ============================================================================
-- 1. READ user_wallets TABLE (Office App)
-- ============================================================================
SELECT 
    'user_wallets' as table_name,
    id,
    user_id,
    COALESCE(current_points, points, 0) as current_points,
    COALESCE(balance, 0) as balance,
    COALESCE(total_points_earned, 0) as total_points_earned,
    COALESCE(total_points_spent, 0) as total_points_spent,
    COALESCE(created_at::text, last_updated::text, 'N/A') as created_at,
    COALESCE(updated_at::text, last_updated::text, 'N/A') as updated_at
FROM public.user_wallets
ORDER BY COALESCE(updated_at, last_updated, created_at) DESC;

-- ============================================================================
-- 2. READ wallets TABLE (Main App - Legacy)
-- ============================================================================
SELECT 
    'wallets' as table_name,
    id,
    user_id,
    COALESCE(balance, 0) as balance,
    COALESCE(total_points, 0) as total_points,
    tier,
    COALESCE(created_at::text, 'N/A') as created_at,
    COALESCE(updated_at::text, 'N/A') as updated_at
FROM public.wallets
ORDER BY updated_at DESC, created_at DESC;

-- ============================================================================
-- 3. COMBINED VIEW - All wallets with user info
-- ============================================================================
SELECT 
    COALESCE(uw.user_id, w.user_id) as user_id,
    COALESCE(uw.current_points, uw.points, w.balance, 0) as current_points,
    COALESCE(uw.balance, w.balance, 0) as balance,
    COALESCE(uw.total_points_earned, w.total_points, 0) as total_points_earned,
    COALESCE(uw.total_points_spent, 0) as total_points_spent,
    w.tier,
    CASE 
        WHEN uw.id IS NOT NULL THEN 'user_wallets'
        WHEN w.id IS NOT NULL THEN 'wallets'
        ELSE 'none'
    END as source_table,
    COALESCE(uw.updated_at, uw.last_updated, w.updated_at, uw.created_at, w.created_at) as last_updated
FROM public.user_wallets uw
FULL OUTER JOIN public.wallets w ON uw.user_id = w.user_id
ORDER BY last_updated DESC;

-- ============================================================================
-- 4. SUMMARY STATISTICS
-- ============================================================================
SELECT 
    'Summary Statistics' as info,
    COUNT(DISTINCT COALESCE(uw.user_id, w.user_id)) as total_users_with_wallets,
    SUM(COALESCE(uw.current_points, uw.points, 0)) as total_current_points_user_wallets,
    SUM(COALESCE(w.balance, 0)) as total_balance_wallets,
    SUM(COALESCE(uw.total_points_earned, 0)) as total_points_earned,
    SUM(COALESCE(uw.total_points_spent, 0)) as total_points_spent,
    AVG(COALESCE(uw.current_points, uw.points, 0)) as avg_points_per_user
FROM public.user_wallets uw
FULL OUTER JOIN public.wallets w ON uw.user_id = w.user_id;

-- ============================================================================
-- 5. READ WALLET TRANSACTIONS (if table exists)
-- ============================================================================
-- Check if wallet_transactions table exists and read it
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'wallet_transactions'
    ) THEN
        RAISE NOTICE 'wallet_transactions table exists';
    ELSE
        RAISE NOTICE 'wallet_transactions table does not exist';
    END IF;
END $$;

-- Read wallet_transactions if it exists
SELECT 
    'wallet_transactions' as table_name,
    id,
    wallet_id,
    user_id,
    transaction_type,
    amount,
    points,
    description,
    reference_id,
    COALESCE(created_at::text, 'N/A') as created_at
FROM public.wallet_transactions
ORDER BY created_at DESC
LIMIT 100;

-- ============================================================================
-- 6. READ WALLET LEDGER (if table exists)
-- ============================================================================
-- Check if wallet_ledger table exists and read it
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'wallet_ledger'
    ) THEN
        RAISE NOTICE 'wallet_ledger table exists';
    ELSE
        RAISE NOTICE 'wallet_ledger table does not exist';
    END IF;
END $$;

-- Read wallet_ledger if it exists
SELECT 
    'wallet_ledger' as table_name,
    id,
    wallet_id,
    user_id,
    transaction_type,
    amount,
    points,
    balance_before,
    balance_after,
    description,
    COALESCE(created_at::text, 'N/A') as created_at
FROM public.wallet_ledger
ORDER BY created_at DESC
LIMIT 100;

-- ============================================================================
-- 7. READ SPECIFIC USER'S WALLET (Replace user_id)
-- ============================================================================
-- Replace '97dbcdc2-0909-4c2c-84c4-359d8085f23b' with the user_id you want to check
SELECT 
    'Specific User Wallet' as info,
    COALESCE(uw.user_id, w.user_id) as user_id,
    COALESCE(uw.current_points, uw.points, 0) as current_points,
    COALESCE(uw.balance, w.balance, 0) as balance,
    COALESCE(uw.total_points_earned, w.total_points, 0) as total_points_earned,
    COALESCE(uw.total_points_spent, 0) as total_points_spent,
    w.tier,
    CASE 
        WHEN uw.id IS NOT NULL THEN 'user_wallets'
        WHEN w.id IS NOT NULL THEN 'wallets'
        ELSE 'no wallet found'
    END as source_table
FROM public.user_wallets uw
FULL OUTER JOIN public.wallets w ON uw.user_id = w.user_id
WHERE COALESCE(uw.user_id, w.user_id) = '97dbcdc2-0909-4c2c-84c4-359d8085f23b';

-- ============================================================================
-- 8. TOP USERS BY POINTS
-- ============================================================================
SELECT 
    COALESCE(uw.user_id, w.user_id) as user_id,
    COALESCE(uw.current_points, uw.points, w.balance, 0) as current_points,
    COALESCE(uw.total_points_earned, w.total_points, 0) as total_points_earned,
    CASE 
        WHEN uw.id IS NOT NULL THEN 'user_wallets'
        WHEN w.id IS NOT NULL THEN 'wallets'
    END as source_table
FROM public.user_wallets uw
FULL OUTER JOIN public.wallets w ON uw.user_id = w.user_id
WHERE COALESCE(uw.current_points, uw.points, w.balance, 0) > 0
ORDER BY current_points DESC
LIMIT 20;

