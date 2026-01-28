-- Simple script to add Legacy Music's PET donation
-- This should work without syntax errors

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
