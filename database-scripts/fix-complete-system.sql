-- Complete system fix for collections management
-- This script fixes all issues with materials, collections, and views

-- 1. Check current state
SELECT 'Current system state:' as info;
SELECT 'Materials count:' as info, COUNT(*) as count FROM public.materials;
SELECT 'Collections count:' as info, COUNT(*) as count FROM public.collections;

-- 2. Insert materials data if missing
INSERT INTO public.materials (name, description, unit_price) VALUES
('PET Bottles', 'Plastic bottles (PET) - funds go to Green Scholar Fund', 1.50),
('Aluminium Cans', 'Aluminium and tin cans', 18.55),
('Glass Bottles', 'Glass bottles and jars', 1.80),
('Paper & Cardboard', 'Newspapers, cardboard, and office paper', 1.20),
('Steel Cans', 'Steel food and beverage cans', 2.00),
('Electronic Waste', 'Small electronic devices and components', 5.00),
('Textiles', 'Clothing and fabric materials', 1.50),
('Organic Waste', 'Compostable organic materials', 0.50)
ON CONFLICT (name) DO NOTHING;

-- 3. Fix RLS policies
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Materials are viewable by all authenticated users" ON public.materials;
DROP POLICY IF EXISTS "Users can view their own collections" ON public.collections;
DROP POLICY IF EXISTS "Collectors can create collections" ON public.collections;
DROP POLICY IF EXISTS "Office users can update collection status" ON public.collections;

-- Create new policies
CREATE POLICY "Materials are viewable by all authenticated users" ON public.materials
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view their own collections" ON public.collections
    FOR SELECT USING (
        auth.uid() = resident_id OR 
        auth.uid() = collector_id OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role_id IN (
                SELECT id FROM public.roles 
                WHERE name IN ('admin', 'office', 'collector')
            )
        )
    );

CREATE POLICY "Collectors can create collections" ON public.collections
    FOR INSERT WITH CHECK (
        auth.uid() = collector_id AND
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role_id IN (
                SELECT id FROM public.roles 
                WHERE name = 'collector'
            )
        )
    );

CREATE POLICY "Office users can update collection status" ON public.collections
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role_id IN (
                SELECT id FROM public.roles 
                WHERE name IN ('admin', 'office')
            )
        )
    );

-- 4. Grant permissions
GRANT SELECT ON public.materials TO authenticated;
GRANT SELECT ON public.materials TO anon;
GRANT SELECT ON public.collections TO authenticated;
GRANT INSERT ON public.collections TO authenticated;
GRANT UPDATE ON public.collections TO authenticated;

-- 5. Grant permissions on views
GRANT SELECT ON public.collection_details TO authenticated;
GRANT SELECT ON public.collector_stats TO authenticated;
GRANT SELECT ON public.green_scholar_fund_summary TO authenticated;

-- 6. Test access
SELECT 'Testing materials access...' as info;
SELECT COUNT(*) as materials_count FROM public.materials;

SELECT 'Testing collections access...' as info;
SELECT COUNT(*) as collections_count FROM public.collections;

-- 7. Show materials data
SELECT 'Materials available:' as info;
SELECT name, unit_price, is_active FROM public.materials ORDER BY name;

-- 8. Test views
SELECT 'Testing collection_details view...' as info;
SELECT COUNT(*) as count FROM public.collection_details;

SELECT 'Testing collector_stats view...' as info;
SELECT COUNT(*) as count FROM public.collector_stats;

SELECT 'Testing green_scholar_fund_summary view...' as info;
SELECT COUNT(*) as count FROM public.green_scholar_fund_summary;

SELECT '✅ Complete system fix applied successfully!' as status;
