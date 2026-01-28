-- Fix collections table permissions and RLS policies
-- This script ensures proper access to collections and materials tables

-- 1. Check current RLS status
SELECT 'Current RLS status:' as info;
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('materials', 'collections') AND schemaname = 'public';

-- 2. Enable RLS on both tables
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Materials are viewable by all authenticated users" ON public.materials;
DROP POLICY IF EXISTS "Users can view their own collections" ON public.collections;
DROP POLICY IF EXISTS "Collectors can create collections" ON public.collections;
DROP POLICY IF EXISTS "Office users can update collection status" ON public.collections;

-- 4. Create new policies for materials table
CREATE POLICY "Materials are viewable by all authenticated users" ON public.materials
    FOR SELECT USING (auth.role() = 'authenticated');

-- 5. Create new policies for collections table
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

-- 6. Grant permissions
GRANT SELECT ON public.materials TO authenticated;
GRANT SELECT ON public.materials TO anon;
GRANT SELECT ON public.collections TO authenticated;
GRANT INSERT ON public.collections TO authenticated;
GRANT UPDATE ON public.collections TO authenticated;

-- 7. Grant permissions on views
GRANT SELECT ON public.collection_details TO authenticated;
GRANT SELECT ON public.collector_stats TO authenticated;
GRANT SELECT ON public.green_scholar_fund_summary TO authenticated;

-- 8. Test access
SELECT 'Testing materials access...' as info;
SELECT COUNT(*) as materials_count FROM public.materials;

SELECT 'Testing collections access...' as info;
SELECT COUNT(*) as collections_count FROM public.collections;

-- 9. Show materials data
SELECT 'Materials available:' as info;
SELECT name, unit_price, is_active FROM public.materials ORDER BY name;

-- 10. Show collections structure
SELECT 'Collections table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'collections' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT '✅ Collections permissions fixed successfully!' as status;
