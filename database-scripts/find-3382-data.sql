-- Find where the 3,382.50 value is coming from
-- Check all possible tables that might contain revenue data

-- 1. Check collections table (not unified_collections)
SELECT 'COLLECTIONS_TABLE' as source;
SELECT 
    COUNT(*) as total_records,
    SUM(COALESCE(weight_kg * 5, 0)) as total_revenue_estimated
FROM public.collections
WHERE status IN ('approved', 'completed');

-- 2. Check pickups table
SELECT 'PICKUPS_TABLE' as source;
SELECT 
    COUNT(*) as total_records,
    SUM(COALESCE(weight_kg * 5, 0)) as total_revenue_estimated
FROM public.pickups
WHERE status IN ('approved', 'completed');

-- 3. Check pickup_items table
SELECT 'PICKUP_ITEMS_TABLE' as source;
SELECT 
    COUNT(*) as total_records,
    SUM(COALESCE(kilograms * 5, 0)) as total_revenue_estimated
FROM public.pickup_items;

-- 4. Check if there are any other transaction tables
SELECT 'ALL_TABLES_WITH_AMOUNT' as source;
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE column_name IN ('amount', 'total_value', 'computed_value', 'value')
AND table_schema = 'public'
ORDER BY table_name;

-- 5. Check collection_materials table
SELECT 'COLLECTION_MATERIALS_TABLE' as source;
SELECT 
    COUNT(*) as total_records,
    SUM(COALESCE(quantity * unit_price, 0)) as total_revenue
FROM public.collection_materials;

-- 6. Check if there's a system_impact_view or similar view
SELECT 'SYSTEM_IMPACT_VIEW' as source;
SELECT 
    COUNT(*) as total_records,
    SUM(COALESCE(total_value_generated, 0)) as total_revenue
FROM public.system_impact_view;
