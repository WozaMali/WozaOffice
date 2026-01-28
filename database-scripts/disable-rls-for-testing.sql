-- Temporarily disable RLS for testing purposes
-- This allows us to test the system without authentication

-- Disable RLS on materials table
ALTER TABLE public.materials DISABLE ROW LEVEL SECURITY;

-- Disable RLS on collections table  
ALTER TABLE public.collections DISABLE ROW LEVEL SECURITY;

-- Grant full access to authenticated and anon users
GRANT ALL ON public.materials TO authenticated;
GRANT ALL ON public.materials TO anon;
GRANT ALL ON public.collections TO authenticated;
GRANT ALL ON public.collections TO anon;

-- Grant access to views
GRANT ALL ON public.collection_details TO authenticated;
GRANT ALL ON public.collection_details TO anon;
GRANT ALL ON public.collector_stats TO authenticated;
GRANT ALL ON public.collector_stats TO anon;
GRANT ALL ON public.green_scholar_fund_summary TO authenticated;
GRANT ALL ON public.green_scholar_fund_summary TO anon;

-- Test access
SELECT 'Testing materials access...' as info;
SELECT COUNT(*) as materials_count FROM public.materials;

SELECT 'Testing collections access...' as info;
SELECT COUNT(*) as collections_count FROM public.collections;

-- Show materials data
SELECT 'Materials available:' as info;
SELECT name, unit_price, is_active FROM public.materials ORDER BY name;

-- Test views
SELECT 'Testing collection_details view...' as info;
SELECT COUNT(*) as count FROM public.collection_details;

SELECT 'Testing collector_stats view...' as info;
SELECT COUNT(*) as count FROM public.collector_stats;

SELECT 'Testing green_scholar_fund_summary view...' as info;
SELECT COUNT(*) as count FROM public.green_scholar_fund_summary;

SELECT '✅ RLS disabled for testing - system should now be accessible!' as status;
