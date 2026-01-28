-- ============================================================================
-- FIND ALL PICKUPS THAT NEED APPROVAL
-- ============================================================================
-- This script finds all pickups regardless of status

-- ============================================================================
-- STEP 1: CHECK ALL COLLECTION STATUSES
-- ============================================================================

SELECT 'ALL COLLECTION STATUSES:' as info;
SELECT 
    status,
    COUNT(*) as count
FROM public.unified_collections
GROUP BY status
ORDER BY count DESC;

-- ============================================================================
-- STEP 2: SHOW ALL COLLECTIONS (RECENT FIRST)
-- ============================================================================

SELECT 'ALL COLLECTIONS (RECENT FIRST):' as info;
SELECT 
    id,
    collection_code,
    customer_name,
    customer_email,
    status,
    total_weight_kg,
    total_value,
    created_at,
    updated_at,
    admin_notes
FROM public.unified_collections
ORDER BY created_at DESC;

-- ============================================================================
-- STEP 3: CHECK FOR DIFFERENT STATUS VALUES
-- ============================================================================

SELECT 'DISTINCT STATUS VALUES:' as info;
SELECT DISTINCT status
FROM public.unified_collections
ORDER BY status;

-- ============================================================================
-- STEP 4: CHECK FOR COLLECTIONS WITHOUT STATUS
-- ============================================================================

SELECT 'COLLECTIONS WITHOUT STATUS:' as info;
SELECT 
    id,
    collection_code,
    customer_name,
    customer_email,
    status,
    created_at
FROM public.unified_collections
WHERE status IS NULL OR status = '';

-- ============================================================================
-- STEP 5: CHECK FOR COLLECTIONS CREATED TODAY
-- ============================================================================

SELECT 'COLLECTIONS CREATED TODAY:' as info;
SELECT 
    id,
    collection_code,
    customer_name,
    customer_email,
    status,
    total_weight_kg,
    total_value,
    created_at
FROM public.unified_collections
WHERE created_at >= CURRENT_DATE
ORDER BY created_at DESC;

-- ============================================================================
-- STEP 6: CHECK FOR COLLECTIONS UPDATED TODAY
-- ============================================================================

SELECT 'COLLECTIONS UPDATED TODAY:' as info;
SELECT 
    id,
    collection_code,
    customer_name,
    customer_email,
    status,
    total_weight_kg,
    total_value,
    updated_at
FROM public.unified_collections
WHERE updated_at >= CURRENT_DATE
ORDER BY updated_at DESC;
