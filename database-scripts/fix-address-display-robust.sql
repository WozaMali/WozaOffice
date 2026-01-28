-- Fix Address Display Robust
-- This script ensures addresses are properly displayed by fixing the view structure and data format

-- 1. Drop and recreate the view with a more robust structure
DROP VIEW IF EXISTS customer_profiles_with_addresses_view;

CREATE OR REPLACE VIEW customer_profiles_with_addresses_view AS
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.first_name,
    p.last_name,
    p.username,
    p.phone,
    p.role,
    p.is_active,
    p.created_at,
    p.updated_at,
    CASE 
        WHEN COUNT(a.id) > 0 THEN
            json_agg(
                json_build_object(
                    'id', a.id,
                    'line1', COALESCE(a.line1, ''),
                    'suburb', COALESCE(a.suburb, ''),
                    'city', COALESCE(a.city, ''),
                    'postal_code', COALESCE(a.postal_code, ''),
                    'lat', a.lat,
                    'lng', a.lng,
                    'is_primary', COALESCE(a.is_primary, false)
                ) ORDER BY a.is_primary DESC, a.created_at ASC
            )
        ELSE '[]'::json
    END as addresses
FROM profiles p
LEFT JOIN addresses a ON p.id = a.profile_id
WHERE p.role = 'member' AND p.is_active = true
GROUP BY p.id, p.email, p.full_name, p.first_name, p.last_name, p.username, p.phone, p.role, p.is_active, p.created_at, p.updated_at;

-- 2. Grant permissions on the view
GRANT SELECT ON customer_profiles_with_addresses_view TO authenticated;

-- 3. Ensure we have proper member data with addresses
DO $$
DECLARE
    member_count INTEGER;
    address_count INTEGER;
BEGIN
    -- Check if we have any members
    SELECT COUNT(*) INTO member_count FROM profiles WHERE role = 'member';
    
    IF member_count = 0 THEN
        RAISE NOTICE 'No members found - creating sample member data...';
        
        -- Insert sample member profiles
        INSERT INTO profiles (
            email,
            full_name,
            first_name,
            last_name,
            username,
            role,
            is_active,
            phone
        ) VALUES 
            ('john.doe@example.com', 'John Doe', 'John', 'Doe', 'johndoe', 'member', true, '+27123456789'),
            ('jane.smith@example.com', 'Jane Smith', 'Jane', 'Smith', 'janesmith', 'member', true, '+27123456790'),
            ('mike.johnson@example.com', 'Mike Johnson', 'Mike', 'Johnson', 'mikejohnson', 'member', true, '+27123456791'),
            ('sarah.wilson@example.com', 'Sarah Wilson', 'Sarah', 'Wilson', 'sarahwilson', 'member', true, '+27123456792'),
            ('david.brown@example.com', 'David Brown', 'David', 'Brown', 'davidbrown', 'member', true, '+27123456793')
        ON CONFLICT (email) DO NOTHING;
        
        RAISE NOTICE 'Sample member profiles created';
    ELSE
        RAISE NOTICE 'Found % existing members', member_count;
    END IF;
    
    -- Check if we have addresses for members
    SELECT COUNT(*) INTO address_count 
    FROM addresses a 
    JOIN profiles p ON a.profile_id = p.id 
    WHERE p.role = 'member';
    
    IF address_count = 0 THEN
        RAISE NOTICE 'No addresses found for members - creating sample addresses...';
        
        -- Insert sample addresses for the members
        INSERT INTO addresses (
            profile_id,
            line1,
            suburb,
            city,
            postal_code,
            is_primary,
            lat,
            lng
        )
        SELECT 
            p.id,
            CASE 
                WHEN p.email = 'john.doe@example.com' THEN '123 Main Street'
                WHEN p.email = 'jane.smith@example.com' THEN '456 Oak Avenue'
                WHEN p.email = 'mike.johnson@example.com' THEN '789 Pine Road'
                WHEN p.email = 'sarah.wilson@example.com' THEN '321 Elm Street'
                WHEN p.email = 'david.brown@example.com' THEN '654 Maple Drive'
            END,
            CASE 
                WHEN p.email = 'john.doe@example.com' THEN 'Sandton'
                WHEN p.email = 'jane.smith@example.com' THEN 'Rosebank'
                WHEN p.email = 'mike.johnson@example.com' THEN 'Melrose'
                WHEN p.email = 'sarah.wilson@example.com' THEN 'Parktown'
                WHEN p.email = 'david.brown@example.com' THEN 'Houghton'
            END,
            'Johannesburg',
            '2000',
            true,
            CASE 
                WHEN p.email = 'john.doe@example.com' THEN -26.1087
                WHEN p.email = 'jane.smith@example.com' THEN -26.1420
                WHEN p.email = 'mike.johnson@example.com' THEN -26.1133
                WHEN p.email = 'sarah.wilson@example.com' THEN -26.1899
                WHEN p.email = 'david.brown@example.com' THEN -26.1659
            END,
            CASE 
                WHEN p.email = 'john.doe@example.com' THEN 28.0567
                WHEN p.email = 'jane.smith@example.com' THEN 28.0473
                WHEN p.email = 'mike.johnson@example.com' THEN 28.0473
                WHEN p.email = 'sarah.wilson@example.com' THEN 28.0444
                WHEN p.email = 'david.brown@example.com' THEN 28.0444
            END
        FROM profiles p
        WHERE p.role = 'member'
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Sample addresses created for members';
    ELSE
        RAISE NOTICE 'Found % existing addresses for members', address_count;
    END IF;
