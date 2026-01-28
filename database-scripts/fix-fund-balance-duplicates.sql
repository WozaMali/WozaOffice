-- Fix duplicate fund balance records
-- First, let's see what we have
SELECT 'Current Fund Balance Records:' as info;
SELECT id, total_balance, pet_donations_total, direct_donations_total, expenses_total, last_updated
FROM green_scholar_fund_balance
ORDER BY last_updated DESC;

-- Delete all records and create a single one
DELETE FROM green_scholar_fund_balance;

-- Insert a single fund balance record
INSERT INTO green_scholar_fund_balance (
    id,
    total_balance,
    pet_donations_total,
    direct_donations_total,
    expenses_total,
    last_updated
) VALUES (
    gen_random_uuid(),
    9.00,  -- Legacy Music's PET donation
    9.00,  -- PET donations total
    0.00,  -- Direct donations total
    0.00,  -- Expenses total
    NOW()
);

-- Verify we have only one record
SELECT 'Fixed Fund Balance:' as info;
SELECT 
    total_balance,
    pet_donations_total,
    direct_donations_total,
    expenses_total,
    last_updated
FROM green_scholar_fund_balance;
