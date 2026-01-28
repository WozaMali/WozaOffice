-- ============================================================================
-- TEST MEMBER PAGE DATA AVAILABILITY
-- ============================================================================
-- Quick test to verify if the member page has data to display

-- Check if user_addresses table has data
SELECT 
    'User Addresses Table' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) FILTER (WHERE address_type = 'primary') as primary_addresses,
    COUNT(*) FILTER (WHERE address_type = 'pickup') as pickup_addresses,
    COUNT(*) FILTER (WHERE is_default = true) as default_addresses
FROM public.user_addresses;

-- Check if profiles table has member data
SELECT 
    'Profiles Table' as table_name,
    COUNT(*) as total_profiles,
    COUNT(*) FILTER (WHERE role = 'member') as member_profiles,
    COUNT(*) FILTER (WHERE is_active = true AND role = 'member') as active_members
FROM public.profiles;

-- Check if wallets table has data
SELECT 
    'Wallets Table' as table_name,
    COUNT(*) as total_wallets,
    COUNT(*) FILTER (WHERE balance > 0) as wallets_with_balance,
    COUNT(*) FILTER (WHERE total_points > 0) as wallets_with_points
FROM public.wallets;

-- Test the office view specifically
SELECT 
    'Office Member View' as view_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT member_id) as unique_members,
    COUNT(*) FILTER (WHERE address_type = 'primary') as primary_addresses,
    COUNT(*) FILTER (WHERE address_type = 'pickup') as pickup_addresses
FROM public.office_member_user_addresses_view;

-- Show sample data from the office view
SELECT 
    'Sample Office View Data' as test_type,
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
LIMIT 5;

-- Check if there are any errors in the view
SELECT 
    'View Error Check' as test_type,
    CASE 
        WHEN COUNT(*) = 0 THEN 'NO DATA - Run populate-user-addresses.sql'
        ELSE 'DATA AVAILABLE - ' || COUNT(*) || ' records'
    END as status
FROM public.office_member_user_addresses_view;
