-- ============================================================================
-- TEST MEMBER NAMES IN DATABASE
-- ============================================================================
-- Check what name data is available in the database

-- Test 1: Check profiles table directly
SELECT 
    'Profiles Table' as source,
    id,
    email,
    full_name,
    first_name,
    last_name,
    username,
    role
FROM public.profiles 
WHERE role = 'member'
LIMIT 5;

-- Test 2: Check the collection view
SELECT 
    'Collection View' as source,
    member_id,
    email,
    full_name,
    first_name,
    last_name,
    username,
    role
FROM public.collection_member_user_addresses_view
LIMIT 5;

-- Test 3: Check if there are any NULL name fields
SELECT 
    'Name Field Analysis' as analysis,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE first_name IS NOT NULL) as has_first_name,
    COUNT(*) FILTER (WHERE last_name IS NOT NULL) as has_last_name,
    COUNT(*) FILTER (WHERE username IS NOT NULL) as has_username,
    COUNT(*) FILTER (WHERE full_name IS NOT NULL) as has_full_name
FROM public.profiles 
WHERE role = 'member';

-- Test 4: Show sample data with all name fields
SELECT 
    'Sample Member Data' as test_type,
    id,
    email,
    COALESCE(full_name, 'NULL') as full_name,
    COALESCE(first_name, 'NULL') as first_name,
    COALESCE(last_name, 'NULL') as last_name,
    COALESCE(username, 'NULL') as username,
    role
FROM public.profiles 
WHERE role = 'member'
LIMIT 3;
