-- Update the fund balance after adding the PET donation
UPDATE green_scholar_fund_balance 
SET 
    total_balance = total_balance + 9.00,
    pet_donations_total = pet_donations_total + 9.00,
    last_updated = NOW()
WHERE id = 1;

-- Show the updated balance
SELECT 'Updated Green Scholar Fund Balance:' as info;
SELECT 
    total_balance,
    pet_donations_total,
    direct_donations_total,
    expenses_total,
    last_updated
FROM green_scholar_fund_balance;
