-- Process Legacy Music's PET donation manually
-- First, let's see what PET materials Legacy Music has

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

-- Calculate the total PET donation amount
SELECT 'Total PET Donation Amount:' as info;
SELECT 
    SUM(cm.total_price) as total_pet_donation
FROM unified_collections uc
JOIN collection_materials cm ON uc.id = cm.collection_id
WHERE uc.customer_name = 'Legacy Music'
AND uc.status = 'approved'
AND (LOWER(cm.material_name) LIKE '%plastic%' OR LOWER(cm.material_name) LIKE '%pet%');

-- Add the PET donation transaction
INSERT INTO green_scholar_transactions (
    transaction_type,
    source_type,
    amount,
    description,
    donor_name,
    donor_email,
    beneficiary_type,
    beneficiary_id,
    status
)
SELECT 
    'pet_donation' as transaction_type,
    'collection' as source_type,
    SUM(cm.total_price) as amount,
    'PET material donation from Legacy Music collections' as description,
    'Legacy Music' as donor_name,
    'legacymusicsa@gmail.com' as donor_email,
    'general' as beneficiary_type,
    NULL as beneficiary_id,
    'completed' as status
FROM unified_collections uc
JOIN collection_materials cm ON uc.id = cm.collection_id
WHERE uc.customer_name = 'Legacy Music'
AND uc.status = 'approved'
AND (LOWER(cm.material_name) LIKE '%plastic%' OR LOWER(cm.material_name) LIKE '%pet%');

-- Update the fund balance
UPDATE green_scholar_fund_balance 
SET 
    total_balance = total_balance + (
        SELECT COALESCE(SUM(cm.total_price), 0)
        FROM unified_collections uc
        JOIN collection_materials cm ON uc.id = cm.collection_id
        WHERE uc.customer_name = 'Legacy Music'
        AND uc.status = 'approved'
        AND (LOWER(cm.material_name) LIKE '%plastic%' OR LOWER(cm.material_name) LIKE '%pet%')
    ),
    pet_donations_total = pet_donations_total + (
        SELECT COALESCE(SUM(cm.total_price), 0)
        FROM unified_collections uc
        JOIN collection_materials cm ON uc.id = cm.collection_id
        WHERE uc.customer_name = 'Legacy Music'
        AND uc.status = 'approved'
        AND (LOWER(cm.material_name) LIKE '%plastic%' OR LOWER(cm.material_name) LIKE '%pet%')
    ),
    last_updated = NOW()
WHERE id = 1;

-- Show the updated fund balance
SELECT 'Updated Green Scholar Fund Balance:' as info;
SELECT 
    total_balance,
    pet_donations_total,
    direct_donations_total,
    expenses_total,
    last_updated
FROM green_scholar_fund_balance;

-- Show the new transaction
SELECT 'New Green Scholar Transaction:' as info;
SELECT 
    transaction_type,
    source_type,
    amount,
    description,
    donor_name,
    status,
    created_at
FROM green_scholar_transactions
ORDER BY created_at DESC
LIMIT 3;
