-- ============================================================================
-- TROUBLESHOOT MEMBER PAGE ISSUES
-- ============================================================================
-- This script will identify and fix issues preventing member names and addresses from showing

-- ============================================================================
-- STEP 1: DIAGNOSTIC CHECKS
-- ============================================================================

-- Check if the user_addresses table exists and has the right structure
SELECT 
    'Table Structure Check' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_addresses' AND table_schema = 'public') 
        THEN '✅ user_addresses table exists'
        ELSE '❌ user_addresses table missing'
    END as status;

-- Check if the view exists
SELECT 
    'View Existence Check' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'office_member_user_addresses_view' AND table_schema = 'public') 
        THEN '✅ office_member_user_addresses_view exists'
        ELSE '❌ office_member_user_addresses_view missing'
    END as status;

-- Check current data counts
SELECT 
    'Data Count Check' as check_type,
    (SELECT COUNT(*) FROM public.profiles WHERE role = 'member') as member_count,
    (SELECT COUNT(*) FROM public.user_addresses) as address_count,
    (SELECT COUNT(*) FROM public.wallets) as wallet_count,
    (SELECT COUNT(*) FROM public.office_member_user_addresses_view) as view_count;

-- ============================================================================
-- STEP 2: FORCE CREATE SAMPLE DATA
-- ============================================================================

-- Clear existing test data first
DELETE FROM public.user_addresses WHERE user_id IN (
    SELECT id FROM public.profiles WHERE email LIKE '%@example.com'
);
DELETE FROM public.wallets WHERE user_id IN (
    SELECT id FROM public.profiles WHERE email LIKE '%@example.com'
);
DELETE FROM public.profiles WHERE email LIKE '%@example.com';

-- Create fresh sample members
INSERT INTO public.profiles (
    id, email, full_name, first_name, last_name, phone, role, is_active, username, created_at, updated_at
) VALUES
    (gen_random_uuid(), 'john.doe@example.com', 'John Doe', 'John', 'Doe', '+27123456789', 'member', true, 'johndoe', NOW(), NOW()),
    (gen_random_uuid(), 'jane.smith@example.com', 'Jane Smith', 'Jane', 'Smith', '+27123456790', 'member', true, 'janesmith', NOW(), NOW()),
    (gen_random_uuid(), 'mike.johnson@example.com', 'Mike Johnson', 'Mike', 'Johnson', '+27123456791', 'member', true, 'mikejohnson', NOW(), NOW()),
    (gen_random_uuid(), 'sarah.wilson@example.com', 'Sarah Wilson', 'Sarah', 'Wilson', '+27123456792', 'member', true, 'sarahwilson', NOW(), NOW()),
    (gen_random_uuid(), 'david.brown@example.com', 'David Brown', 'David', 'Brown', '+27123456793', 'member', true, 'davidbrown', NOW(), NOW());

-- Create wallets for all members
INSERT INTO public.wallets (user_id, balance, total_points, tier, created_at, updated_at)
SELECT 
    p.id,
    ROUND((RANDOM() * 500 + 50)::numeric, 2),
    FLOOR(RANDOM() * 1000 + 100),
    CASE 
        WHEN FLOOR(RANDOM() * 1000 + 100) >= 1000 THEN 'Diamond Recycler'
        WHEN FLOOR(RANDOM() * 1000 + 100) >= 500 THEN 'Platinum Recycler'
        WHEN FLOOR(RANDOM() * 1000 + 100) >= 250 THEN 'Gold Recycler'
        WHEN FLOOR(RANDOM() * 1000 + 100) >= 100 THEN 'Silver Recycler'
        ELSE 'Bronze Recycler'
    END,
    NOW(),
    NOW()
FROM public.profiles p
WHERE p.role = 'member' AND p.email LIKE '%@example.com';

