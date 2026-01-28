-- Find where 3315 points come from
-- This script will help identify the source of the 3315 points

-- ============================================================================
-- 1. Check user_wallets table for the specific user
-- ============================================================================
SELECT 
    'user_wallets' as table_name,
    user_id,
    current_points,
    total_points_earned,
    total_points_spent
FROM public.user_wallets
WHERE user_id = '97dbcdc2-0909-4c2c-84c4-359d8085f23b'
   OR current_points = 3315
ORDER BY current_points DESC;

-- ============================================================================
-- 2. Check legacy wallets table
-- ============================================================================
SELECT 
    'wallets' as table_name,
    user_id,
    balance,
    total_points,
    tier
FROM public.wallets
WHERE user_id = '97dbcdc2-0909-4c2c-84c4-359d8085f23b'
   OR balance = 3315
   OR total_points = 3315
ORDER BY total_points DESC;

-- ============================================================================
-- 3. Check if 3315 points could come from weight calculation
-- Formula: 1 kg = 1 point (or similar)
-- ============================================================================
-- Check unified_collections (uses customer_id, not user_id)
SELECT 
    'unified_collections' as source,
    SUM(COALESCE(total_weight_kg, 0)) as total_weight_kg,
    COUNT(*) as collection_count,
    'If this equals 3315, then points = weight (1kg = 1 point)' as note
FROM public.unified_collections
WHERE customer_id = '97dbcdc2-0909-4c2c-84c4-359d8085f23b'
   OR collector_id = '97dbcdc2-0909-4c2c-84c4-359d8085f23b'

UNION ALL

-- Check collections (may use user_id or resident_id)
SELECT 
    'collections' as source,
    SUM(COALESCE(total_weight_kg, weight_kg, 0)) as total_weight_kg,
    COUNT(*) as collection_count,
    'If this equals 3315, then points = weight (1kg = 1 point)' as note
FROM public.collections
WHERE user_id = '97dbcdc2-0909-4c2c-84c4-359d8085f23b'
   OR resident_id = '97dbcdc2-0909-4c2c-84c4-359d8085f23b'
   OR customer_id = '97dbcdc2-0909-4c2c-84c4-359d8085f23b';

-- ============================================================================
-- 4. Check pickups for this user (points might come from approved pickups)
-- ============================================================================
SELECT 
    'pickups' as source,
    p.id,
    p.status,
    p.total_value,
    p.total_weight_kg,
    -- Calculate points using different formulas
    FLOOR(COALESCE(p.total_weight_kg, 0)) as points_from_weight,
    FLOOR(COALESCE(p.total_weight_kg, 0) + FLOOR(COALESCE(p.total_value, 0) / 10)) as points_from_formula,
    COALESCE(p.total_weight_kg, 0) as weight_kg
FROM public.pickups p
WHERE p.user_id = '97dbcdc2-0909-4c2c-84c4-359d8085f23b'
   OR p.customer_id = '97dbcdc2-0909-4c2c-84c4-359d8085f23b'
ORDER BY COALESCE(p.created_at, p.updated_at) DESC NULLS LAST;

-- ============================================================================
-- 5. Check pickup_items to calculate total weight
-- ============================================================================
SELECT 
    'pickup_items_total' as source,
    p.user_id,
    p.customer_id,
    SUM(pi.kilograms) as total_kg,
    SUM(pi.kilograms * COALESCE(m.rate_per_kg, 0)) as total_value,
    FLOOR(SUM(pi.kilograms)) as points_from_weight,
    COUNT(*) as item_count
FROM public.pickup_items pi
JOIN public.pickups p ON pi.pickup_id = p.id
LEFT JOIN public.materials m ON pi.material_id = m.id
WHERE p.user_id = '97dbcdc2-0909-4c2c-84c4-359d8085f23b'
   OR p.customer_id = '97dbcdc2-0909-4c2c-84c4-359d8085f23b'
