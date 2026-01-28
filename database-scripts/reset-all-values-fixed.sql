-- ============================================================================
-- RESET ALL VALUES, AMOUNTS, AND KGS TO ZERO (FIXED VERSION)
-- ============================================================================
-- This script completely resets all customer data to zero
-- WARNING: This will permanently delete all pickup data and wallet balances

-- ============================================================================
-- STEP 1: CHECK IF ADMIN USER EXISTS
-- ============================================================================

-- Check if we have any admin users
SELECT 'ADMIN CHECK' as check_type,
       COUNT(*) as admin_users,
       STRING_AGG(role, ', ') as existing_roles
FROM public.profiles 
WHERE role IN ('ADMIN', 'admin');

-- ============================================================================
-- STEP 2: RESET ALL PICKUP ITEM KILOGRAMS TO ZERO
-- ============================================================================

-- Reset all kilograms in pickup_items to 0
UPDATE public.pickup_items 
SET 
  kilograms = 0,
  contamination_pct = 0
WHERE kilograms > 0 OR contamination_pct > 0;

-- Log the reset (only if admin user exists)
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Try to find an admin user
  SELECT id INTO admin_user_id 
  FROM public.profiles 
  WHERE role IN ('ADMIN', 'admin') 
  LIMIT 1;
  
  -- Only log if we found an admin user
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.user_activity_log (
      user_id,
      activity_type,
      description,
      metadata
    ) VALUES (
      admin_user_id,
      'system_reset',
      'All pickup item kilograms and contamination percentages reset to zero',
      jsonb_build_object(
        'reset_type', 'pickup_items',
        'timestamp', NOW()
      )
    );
  END IF;
END $$;

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

-- Log the reset (only if admin user exists)
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Try to find an admin user
  SELECT id INTO admin_user_id 
  FROM public.profiles 
  WHERE role IN ('ADMIN', 'admin') 
  LIMIT 1;
  
  -- Only log if we found an admin user
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.user_activity_log (
      user_id,
      activity_type,
      description,
      metadata
    ) VALUES (
      admin_user_id,
      'system_reset',
      'All wallet balances and points reset to zero',
      jsonb_build_object(
        'reset_type', 'wallets',
        'timestamp', NOW()
      )
    );
  END IF;
END $$;

-- ============================================================================
-- STEP 4: VERIFICATION QUERIES
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
       COALESCE(SUM(pi.kilograms * m.rate_per_kg), 0) as value
FROM public.pickup_items pi
JOIN public.materials m ON pi.material_id = m.id
UNION ALL
SELECT 'REMAINING VALUES CHECK', 'Total wallet balance', COALESCE(SUM(balance), 0)
FROM public.wallets;

-- ============================================================================
-- STEP 5: FINAL CONFIRMATION
-- ============================================================================

SELECT 'RESET COMPLETE' as status,
       'All values, amounts, and kgs have been reset to zero' as message,
       NOW() as reset_timestamp;

-- Show what was reset
SELECT 'RESET SUMMARY' as summary_type,
       'Pickup Items' as item_type,
       COUNT(*) as total_items,
       'All kilograms and contamination percentages set to 0' as description
FROM public.pickup_items
UNION ALL
SELECT 'RESET SUMMARY', 'Wallets', COUNT(*), 'All balances and points set to 0'
FROM public.wallets;
