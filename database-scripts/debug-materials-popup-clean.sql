-- ============================================================================
-- DEBUG MATERIALS POPUP ISSUE - CLEAN VERSION
-- ============================================================================
-- This script helps debug why materials aren't showing in the live collection popup

-- 1. Check materials table structure
-- ============================================================================

SELECT 
  'Materials table structure:' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'materials'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 1b. Show sample data to see what columns actually exist
-- ============================================================================

SELECT 'Sample materials data:' as info, * FROM public.materials LIMIT 3;

-- 2. Check if materials are active
-- ============================================================================

SELECT 
  'Active materials count:' as info,
  COUNT(*) as total
FROM public.materials
WHERE active = true;

-- 3. Show sample materials that should appear in popup
-- ============================================================================

SELECT 
  m.id,
  m.name,
  c.name as category,
  m.current_price_per_unit,
  m.unit,
  m.active
FROM public.materials m
LEFT JOIN public.material_categories c ON m.category_id = c.id
WHERE m.active = true
ORDER BY c.name, m.name
LIMIT 10;

-- 4. Check RLS policies on materials table
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'materials'
AND schemaname = 'public';

-- 5. Test if we can select materials (simulate what the popup does)
-- ============================================================================

SELECT 
  m.id, 
  m.name, 
  m.current_price_per_unit,
  m.unit,
  c.name as category
FROM public.materials m
LEFT JOIN public.material_categories c ON m.category_id = c.id
WHERE m.active = true
ORDER BY c.name, m.name;

-- 6. Check if there are any constraints or issues
-- ============================================================================

SELECT 
  'Materials table status:' as info,
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.materials WHERE active = true) 
    THEN 'Has active materials'
    ELSE 'No active materials found'
  END as status;