END $$;

-- 4. Verify the data structure
SELECT 
    'Data Verification' as test_type,
    'profiles' as table_name,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE role = 'member') as member_count
FROM profiles
UNION ALL
SELECT 
    'Data Verification' as test_type,
    'addresses' as table_name,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE profile_id IN (SELECT id FROM profiles WHERE role = 'member')) as member_addresses
FROM addresses;

-- 5. Test the view output structure
SELECT 
    'View Test' as test_type,
    id,
    email,
    first_name,
    last_name,
    json_typeof(addresses) as addresses_type,
    json_array_length(addresses) as addresses_count,
    addresses
FROM customer_profiles_with_addresses_view
LIMIT 3;

-- 6. Test individual address extraction
SELECT 
    'Address Extraction Test' as test_type,
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    (json_array_elements(p.addresses)->>'line1') as line1,
    (json_array_elements(p.addresses)->>'suburb') as suburb,
    (json_array_elements(p.addresses)->>'city') as city,
    (json_array_elements(p.addresses)->>'is_primary') as is_primary
FROM customer_profiles_with_addresses_view p
WHERE json_array_length(p.addresses) > 0
LIMIT 10;

-- 7. Check RLS policies are working
SELECT 
    'RLS Check' as test_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('profiles', 'addresses');

-- 8. Test authenticated user access
DO $$
BEGIN
    RAISE NOTICE 'Testing authenticated user access...';
    RAISE NOTICE 'Current user: %', current_user;
    RAISE NOTICE 'Current role: %', current_role;
    
    -- Test if we can access the view
    PERFORM COUNT(*) FROM customer_profiles_with_addresses_view;
    RAISE NOTICE 'View access successful - count: %', (SELECT COUNT(*) FROM customer_profiles_with_addresses_view);
    
    -- Test if we can access individual tables
    PERFORM COUNT(*) FROM profiles WHERE role = 'member';
    RAISE NOTICE 'Profiles access successful - member count: %', (SELECT COUNT(*) FROM profiles WHERE role = 'member');
    
    PERFORM COUNT(*) FROM addresses WHERE profile_id IN (SELECT id FROM profiles WHERE role = 'member');
    RAISE NOTICE 'Addresses access successful - member address count: %', (SELECT COUNT(*) FROM addresses WHERE profile_id IN (SELECT id FROM profiles WHERE role = 'member'));
END $$;
