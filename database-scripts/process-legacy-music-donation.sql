-- Process Legacy Music's PET donation now that permissions are fixed

-- Step 1: Add the transaction record
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
) VALUES (
    'pet_donation',
    'collection',
    9.00,
    'PET material donation from COL-2025-9251 - Plastic Bottles (6kg)',
    'Legacy Music',
    'legacymusicsa@gmail.com',
    'general_fund',
    NULL,
    'confirmed'
);

-- Step 2: Update the fund balance
UPDATE green_scholar_fund_balance 
SET 
    total_balance = total_balance + 9.00,
    pet_donations_total = pet_donations_total + 9.00,
    last_updated = NOW()
WHERE id = 1;

-- Step 3: Show the results
SELECT 'Legacy Music PET Donation Processed:' as info;
SELECT 
    total_balance,
    pet_donations_total,
    direct_donations_total,
    expenses_total,
    last_updated
FROM green_scholar_fund_balance;

SELECT 'New Transaction Created:' as info;
SELECT 
    transaction_type,
    amount,
    description,
    donor_name,
    status,
    created_at
FROM green_scholar_transactions
ORDER BY created_at DESC
LIMIT 1;
