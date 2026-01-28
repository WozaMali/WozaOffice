-- Process existing PET donations from approved collections
-- This will backfill the Green Scholar Fund with PET contributions

-- First, let's create a function to process PET donations
CREATE OR REPLACE FUNCTION process_pet_donations_for_existing_collections()
RETURNS TABLE(
    collection_id UUID,
    collection_code TEXT,
    customer_name TEXT,
    material_name TEXT,
    weight_kg NUMERIC,
    total_value NUMERIC,
    green_scholar_contribution NUMERIC,
    user_wallet_contribution NUMERIC
) AS $$
BEGIN
    -- Process all approved collections with PET materials
    RETURN QUERY
    SELECT 
        uc.id as collection_id,
        uc.collection_code,
        uc.customer_name,
        cm.material_name,
        cm.quantity as weight_kg,
        cm.total_price as total_value,
        CASE 
            WHEN LOWER(cm.material_name) LIKE '%plastic%' OR LOWER(cm.material_name) LIKE '%pet%'
            THEN cm.total_price  -- 100% of PET goes to Green Scholar Fund
            ELSE 0
        END as green_scholar_contribution,
        CASE 
            WHEN LOWER(cm.material_name) LIKE '%plastic%' OR LOWER(cm.material_name) LIKE '%pet%'
            THEN 0  -- 0% of PET goes to user wallet
            ELSE cm.total_price  -- 100% of other materials go to user wallet
        END as user_wallet_contribution
    FROM unified_collections uc
    JOIN collection_materials cm ON uc.id = cm.collection_id
    WHERE uc.status = 'approved'
    AND uc.customer_name = 'Legacy Music'
    ORDER BY uc.created_at DESC, cm.material_name;
END;
$$ LANGUAGE plpgsql;

-- Now let's see what PET donations we have
SELECT 'PET Donations from Legacy Music:' as info;
SELECT * FROM process_pet_donations_for_existing_collections();

-- Let's manually add the PET donations to the Green Scholar Fund
-- First, add the transaction record
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
    green_scholar_contribution as amount,
    'PET material donation from ' || collection_code as description,
    customer_name as donor_name,
    'legacymusicsa@gmail.com' as donor_email,
    'general' as beneficiary_type,
    NULL as beneficiary_id,
    'completed' as status
FROM process_pet_donations_for_existing_collections()
WHERE green_scholar_contribution > 0;

-- Update the fund balance
UPDATE green_scholar_fund_balance 
SET 
    total_balance = total_balance + (
        SELECT COALESCE(SUM(green_scholar_contribution), 0)
        FROM process_pet_donations_for_existing_collections()
        WHERE green_scholar_contribution > 0
    ),
    pet_donations_total = pet_donations_total + (
        SELECT COALESCE(SUM(green_scholar_contribution), 0)
        FROM process_pet_donations_for_existing_collections()
        WHERE green_scholar_contribution > 0
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

-- Show the transactions we just created
SELECT 'New Green Scholar Transactions:' as info;
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
LIMIT 5;
