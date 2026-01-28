-- Step 1: Check Legacy Music's PET materials
SELECT 'Legacy Music PET Materials:' as info;
SELECT 
    uc.collection_code,
    uc.customer_name,
    cm.material_name,
    cm.quantity,
    cm.unit_price,
    cm.total_price
FROM unified_collections uc
JOIN collection_materials cm ON uc.id = cm.collection_id
WHERE uc.customer_name = 'Legacy Music'
AND uc.status = 'approved'
AND (LOWER(cm.material_name) LIKE '%plastic%' OR LOWER(cm.material_name) LIKE '%pet%')
ORDER BY uc.created_at DESC;