GROUP BY p.user_id, p.customer_id;

-- ============================================================================
-- 6. Check wallet transactions/ledger for this user (if table exists)
-- ============================================================================
-- Only run if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wallet_transactions') THEN
        PERFORM (
            SELECT 
                'wallet_transactions' as source,
                wt.user_id,
                wt.points as transaction_points,
                wt.description
            FROM public.wallet_transactions wt
            WHERE wt.user_id = '97dbcdc2-0909-4c2c-84c4-359d8085f23b'
            ORDER BY COALESCE(wt.created_at, wt.timestamp) DESC NULLS LAST
            LIMIT 20
        );
    END IF;
END $$;

-- ============================================================================
-- 7. Check wallet_ledger if it exists
-- ============================================================================
-- Only run if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wallet_ledger') THEN
        PERFORM (
            SELECT 
                'wallet_ledger' as source,
                wl.user_id,
                wl.points as ledger_points,
                wl.description
            FROM public.wallet_ledger wl
            WHERE wl.user_id = '97dbcdc2-0909-4c2c-84c4-359d8085f23b'
            ORDER BY COALESCE(wl.created_at, wl.timestamp) DESC NULLS LAST
            LIMIT 20
        );
    END IF;
END $$;

-- ============================================================================
-- 8. Check if there's a trigger or function that sets points
-- ============================================================================
SELECT 
    'trigger_functions' as source,
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('wallets', 'user_wallets', 'pickups', 'collections', 'unified_collections')
  AND (
    action_statement ILIKE '%current_points%'
    OR action_statement ILIKE '%total_points%'
    OR action_statement ILIKE '%update_wallet%'
  );

-- ============================================================================
-- 9. Check for any SQL functions that calculate points
-- ============================================================================
SELECT 
    'functions' as source,
    routine_name,
    LEFT(routine_definition, 500) as function_preview
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_definition ILIKE '%current_points%'
    OR routine_definition ILIKE '%calculate_points%'
    OR routine_definition ILIKE '%update_wallet%'
  );

-- ============================================================================
-- 10. Summary: Check if total weight equals 3315 kg
-- ============================================================================
WITH weight_totals AS (
    SELECT 
        COALESCE(
            (SELECT SUM(COALESCE(total_weight_kg, 0)) FROM public.unified_collections 
             WHERE customer_id = '97dbcdc2-0909-4c2c-84c4-359d8085f23b' 
                OR collector_id = '97dbcdc2-0909-4c2c-84c4-359d8085f23b'),
            (SELECT SUM(COALESCE(total_weight_kg, weight_kg, 0)) FROM public.collections 
             WHERE user_id = '97dbcdc2-0909-4c2c-84c4-359d8085f23b' 
                OR resident_id = '97dbcdc2-0909-4c2c-84c4-359d8085f23b'
                OR customer_id = '97dbcdc2-0909-4c2c-84c4-359d8085f23b'),
            (SELECT SUM(pi.kilograms) FROM public.pickup_items pi
             JOIN public.pickups p ON pi.pickup_id = p.id
             WHERE p.user_id = '97dbcdc2-0909-4c2c-84c4-359d8085f23b' 
                OR p.customer_id = '97dbcdc2-0909-4c2c-84c4-359d8085f23b'),
            0
        ) as total_weight_kg
)
SELECT 
    'SUMMARY' as check_type,
    'Total weight from all sources' as description,
    total_weight_kg,
    3315 as expected_points,
    CASE 
        WHEN total_weight_kg = 3315 THEN '✅ MATCH: Points likely from total weight (1kg = 1 point)'
        WHEN total_weight_kg > 0 THEN '⚠️ PARTIAL MATCH: Total weight is ' || total_weight_kg::text || ' kg, not exactly 3315'
        ELSE '❌ NO MATCH: No weight data found or points source unknown'
    END as conclusion
FROM weight_totals;
