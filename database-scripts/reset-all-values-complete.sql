-- ============================================================================
-- RESET ALL VALUES, AMOUNTS, AND KGS TO ZERO
-- ============================================================================
-- This script completely resets all customer data to zero
-- WARNING: This will permanently delete all pickup data and wallet balances

-- ============================================================================
-- STEP 1: BACKUP CURRENT DATA (OPTIONAL)
-- ============================================================================

-- Create backup tables before resetting (optional safety measure)
CREATE TABLE IF NOT EXISTS backup_pickup_items AS 
SELECT * FROM public.pickup_items;

CREATE TABLE IF NOT EXISTS backup_wallets AS 
SELECT * FROM public.wallets;

CREATE TABLE IF NOT EXISTS backup_user_activity_log AS 
SELECT * FROM public.user_activity_log;

-- ============================================================================
-- STEP 2: RESET ALL PICKUP ITEM KILOGRAMS TO ZERO
-- ============================================================================

-- Reset all kilograms in pickup_items to 0
UPDATE public.pickup_items 
SET 
  kilograms = 0,
  contamination_pct = 0
WHERE kilograms > 0 OR contamination_pct > 0;

-- Log the reset
INSERT INTO public.user_activity_log (
  user_id,
  activity_type,
  description,
  metadata
) VALUES (
  (SELECT id FROM public.profiles WHERE role = 'ADMIN' LIMIT 1),
  'system_reset',
  'All pickup item kilograms and contamination percentages reset to zero',
  jsonb_build_object(
    'reset_type', 'pickup_items',
    'items_affected', (SELECT COUNT(*) FROM backup_pickup_items),
    'timestamp', NOW()
  )
);

-- ============================================================================
-- STEP 3: RESET ALL WALLET BALANCES TO ZERO
-- ============================================================================

-- Reset all wallet balances to 0
UPDATE public.wallets 
SET 
  balance = 0.00,
  total_points = 0,
  updated_at = NOW()
WHERE balance > 0 OR total_points > 0;

-- Log the reset
INSERT INTO public.user_activity_log (
  user_id,
  activity_type,
  description,
  metadata
) VALUES (
  (SELECT id FROM public.profiles WHERE role = 'ADMIN' LIMIT 1),
  'system_reset',
  'All wallet balances and points reset to zero',
  jsonb_build_object(
    'reset_type', 'wallets',
    'wallets_affected', (SELECT COUNT(*) FROM backup_wallets),
    'timestamp', NOW()
  )
);

-- ============================================================================
-- STEP 4: RESET PICKUP STATUSES (OPTIONAL)
-- ============================================================================

-- Reset all pickup statuses to 'pending' (optional - uncomment if needed)
-- UPDATE public.pickups 
-- SET 
--   status = 'pending',
--   updated_at = NOW()
-- WHERE status != 'pending';

-- ============================================================================
-- STEP 5: VERIFICATION QUERIES
-- ============================================================================

-- Check pickup items after reset
SELECT 'PICKUP ITEMS AFTER RESET' as check_type,
       COUNT(*) as total_items,
       COUNT(CASE WHEN kilograms = 0 THEN 1 END) as items_with_zero_kg,
       COUNT(CASE WHEN kilograms > 0 THEN 1 END) as items_with_kg,
       SUM(kilograms) as total_kg
FROM public.pickup_items;

-- Check wallet balances after reset
SELECT 'WALLET BALANCES AFTER RESET' as check_type,
       COUNT(*) as total_wallets,
       COUNT(CASE WHEN balance = 0 THEN 1 END) as wallets_with_zero_balance,
       COUNT(CASE WHEN balance > 0 THEN 1 END) as wallets_with_balance,
       SUM(balance) as total_balance,
       AVG(balance) as average_balance
FROM public.wallets;

-- Check if any values still exist
SELECT 'REMAINING VALUES CHECK' as check_type,
       'Total pickup value' as metric,
       SUM(pi.kilograms * m.rate_per_kg) as value
FROM public.pickup_items pi
JOIN public.materials m ON pi.material_id = m.id
UNION ALL
SELECT 'REMAINING VALUES CHECK', 'Total wallet balance', SUM(balance)
FROM public.wallets;

-- ============================================================================
-- STEP 6: CLEANUP BACKUP TABLES (OPTIONAL)
-- ============================================================================

-- Uncomment these lines if you want to remove the backup tables
-- DROP TABLE IF EXISTS backup_pickup_items;
-- DROP TABLE IF EXISTS backup_wallets;
-- DROP TABLE IF EXISTS backup_user_activity_log;

-- ============================================================================
-- STEP 7: FINAL CONFIRMATION
-- ============================================================================

SELECT 'RESET COMPLETE' as status,
       'All values, amounts, and kgs have been reset to zero' as message,
       NOW() as reset_timestamp;

-- Show summary of what was reset
SELECT 'RESET SUMMARY' as summary_type,
       'Pickup Items' as item_type,
       COUNT(*) as items_reset,
       'All kilograms and contamination percentages set to 0' as description
FROM backup_pickup_items
UNION ALL
SELECT 'RESET SUMMARY', 'Wallets', COUNT(*), 'All balances and points set to 0'
FROM backup_wallets;
