-- ============================================================================
-- TEST DATABASE CONNECTION AND BASIC DATA
-- ============================================================================
-- Simple test to verify database connection and basic data availability

-- Test 1: Basic connection
SELECT 'Database Connection Test' as test_type, NOW() as current_time;

-- Test 2: Check if tables exist
SELECT 
    'Table Existence Check' as test_type,
    table_name,
    CASE 
        WHEN table_name IN ('profiles', 'user_addresses', 'wallets') THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'user_addresses', 'wallets')
ORDER BY table_name;

-- Test 3: Check if views exist
SELECT 
    'View Existence Check' as test_type,
    table_name as view_name,
    CASE 
        WHEN table_name = 'office_member_user_addresses_view' THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name = 'office_member_user_addresses_view';

-- Test 4: Check basic data counts
SELECT 
    'Basic Data Counts' as test_type,
    (SELECT COUNT(*) FROM public.profiles) as total_profiles,
    (SELECT COUNT(*) FROM public.profiles WHERE role = 'member') as member_profiles,
    (SELECT COUNT(*) FROM public.user_addresses) as total_addresses,
    (SELECT COUNT(*) FROM public.wallets) as total_wallets;

-- Test 5: Try to query the view directly
SELECT 
    'View Query Test' as test_type,
    COUNT(*) as record_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '❌ NO DATA'
        ELSE '✅ HAS DATA - ' || COUNT(*) || ' records'
    END as status
FROM public.office_member_user_addresses_view;

-- Test 6: Show any data that exists
SELECT 
    'Sample Data Check' as test_type,
    member_id,
    full_name,
    email,
    address_type,
    address_line1,
    city
FROM public.office_member_user_addresses_view
LIMIT 3;
