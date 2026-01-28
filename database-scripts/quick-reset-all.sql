-- ============================================================================
-- QUICK RESET ALL VALUES TO ZERO
-- ============================================================================
-- This script immediately resets all values to zero
-- WARNING: This will permanently reset all data

-- Reset all pickup item kilograms to 0
UPDATE public.pickup_items 
SET kilograms = 0, contamination_pct = 0;

-- Reset all wallet balances to 0
UPDATE public.wallets 
SET balance = 0.00, total_points = 0, updated_at = NOW();

-- Verify the reset
SELECT 'RESET COMPLETE' as status,
       COUNT(*) as total_pickup_items,
       SUM(kilograms) as total_kg,
       SUM(balance) as total_wallet_balance
FROM public.pickup_items pi
CROSS JOIN public.wallets w
LIMIT 1;
