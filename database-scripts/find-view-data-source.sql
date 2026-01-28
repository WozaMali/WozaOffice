-- ============================================================================
-- FIND WHERE THE VIEW IS GETTING R15.00 FROM
-- ============================================================================
-- Since green_scholar_fund_balance is a view, we need to find the underlying data

-- ============================================================================
-- 1. CHECK THE VIEW DEFINITION
-- ============================================================================

SELECT '=== VIEW DEFINITION ===' as section;
SELECT 
    view_definition
FROM information_schema.views 
WHERE table_name = 'green_scholar_fund_balance';

-- ============================================================================
-- 2. CHECK ALL TABLES THAT MIGHT HAVE FUND DATA
-- ============================================================================

SELECT '=== ALL TABLES WITH FUND-RELATED COLUMNS ===' as section;
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE column_name ILIKE '%fund%' 
   OR column_name ILIKE '%green%' 
   OR column_name ILIKE '%scholar%'
   OR column_name ILIKE '%donation%'
   OR column_name ILIKE '%balance%'
   OR column_name ILIKE '%total%'
ORDER BY table_name, column_name;

-- ============================================================================
-- 3. CHECK COLLECTIONS TABLE (COMMON SOURCE)
-- ============================================================================

SELECT '=== COLLECTIONS TABLE ===' as section;
SELECT 
    'Collections table exists:' as info,
    CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'collections') 
         THEN 'YES' 
         ELSE 'NO' 
    END as exists;

-- If collections table exists, show its structure
SELECT 
    'Collections table columns:' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'collections'
ORDER BY column_name;

-- ============================================================================
-- 4. CHECK UNIFIED_COLLECTIONS TABLE
-- ============================================================================

SELECT '=== UNIFIED_COLLECTIONS TABLE ===' as section;
SELECT 
    'Unified collections table exists:' as info,
    CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'unified_collections') 
         THEN 'YES' 
         ELSE 'NO' 
    END as exists;

-- If unified_collections table exists, show its structure
SELECT 
    'Unified collections table columns:' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'unified_collections'
ORDER BY column_name;

-- ============================================================================
-- 5. CHECK FOR ANY DATA IN COLLECTIONS TABLES
-- ============================================================================

-- Check collections table data
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'collections') THEN
        RAISE NOTICE 'Checking collections table data...';
    ELSE
        RAISE NOTICE 'Collections table does not exist';
    END IF;
END $$;

-- Check unified_collections table data
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'unified_collections') THEN
        RAISE NOTICE 'Checking unified_collections table data...';
    ELSE
        RAISE NOTICE 'Unified collections table does not exist';
    END IF;
END $$;
