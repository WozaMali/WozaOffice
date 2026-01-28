-- Debug Address Structure
-- This script helps identify why addresses are not being displayed correctly in the frontend

-- 1. Check the exact structure of the view output
SELECT 
    'View Structure Test' as test_type,
    id,
    email,
    first_name,
    last_name,
    username,
    role,
    addresses,
    json_typeof(addresses) as addresses_type,
    json_array_length(addresses) as addresses_count
FROM customer_profiles_with_addresses_view
LIMIT 3;

-- 2. Check if addresses are properly formatted as JSON
SELECT 
    'Address JSON Structure' as test_type,
    id,
    email,
    addresses,
    CASE 
        WHEN json_typeof(addresses) = 'array' THEN '✅ Valid JSON array'
        WHEN json_typeof(addresses) = 'string' THEN '❌ String instead of array'
        WHEN addresses IS NULL THEN '❌ NULL addresses'
        ELSE '❌ Unknown type: ' || json_typeof(addresses)
    END as addresses_status
FROM customer_profiles_with_addresses_view
LIMIT 5;

-- 3. Extract and examine individual address objects
SELECT 
    'Individual Address Objects' as test_type,
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    json_array_elements(p.addresses) as individual_address
FROM customer_profiles_with_addresses_view p
WHERE json_array_length(p.addresses) > 0
LIMIT 10;

-- 4. Check specific address fields in the JSON
SELECT 
    'Address Field Analysis' as test_type,
    p.id,
    p.email,
    (json_array_elements(p.addresses)->>'line1') as line1,
    (json_array_elements(p.addresses)->>'suburb') as suburb,
    (json_array_elements(p.addresses)->>'city') as city,
    (json_array_elements(p.addresses)->>'is_primary') as is_primary,
    (json_array_elements(p.addresses)->>'id') as address_id
FROM customer_profiles_with_addresses_view p
WHERE json_array_length(p.addresses) > 0
LIMIT 15;

-- 5. Check if the view is correctly joining profiles and addresses
SELECT 
    'Raw Join Test' as test_type,
    p.id as profile_id,
    p.email,
    p.first_name,
    p.last_name,
    p.role,
    a.id as address_id,
    a.line1,
    a.suburb,
    a.city,
    a.is_primary
FROM profiles p
LEFT JOIN addresses a ON p.id = a.profile_id
WHERE p.role = 'member' AND p.is_active = true
ORDER BY p.created_at DESC
LIMIT 10;

-- 6. Verify the view creation SQL matches the expected structure
SELECT 
    'View Definition' as test_type,
    view_definition
FROM information_schema.views 
WHERE table_name = 'customer_profiles_with_addresses_view';

-- 7. Test direct table access to see if data exists
SELECT 
    'Direct Table Access' as test_type,
    'profiles' as table_name,
    COUNT(*) as total_profiles,
    COUNT(*) FILTER (WHERE role = 'member') as member_profiles
FROM profiles
UNION ALL
SELECT 
    'Direct Table Access' as test_type,
    'addresses' as table_name,
    COUNT(*) as total_addresses,
    COUNT(*) FILTER (WHERE profile_id IN (SELECT id FROM profiles WHERE role = 'member')) as member_addresses
FROM addresses;

-- 8. Check for any data type mismatches
SELECT 
    'Data Type Check' as test_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'addresses' 
ORDER BY ordinal_position;

-- 9. Test the view with a simple query to see raw output
SELECT 
    'Simple View Test' as test_type,
    id,
    email,
    first_name,
    last_name,
    addresses
FROM customer_profiles_with_addresses_view
WHERE json_array_length(addresses) > 0
LIMIT 3;

-- 10. Check if there are any RLS policy issues
SELECT 
    'RLS Policy Check' as test_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('profiles', 'addresses');
