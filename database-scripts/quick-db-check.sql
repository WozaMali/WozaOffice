-- Quick database check for PET transactions
-- Run this in your Supabase SQL editor

-- 1. Check what transaction types exist
SELECT 
  transaction_type, 
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM green_scholar_transactions 
GROUP BY transaction_type 
ORDER BY count DESC;

-- 2. Check for PET-related transactions specifically
SELECT 
  id,
  transaction_type,
  amount,
  description,
  created_at
FROM green_scholar_transactions 
WHERE transaction_type IN ('pet_contribution', 'pet_donation')
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check if there are any collections with PET materials
SELECT 
  c.id as collection_id,
  c.status,
  c.created_at,
  COUNT(cm.id) as material_count,
  SUM(CASE WHEN LOWER(m.name) LIKE '%pet%' THEN cm.quantity ELSE 0 END) as pet_kg
FROM unified_collections c
LEFT JOIN collection_materials cm ON c.id = cm.collection_id
LEFT JOIN materials m ON cm.material_id = m.id
WHERE c.status IN ('approved', 'completed')
GROUP BY c.id, c.status, c.created_at
HAVING SUM(CASE WHEN LOWER(m.name) LIKE '%pet%' THEN cm.quantity ELSE 0 END) > 0
ORDER BY c.created_at DESC
LIMIT 5;

-- 4. Check the table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'green_scholar_transactions' 
ORDER BY ordinal_position;
