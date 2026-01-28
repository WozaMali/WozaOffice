-- Test access to Green Scholar Fund tables
-- This should work after running the permissions fix

-- Test 1: Check fund balance
SELECT 'Fund Balance Test:' as test;
SELECT 
    total_balance,
    pet_donations_total,
    direct_donations_total,
    expenses_total
FROM green_scholar_fund_balance;

-- Test 2: Check transactions
SELECT 'Transactions Test:' as test;
SELECT 
    transaction_type,
    amount,
    description,
    donor_name,
    created_at
FROM green_scholar_transactions
ORDER BY created_at DESC
LIMIT 5;

-- Test 3: Check schools
SELECT 'Schools Test:' as test;
SELECT 
    name,
    school_code,
    city,
    student_count
FROM schools
WHERE is_active = true
LIMIT 5;

-- Test 4: Check child homes
SELECT 'Child Homes Test:' as test;
SELECT 
    name,
    home_code,
    city,
    children_count
FROM child_headed_homes
WHERE is_active = true
LIMIT 5;
