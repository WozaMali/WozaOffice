-- Fix collection values for recent collections
-- First, let's see the current values
SELECT 'Current collection values:' as info;
SELECT 
    id,
    collection_code,
    customer_name,
    status,
    total_weight_kg,
    total_value,
    created_at
FROM public.unified_collections
WHERE status = 'pending'
ORDER BY created_at DESC;

-- Check if there are materials for these collections
SELECT 'Materials for pending collections:' as info;
SELECT 
    uc.collection_code,
    cm.material_id,
    m.name as material_name,
    cm.quantity,
    cm.weight_kg,
    cm.price_per_kg,
    (cm.quantity * cm.weight_kg * cm.price_per_kg) as calculated_value
FROM public.unified_collections uc
JOIN public.collection_materials cm ON uc.id = cm.collection_id
JOIN public.materials m ON cm.material_id = m.id
WHERE uc.status = 'pending'
ORDER BY uc.created_at DESC, cm.material_id;

-- Update the total values based on collection_materials
UPDATE public.unified_collections 
SET 
    total_weight_kg = subquery.total_weight,
    total_value = subquery.total_value
FROM (
    SELECT 
        collection_id,
        SUM(quantity * weight_kg) as total_weight,
        SUM(quantity * weight_kg * price_per_kg) as total_value
    FROM public.collection_materials
    WHERE collection_id IN (
        SELECT id FROM public.unified_collections WHERE status = 'pending'
    )
    GROUP BY collection_id
) as subquery
WHERE unified_collections.id = subquery.collection_id;

-- Verify the updated values
SELECT 'Updated collection values:' as info;
SELECT 
    id,
    collection_code,
    customer_name,
    status,
    total_weight_kg,
    total_value,
    created_at
FROM public.unified_collections
WHERE status = 'pending'
ORDER BY created_at DESC;
