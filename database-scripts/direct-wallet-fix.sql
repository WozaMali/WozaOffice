-- ============================================================================
-- DIRECT WALLET FIX
-- ============================================================================
-- This script directly calculates and sets wallet balances based on actual data
-- No complex functions, just direct SQL to get the job done

-- ============================================================================
-- STEP 1: CHECK WHAT WE'RE WORKING WITH
-- ============================================================================

-- See what pickup statuses exist
SELECT 'PICKUP STATUSES' as info, status, COUNT(*) as count
FROM public.pickups 
GROUP BY status;

-- See what columns exist in pickups table
SELECT 'PICKUPS COLUMNS' as info, column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'pickups' 
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 2: CREATE WALLET RECORDS FOR ALL CUSTOMERS
-- ============================================================================

-- First, let's see what roles exist
SELECT 'EXISTING ROLES' as info, role, COUNT(*) as count
FROM public.profiles 
GROUP BY role;

-- Create wallet records for customers (try both uppercase and lowercase)
INSERT INTO public.wallets (user_id, balance, total_points, tier, created_at, updated_at)
SELECT 
  p.id as user_id,
  0.00 as balance,
  0 as total_points,
  'Bronze Recycler' as tier,
  NOW() as created_at,
  NOW() as updated_at
FROM public.profiles p
WHERE (p.role = 'CUSTOMER' OR p.role = 'customer')
  AND NOT EXISTS (SELECT 1 FROM public.wallets w WHERE w.user_id = p.id);

-- ============================================================================
-- STEP 3: CALCULATE AND SET WALLET BALANCES
-- ============================================================================

-- Let's see what the actual data looks like
SELECT 'DATA ANALYSIS' as info,
       'Total pickups' as metric, COUNT(*) as value
FROM public.pickups
UNION ALL
SELECT 'DATA ANALYSIS', 'Approved pickups', COUNT(*)
FROM public.pickups WHERE status = 'approved'
UNION ALL
SELECT 'DATA ANALYSIS', 'Pickups with user_id', COUNT(*)
FROM public.pickups WHERE user_id IS NOT NULL
UNION ALL
SELECT 'DATA ANALYSIS', 'Pickups with customer_id', COUNT(*)
FROM public.pickups WHERE customer_id IS NOT NULL;

-- Now let's calculate wallet balances directly
-- First, let's see what we can calculate from pickup_items
SELECT 'PICKUP ITEMS ANALYSIS' as info,
       COUNT(*) as total_items,
       SUM(kilograms) as total_kg,
       COUNT(DISTINCT pickup_id) as unique_pickups
FROM public.pickup_items;

-- Let's see what materials we have
SELECT 'MATERIALS ANALYSIS' as info,
       COUNT(*) as total_materials,
       AVG(rate_per_kg) as avg_rate,
       MIN(rate_per_kg) as min_rate,
       MAX(rate_per_kg) as max_rate
FROM public.materials;

-- ============================================================================
-- STEP 4: DIRECT WALLET CALCULATION
-- ============================================================================

-- Calculate wallet balances directly from the data
-- This approach doesn't rely on complex functions

-- First, let's see what the customer dashboard calculation would show
SELECT 'CUSTOMER DASHBOARD CALCULATION' as info,
       p.full_name,
       p.role,
       COUNT(pk.id) as total_pickups,
       SUM(COALESCE(pi.kilograms, 0)) as total_kg,
       SUM(COALESCE(pi.kilograms * m.rate_per_kg, 0)) as total_value,
       ROUND(SUM(COALESCE(pi.kilograms * m.rate_per_kg, 0)) * 0.3, 2) as calculated_wallet_30_percent
FROM public.profiles p
LEFT JOIN public.pickups pk ON (p.id = pk.user_id OR p.id = pk.customer_id)
LEFT JOIN public.pickup_items pi ON pk.id = pi.pickup_id
LEFT JOIN public.materials m ON pi.material_id = m.id
WHERE (p.role = 'CUSTOMER' OR p.role = 'customer')
GROUP BY p.id, p.full_name, p.role
HAVING SUM(COALESCE(pi.kilograms * m.rate_per_kg, 0)) > 0
ORDER BY calculated_wallet_30_percent DESC;

-- Now let's update the actual wallet balances
-- We'll do this step by step to avoid any issues

-- Update wallets for customers with approved pickups
UPDATE public.wallets w
SET 
  balance = (
    SELECT COALESCE(SUM(pi.kilograms * m.rate_per_kg), 0) * 0.3
    FROM public.pickups pk
    JOIN public.pickup_items pi ON pk.id = pi.pickup_id
    JOIN public.materials m ON pi.material_id = m.id
    WHERE pk.status = 'approved'
      AND (pk.user_id = w.user_id OR pk.customer_id = w.user_id)
  ),
  updated_at = NOW()
WHERE EXISTS (
  SELECT 1 FROM public.pickups pk
  WHERE pk.status = 'approved'
    AND (pk.user_id = w.user_id OR pk.customer_id = w.user_id)
);

-- ============================================================================
-- STEP 5: VERIFICATION
-- ============================================================================

-- Check the results
SELECT 'WALLET BALANCES AFTER DIRECT FIX' as check_type,
       COUNT(*) as total_wallets,
       COUNT(CASE WHEN balance > 0 THEN 1 END) as wallets_with_balance,
       SUM(balance) as total_balance,
       AVG(balance) as average_balance
FROM public.wallets;

-- Show individual wallet balances
SELECT 'INDIVIDUAL WALLET BALANCES' as check_type,
       p.full_name,
       p.role,
       w.balance as wallet_balance,
       -- Show what customer dashboard would calculate
       ROUND(SUM(COALESCE(pi.kilograms * m.rate_per_kg, 0)) * 0.3, 2) as dashboard_calculation
FROM public.wallets w
JOIN public.profiles p ON w.user_id = p.id
LEFT JOIN public.pickups pk ON (p.id = pk.user_id OR p.id = pk.customer_id)
LEFT JOIN public.pickup_items pi ON pk.id = pi.pickup_id
LEFT JOIN public.materials m ON pi.material_id = m.id
GROUP BY p.id, p.full_name, p.role, w.balance
ORDER BY w.balance DESC;
