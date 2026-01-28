-- ============================================================================
-- DEBUG WALLET BACKFILL ISSUE
-- ============================================================================
-- This script investigates why the wallet backfill didn't work

-- Check what pickup statuses exist
SELECT 'PICKUP STATUSES' as check_type,
       status,
       COUNT(*) as count
FROM public.pickups
GROUP BY status
ORDER BY count DESC;

-- Check if there are any approved pickups at all
SELECT 'APPROVED PICKUPS CHECK' as check_type,
       COUNT(*) as total_approved_pickups,
       COUNT(DISTINCT user_id) as unique_customers_with_approved_pickups
FROM public.pickups
WHERE status = 'approved';

-- Check if there are any pickups with user_id (not customer_id)
SELECT 'PICKUP USER_ID CHECK' as check_type,
       COUNT(*) as total_pickups,
       COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as pickups_with_user_id,
       COUNT(CASE WHEN user_id IS NULL THEN 1 END) as pickups_without_user_id
FROM public.pickups;

-- Check if there are any pickups with customer_id instead of user_id
SELECT 'PICKUP CUSTOMER_ID CHECK' as check_type,
       COUNT(*) as total_pickups,
       COUNT(CASE WHEN customer_id IS NOT NULL THEN 1 END) as pickups_with_customer_id,
       COUNT(CASE WHEN customer_id IS NULL THEN 1 END) as pickups_without_customer_id
FROM public.pickups;

-- Check the actual structure of the pickups table
SELECT 'PICKUPS TABLE STRUCTURE' as check_type,
       column_name,
       data_type,
       is_nullable
FROM information_schema.columns
WHERE table_name = 'pickups'
ORDER BY ordinal_position;

-- Check if there are any pickup_items with data
SELECT 'PICKUP ITEMS CHECK' as check_type,
       COUNT(*) as total_pickup_items,
       COUNT(CASE WHEN kilograms > 0 THEN 1 END) as items_with_kilograms,
       SUM(kilograms) as total_kilograms
FROM public.pickup_items;

-- Check if there are any materials with rates
SELECT 'MATERIALS CHECK' as check_type,
       COUNT(*) as total_materials,
       COUNT(CASE WHEN rate_per_kg > 0 THEN 1 END) as materials_with_rates,
       AVG(rate_per_kg) as average_rate
FROM public.materials;

-- Check if there are any customers with role = 'CUSTOMER'
SELECT 'CUSTOMER PROFILES CHECK' as check_type,
       COUNT(*) as total_customers,
       COUNT(CASE WHEN role = 'CUSTOMER' THEN 1 END) as customers_with_role,
       COUNT(CASE WHEN role != 'CUSTOMER' THEN 1 END) as customers_without_role
FROM public.profiles
WHERE role = 'CUSTOMER';

-- Check if there are any customers with role = 'customer' (lowercase)
SELECT 'LOWERCASE CUSTOMER CHECK' as check_type,
       COUNT(*) as total_customers,
       COUNT(CASE WHEN role = 'customer' THEN 1 END) as customers_with_lowercase_role
FROM public.profiles
WHERE role = 'customer';

-- Check what roles actually exist in profiles
SELECT 'EXISTING ROLES' as check_type,
       role,
       COUNT(*) as count
FROM public.profiles
GROUP BY role
ORDER BY count DESC;

-- Check if there are any pickups that can actually be processed
SELECT 'PICKUP PROCESSING CHECK' as check_type,
       p.id as pickup_id,
       p.status,
       p.user_id,
       p.customer_id,
       pr.role as customer_role,
       pr.full_name as customer_name,
       COUNT(pi.id) as pickup_items_count,
       SUM(pi.kilograms) as total_kg,
       SUM(pi.kilograms * m.rate_per_kg) as calculated_value
FROM public.pickups p
LEFT JOIN public.profiles pr ON (p.user_id = pr.id OR p.customer_id = pr.id)
LEFT JOIN public.pickup_items pi ON p.id = pi.pickup_id
LEFT JOIN public.materials m ON pi.material_id = m.id
WHERE p.status = 'approved'
GROUP BY p.id, p.status, p.user_id, p.customer_id, pr.role, pr.full_name
ORDER BY calculated_value DESC
LIMIT 10;

-- Check if the backfill function actually exists and can be called
SELECT 'BACKFILL FUNCTION CHECK' as check_type,
       routine_name,
       routine_type,
       routine_definition
FROM information_schema.routines
WHERE routine_name = 'backfill_wallet_balances';

-- Test the backfill function manually with a simple case
SELECT 'MANUAL BACKFILL TEST' as check_type,
       'Testing backfill function...' as status;

-- Try to call the backfill function and see what happens
SELECT * FROM public.backfill_wallet_balances();
