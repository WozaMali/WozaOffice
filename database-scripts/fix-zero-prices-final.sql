-- Fix zero prices for recent collections
-- First, let's see the current state
SELECT 'Current collection materials with zero prices:' as info;
SELECT 
    uc.collection_code,
    cm.material_name,
    cm.quantity,
    cm.unit_price,
    cm.total_price
FROM public.unified_collections uc
JOIN public.collection_materials cm ON uc.id = cm.collection_id
WHERE uc.status = 'pending' 
AND cm.unit_price = 0.00
ORDER BY uc.created_at DESC;

-- Update the unit prices based on material type
-- Aluminium Cans: 18.55 per kg
UPDATE public.collection_materials 
SET unit_price = 18.55
WHERE material_name = 'Aluminium Cans' 
AND unit_price = 0.00;

-- Plastic Bottles (PET): 1.50 per kg
UPDATE public.collection_materials 
SET unit_price = 1.50
WHERE material_name = 'Plastic Bottles' 
AND unit_price = 0.00;

-- Now update the unified_collections total values
UPDATE public.unified_collections 
SET 
    total_value = subquery.total_value,
    total_weight_kg = subquery.total_weight
FROM (
    SELECT 
        collection_id,
        SUM(quantity) as total_weight,
        SUM(total_price) as total_value
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

-- Show the updated materials
SELECT 'Updated collection materials:' as info;
SELECT 
    uc.collection_code,
    cm.material_name,
    cm.quantity,
    cm.unit_price,
    cm.total_price
FROM public.unified_collections uc
JOIN public.collection_materials cm ON uc.id = cm.collection_id
WHERE uc.status = 'pending'
ORDER BY uc.created_at DESC, cm.material_name;