-- Create primary addresses for all members
INSERT INTO public.user_addresses (
    id, user_id, address_type, address_line1, address_line2, city, province, postal_code, country, is_default, is_active, notes, created_at, updated_at
)
SELECT 
    gen_random_uuid(),
    p.id,
    'primary',
    '123 Main Street',
    'Unit ' || (ROW_NUMBER() OVER (ORDER BY p.created_at)),
    'Cape Town',
    'Western Cape',
    '8001',
    'South Africa',
    true,
    true,
    'Main residence',
    NOW(),
    NOW()
FROM public.profiles p
WHERE p.role = 'member' AND p.email LIKE '%@example.com';

-- Create pickup addresses for first 3 members
INSERT INTO public.user_addresses (
    id, user_id, address_type, address_line1, address_line2, city, province, postal_code, country, is_default, is_active, notes, created_at, updated_at
)
SELECT 
    gen_random_uuid(),
    p.id,
    'pickup',
    '456 Business Park',
    'Building A',
    'Cape Town',
    'Western Cape',
    '8002',
    'South Africa',
    false,
    true,
    'Office building - call when arriving',
    NOW(),
    NOW()
FROM public.profiles p
WHERE p.role = 'member' AND p.email LIKE '%@example.com'
LIMIT 3;

-- Create secondary addresses for first 2 members
INSERT INTO public.user_addresses (
    id, user_id, address_type, address_line1, address_line2, city, province, postal_code, country, is_default, is_active, notes, created_at, updated_at
)
SELECT 
    gen_random_uuid(),
    p.id,
    'secondary',
    '789 Residential Complex',
    'Apartment 5B',
    'Cape Town',
    'Western Cape',
    '8003',
    'South Africa',
    false,
    true,
    'Weekend home',
    NOW(),
    NOW()
FROM public.profiles p
WHERE p.role = 'member' AND p.email LIKE '%@example.com'
LIMIT 2;

-- ============================================================================
-- STEP 3: VERIFY DATA CREATION
-- ============================================================================

-- Check final counts
SELECT 
    'Final Data Check' as check_type,
    (SELECT COUNT(*) FROM public.profiles WHERE role = 'member') as total_members,
    (SELECT COUNT(*) FROM public.user_addresses) as total_addresses,
    (SELECT COUNT(*) FROM public.wallets) as total_wallets,
    (SELECT COUNT(*) FROM public.office_member_user_addresses_view) as view_records;

-- Show sample data from the view
SELECT 
    'Sample View Data' as test_type,
    member_id,
    full_name,
    email,
    address_type,
    address_line1,
    city,
    province,
    is_default,
    wallet_balance,
    total_points,
    tier
FROM public.office_member_user_addresses_view
ORDER BY full_name, address_type
LIMIT 10;

-- ============================================================================
-- STEP 4: TEST THE VIEW DIRECTLY
-- ============================================================================

-- Test if the view can be queried without errors
SELECT 
    'View Query Test' as test_type,
    COUNT(*) as record_count,
    COUNT(DISTINCT member_id) as unique_members,
    STRING_AGG(DISTINCT address_type, ', ') as address_types_found
FROM public.office_member_user_addresses_view;

-- ============================================================================
-- STEP 5: CHECK FOR COMMON ISSUES
-- ============================================================================

-- Check if there are any NULL values that might cause issues
SELECT 
    'NULL Value Check' as check_type,
    COUNT(*) FILTER (WHERE full_name IS NULL) as null_names,
    COUNT(*) FILTER (WHERE email IS NULL) as null_emails,
    COUNT(*) FILTER (WHERE address_line1 IS NULL) as null_addresses
FROM public.office_member_user_addresses_view;

-- Check if the data transformation will work
SELECT 
    'Data Transformation Test' as test_type,
    member_id,
    full_name,
    email,
    COUNT(*) as address_count,
    STRING_AGG(address_type, ', ') as address_types
FROM public.office_member_user_addresses_view
GROUP BY member_id, full_name, email
ORDER BY full_name;
