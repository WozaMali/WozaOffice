-- ============================================================================
-- FIX PENDING PICKUPS
-- ============================================================================
-- This script fixes the 2 pending pickups that need approval

-- ============================================================================
-- STEP 1: CHECK PENDING PICKUPS DETAILS
-- ============================================================================

SELECT 'PENDING PICKUPS DETAILS:' as info;
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
WHERE status = 'pending'
ORDER BY created_at DESC;

-- ============================================================================
-- STEP 2: CHECK COLLECTION MATERIALS FOR THESE PICKUPS
-- ============================================================================

SELECT 'COLLECTION MATERIALS FOR PENDING PICKUPS:' as info;
SELECT 
    cm.collection_id,
    cm.material_name,
    cm.quantity,
    cm.unit_price,
    cm.quantity * cm.unit_price as calculated_total
FROM public.collection_materials cm
WHERE cm.collection_id IN (
    SELECT id FROM public.unified_collections WHERE status = 'pending'
)
ORDER BY cm.collection_id, cm.material_name;

-- ============================================================================
-- STEP 3: RECALCULATE TOTALS FOR PENDING PICKUPS
-- ============================================================================

-- Update the total_value for the first pickup (COL-2025-9251)
UPDATE public.unified_collections 
SET 
    total_value = (
        SELECT COALESCE(SUM(quantity * unit_price), 0)
        FROM public.collection_materials 
        WHERE collection_id = '5e496a8d-8097-4860-8458-fff890ddf2c5'
    ),
    updated_at = NOW()
WHERE id = '5e496a8d-8097-4860-8458-fff890ddf2c5';

-- Update the total_value for the second pickup (COL-2025-6443)
UPDATE public.unified_collections 
SET 
    total_value = (
        SELECT COALESCE(SUM(quantity * unit_price), 0)
        FROM public.collection_materials 
        WHERE collection_id = '39965678-c96c-4e40-b173-b94d9071ef6e'
    ),
    updated_at = NOW()
WHERE id = '39965678-c96c-4e40-b173-b94d9071ef6e';

-- ============================================================================
-- STEP 4: VERIFY UPDATED TOTALS
-- ============================================================================

SELECT 'UPDATED PICKUPS WITH CORRECTED TOTALS:' as info;
SELECT 
    id,
    collection_code,
    customer_name,
    status,
    total_weight_kg,
    total_value,
    updated_at
FROM public.unified_collections
WHERE status = 'pending'
ORDER BY created_at DESC;

-- ============================================================================
-- STEP 5: CHECK IF WALLET FUNCTION EXISTS
-- ============================================================================

SELECT 'WALLET FUNCTION CHECK:' as info;
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_name = 'update_wallet_simple' 
            AND routine_schema = 'public'
        ) THEN 'update_wallet_simple function exists'
        ELSE 'update_wallet_simple function does not exist'
    END as function_status;

-- ============================================================================
-- STEP 6: SUCCESS MESSAGE
-- ============================================================================

SELECT 'SUCCESS: Pending pickups updated with correct totals!' as result;
SELECT 'You can now approve these pickups from the admin dashboard' as message;
SELECT 'The wallet update should work now that totals are calculated' as status;
