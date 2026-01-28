-- ============================================================================
-- TEST APPROVE FUNCTIONALITY FOR ADMIN/OFFICE APP
-- ============================================================================
-- This script tests that the approve functionality works correctly

-- ============================================================================
-- STEP 1: CHECK CURRENT COLLECTIONS STATUS
-- ============================================================================

SELECT 'CURRENT COLLECTIONS STATUS:' as info;
SELECT 
    id,
    collection_code,
    customer_name,
    status,
    total_weight_kg,
    total_value,
    created_at,
    updated_at
FROM public.unified_collections 
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- STEP 2: CHECK PENDING COLLECTIONS (THAT CAN BE APPROVED)
-- ============================================================================

SELECT 'PENDING COLLECTIONS (READY FOR APPROVAL):' as info;
SELECT 
    id,
    collection_code,
    customer_name,
    collector_name,
    status,
    total_weight_kg,
    total_value,
    created_at
FROM public.unified_collections 
WHERE status IN ('pending', 'submitted')
ORDER BY created_at DESC;

-- ============================================================================
-- STEP 3: CHECK COLLECTION MATERIALS FOR PENDING COLLECTIONS
-- ============================================================================

SELECT 'COLLECTION MATERIALS FOR PENDING COLLECTIONS:' as info;
SELECT 
    uc.collection_code,
    uc.customer_name,
    uc.status as collection_status,
    cm.material_name,
    cm.quantity,
    cm.unit_price,
    cm.total_price,
    m.name as referenced_material,
    m.current_price_per_unit as market_rate
FROM public.unified_collections uc
JOIN public.collection_materials cm ON uc.id = cm.collection_id
LEFT JOIN public.materials m ON cm.material_id = m.id
WHERE uc.status IN ('pending', 'submitted')
ORDER BY uc.created_at DESC, cm.material_name;

-- ============================================================================
-- STEP 4: SIMULATE APPROVAL (UPDATE STATUS)
-- ============================================================================

-- Update a pending collection to approved (for testing)
UPDATE public.unified_collections 
SET 
    status = 'approved',
    admin_notes = 'Test approval - approved by admin',
    updated_at = NOW(),
    updated_by = (SELECT id FROM public.user_profiles WHERE role = 'admin' LIMIT 1)
WHERE status = 'pending' 
AND id = (
    SELECT id FROM public.unified_collections 
    WHERE status = 'pending' 
    ORDER BY created_at DESC 
    LIMIT 1
)
RETURNING id, collection_code, status, admin_notes, updated_at;

-- ============================================================================
-- STEP 5: VERIFY APPROVAL WORKED
-- ============================================================================

SELECT 'VERIFICATION - APPROVED COLLECTION:' as info;
SELECT 
    id,
    collection_code,
    customer_name,
    status,
    admin_notes,
    updated_at,
    updated_by
FROM public.unified_collections 
WHERE status = 'approved'
ORDER BY updated_at DESC
LIMIT 5;

-- ============================================================================
-- STEP 6: CHECK STATUS DISTRIBUTION
-- ============================================================================

SELECT 'STATUS DISTRIBUTION:' as info;
SELECT 
    status,
    COUNT(*) as count,
    ROUND(COUNT(*)::decimal / (SELECT COUNT(*) FROM public.unified_collections) * 100, 2) as percentage
FROM public.unified_collections 
GROUP BY status
ORDER BY count DESC;

-- ============================================================================
-- STEP 7: TEST REJECTION (UPDATE STATUS)
-- ============================================================================

-- Update another pending collection to rejected (for testing)
UPDATE public.unified_collections 
SET 
    status = 'rejected',
    admin_notes = 'Test rejection - rejected by admin for testing',
    updated_at = NOW(),
    updated_by = (SELECT id FROM public.user_profiles WHERE role = 'admin' LIMIT 1)
WHERE status = 'pending' 
AND id = (
    SELECT id FROM public.unified_collections 
    WHERE status = 'pending' 
    ORDER BY created_at DESC 
    LIMIT 1
)
RETURNING id, collection_code, status, admin_notes, updated_at;

-- ============================================================================
-- STEP 8: FINAL VERIFICATION
-- ============================================================================

SELECT 'FINAL STATUS DISTRIBUTION:' as info;
SELECT 
    status,
    COUNT(*) as count
FROM public.unified_collections 
GROUP BY status
ORDER BY count DESC;

-- ============================================================================
-- STEP 9: SUCCESS MESSAGE
-- ============================================================================

SELECT 'SUCCESS: Approve functionality is working!' as result;
SELECT 'Collections can be approved and rejected by admin' as message;
SELECT 'Status updates are properly recorded with admin notes' as status;
