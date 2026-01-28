-- Create missing views for collections management
-- This script creates the views that were missing from the collections schema

-- 1. View for collection details with user and material info
CREATE OR REPLACE VIEW public.collection_details AS
SELECT 
    c.id,
    c.weight_kg,
    c.photo_url,
    c.status,
    c.notes,
    c.collection_date,
    c.created_at,
    c.updated_at,
    c.contributes_to_green_scholar_fund,
    c.green_scholar_fund_amount,
    -- Resident info
    CONCAT(u1.first_name, ' ', u1.last_name) as resident_name,
    u1.phone as resident_phone,
    u1.email as resident_email,
    -- Collector info
    CONCAT(u2.first_name, ' ', u2.last_name) as collector_name,
    u2.phone as collector_phone,
    u2.email as collector_email,
    -- Area info
    a.name as area_name,
    -- Material info
    m.name as material_name,
    m.description as material_description,
    m.unit_price,
    -- Calculated fields
    (c.weight_kg * m.unit_price) as estimated_value
FROM public.collections c
JOIN public.users u1 ON c.resident_id = u1.id
JOIN public.users u2 ON c.collector_id = u2.id
JOIN public.areas a ON c.area_id = a.id
JOIN public.materials m ON c.material_id = m.id;

-- 2. View for collector statistics
CREATE OR REPLACE VIEW public.collector_stats AS
SELECT 
    c.collector_id,
    CONCAT(u.first_name, ' ', u.last_name) as collector_name,
    COUNT(*) as total_collections,
    COUNT(*) FILTER (WHERE c.status = 'approved') as approved_collections,
    COUNT(*) FILTER (WHERE c.status = 'pending') as pending_collections,
    COUNT(*) FILTER (WHERE c.status = 'rejected') as rejected_collections,
    SUM(c.weight_kg) as total_weight_kg,
    SUM(c.weight_kg * m.unit_price) as total_estimated_value,
    SUM(c.green_scholar_fund_amount) as total_green_scholar_fund_contribution,
    AVG(c.weight_kg) as avg_weight_per_collection,
    MAX(c.collection_date) as last_collection_date
FROM public.collections c
JOIN public.users u ON c.collector_id = u.id
JOIN public.materials m ON c.material_id = m.id
GROUP BY c.collector_id, u.first_name, u.last_name;

-- 3. View for Green Scholar Fund tracking
CREATE OR REPLACE VIEW public.green_scholar_fund_summary AS
SELECT 
    DATE_TRUNC('month', collection_date) as month,
    SUM(green_scholar_fund_amount) as total_fund_amount,
    COUNT(DISTINCT resident_id) as unique_residents_contributing,
    COUNT(DISTINCT collector_id) as unique_collectors_contributing,
    COUNT(*) as total_pet_collections
FROM public.collections
WHERE contributes_to_green_scholar_fund = true AND status = 'approved'
GROUP BY month
ORDER BY month DESC;

-- 4. Grant permissions on views
GRANT SELECT ON public.collection_details TO authenticated;
GRANT SELECT ON public.collector_stats TO authenticated;
GRANT SELECT ON public.green_scholar_fund_summary TO authenticated;

-- 5. Test the views
SELECT 'Testing collection_details view...' as info;
SELECT COUNT(*) as count FROM public.collection_details;

SELECT 'Testing collector_stats view...' as info;
SELECT COUNT(*) as count FROM public.collector_stats;

SELECT 'Testing green_scholar_fund_summary view...' as info;
SELECT COUNT(*) as count FROM public.green_scholar_fund_summary;

-- 6. Show view information
SELECT 'Views created successfully:' as status;
SELECT schemaname, viewname 
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN ('collection_details', 'collector_stats', 'green_scholar_fund_summary')
ORDER BY viewname;
