-- Fix Office Address Display Robust
-- This script ensures addresses are properly displayed by fixing the view structure and data format
-- Applied the same updates that were made for the collector to the office database

-- 1. Drop and recreate the view with a more robust structure for office customers
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
                    'line1', COALESCE(a.street_address, ''),
                    'suburb', COALESCE(a.suburb, ''),
                    'city', COALESCE(a.city, ''),
                    'postal_code', COALESCE(a.postal_code, ''),
                    'lat', a.latitude,
                    'lng', a.longitude,
                    'is_primary', COALESCE(a.is_primary, false)
                ) ORDER BY a.is_primary DESC, a.created_at ASC
            )
        ELSE '[]'::json
    END as addresses
FROM profiles p
LEFT JOIN addresses a ON p.id = a.customer_id
WHERE p.role = 'CUSTOMER' AND p.is_active = true
GROUP BY p.id, p.email, p.full_name, p.first_name, p.last_name, p.username, p.phone, p.role, p.is_active, p.created_at, p.updated_at;

-- 2. Grant permissions on the view
GRANT SELECT ON customer_profiles_with_addresses_view TO authenticated;

-- 3. Update the profiles table to include full_name if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Update full_name for existing records if it's null
UPDATE profiles 
SET full_name = CONCAT(first_name, ' ', last_name)
WHERE full_name IS NULL AND first_name IS NOT NULL AND last_name IS NOT NULL;

-- 4. Ensure we have proper customer data with addresses
DO $$
DECLARE
    customer_count INTEGER;
    address_count INTEGER;
BEGIN
    -- Check if we have any customers
    SELECT COUNT(*) INTO customer_count FROM profiles WHERE role = 'CUSTOMER';
    
    IF customer_count = 0 THEN
        RAISE NOTICE 'No customers found - creating sample customer data...';
        
        -- Insert sample customer profiles
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
            ('john.doe@example.com', 'John Doe', 'John', 'Doe', 'johndoe', 'CUSTOMER', true, '+27123456789'),
            ('jane.smith@example.com', 'Jane Smith', 'Jane', 'Smith', 'janesmith', 'CUSTOMER', true, '+27123456790'),
            ('mike.johnson@example.com', 'Mike Johnson', 'Mike', 'Johnson', 'mikejohnson', 'CUSTOMER', true, '+27123456791'),
            ('sarah.wilson@example.com', 'Sarah Wilson', 'Sarah', 'Wilson', 'sarahwilson', 'CUSTOMER', true, '+27123456792'),
            ('david.brown@example.com', 'David Brown', 'David', 'Brown', 'davidbrown', 'CUSTOMER', true, '+27123456793')
        ON CONFLICT (email) DO NOTHING;
        
        RAISE NOTICE 'Sample customer profiles created';
    ELSE
        RAISE NOTICE 'Found % existing customers', customer_count;
    END IF;
    
    -- Check if we have addresses for customers
    SELECT COUNT(*) INTO address_count 
    FROM addresses a 
    JOIN profiles p ON a.customer_id = p.id 
    WHERE p.role = 'CUSTOMER';
    
    IF address_count = 0 THEN
        RAISE NOTICE 'No addresses found for customers - creating sample addresses...';
        
        -- Insert sample addresses for the customers
        INSERT INTO addresses (
            customer_id,
            street_address,
            suburb,
            city,
            postal_code,
            is_primary,
            latitude,
            longitude
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
        WHERE p.role = 'CUSTOMER'
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Sample addresses created for customers';
    ELSE
        RAISE NOTICE 'Found % existing addresses for customers', address_count;
    END IF;
END $$;

-- 5. Create or update the office dashboard view for customers
CREATE OR REPLACE VIEW office_customer_dashboard_view AS
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.first_name,
    p.last_name,
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
                    'line1', COALESCE(a.street_address, ''),
                    'suburb', COALESCE(a.suburb, ''),
                    'city', COALESCE(a.city, ''),
                    'postal_code', COALESCE(a.postal_code, ''),
                    'lat', a.latitude,
                    'lng', a.longitude,
                    'is_primary', COALESCE(a.is_primary, false)
                ) ORDER BY a.is_primary DESC, a.created_at ASC
            )
        ELSE '[]'::json
    END as addresses,
    COALESCE(w.balance, 0.00) as wallet_balance,
    COALESCE(w.total_points, 0) as total_points,
    COALESCE(w.tier, 'Bronze Recycler') as tier,
    COUNT(pk.id) as total_pickups,
    COUNT(pk.id) FILTER (WHERE pk.status = 'completed') as completed_pickups,
    COUNT(pk.id) FILTER (WHERE pk.status = 'pending') as pending_pickups,
    COALESCE(SUM(pk.total_value), 0.00) as total_earnings
FROM profiles p
LEFT JOIN addresses a ON p.id = a.customer_id
LEFT JOIN wallets w ON p.id = w.user_id
LEFT JOIN pickups pk ON p.id = pk.customer_id
WHERE p.role = 'CUSTOMER' AND p.is_active = true
GROUP BY p.id, p.email, p.full_name, p.first_name, p.last_name, p.username, p.phone, p.role, p.is_active, p.created_at, p.updated_at, w.balance, w.total_points, w.tier;

-- 6. Grant permissions on the office dashboard view
GRANT SELECT ON office_customer_dashboard_view TO authenticated;

-- 7. Verify the data structure
SELECT 
    'Data Verification' as test_type,
    'profiles' as table_name,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE role = 'CUSTOMER') as customer_count
FROM profiles
UNION ALL
SELECT 
    'Data Verification' as test_type,
    'addresses' as table_name,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE customer_id IN (SELECT id FROM profiles WHERE role = 'CUSTOMER')) as customer_addresses
FROM addresses;

-- 8. Test the view output structure
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

-- 9. Test individual address extraction
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

-- 10. Test office dashboard view
SELECT 
    'Office Dashboard Test' as test_type,
    id,
    email,
    full_name,
    wallet_balance,
    total_points,
    tier,
    total_pickups,
    completed_pickups,
    total_earnings
FROM office_customer_dashboard_view
LIMIT 5;

-- 11. Check RLS policies are working
SELECT 
    'RLS Check' as test_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('profiles', 'addresses', 'wallets', 'pickups');

-- 12. Test authenticated user access
DO $$
BEGIN
    RAISE NOTICE 'Testing authenticated user access...';
    RAISE NOTICE 'Current user: %', current_user;
    RAISE NOTICE 'Current role: %', current_role;
    
    -- Test if we can access the views
    PERFORM COUNT(*) FROM customer_profiles_with_addresses_view;
    RAISE NOTICE 'Customer profiles view access successful - count: %', (SELECT COUNT(*) FROM customer_profiles_with_addresses_view);
    
    PERFORM COUNT(*) FROM office_customer_dashboard_view;
    RAISE NOTICE 'Office dashboard view access successful - count: %', (SELECT COUNT(*) FROM office_customer_dashboard_view);
    
    -- Test if we can access individual tables
    PERFORM COUNT(*) FROM profiles WHERE role = 'CUSTOMER';
    RAISE NOTICE 'Profiles access successful - customer count: %', (SELECT COUNT(*) FROM profiles WHERE role = 'CUSTOMER');
    
    PERFORM COUNT(*) FROM addresses WHERE customer_id IN (SELECT id FROM profiles WHERE role = 'CUSTOMER');
    RAISE NOTICE 'Addresses access successful - customer address count: %', (SELECT COUNT(*) FROM addresses WHERE customer_id IN (SELECT id FROM profiles WHERE role = 'CUSTOMER'));
END $$;

-- 13. Create additional indexes for better performance
CREATE INDEX IF NOT EXISTS idx_addresses_customer_id ON addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_addresses_is_primary ON addresses(is_primary);
CREATE INDEX IF NOT EXISTS idx_profiles_role_active ON profiles(role, is_active);

-- 14. Update RLS policies if needed
-- Ensure profiles table has proper RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to view customer profiles
DROP POLICY IF EXISTS "Authenticated users can view customer profiles" ON profiles;
CREATE POLICY "Authenticated users can view customer profiles" ON profiles
    FOR SELECT USING (auth.role() = 'authenticated' AND role = 'CUSTOMER');

-- Ensure addresses table has proper RLS
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to view addresses
DROP POLICY IF EXISTS "Authenticated users can view addresses" ON addresses;
CREATE POLICY "Authenticated users can view addresses" ON addresses
    FOR SELECT USING (auth.role() = 'authenticated');

-- 15. Final verification
SELECT 
    'Final Verification' as test_type,
    'customer_profiles_with_addresses_view' as view_name,
    COUNT(*) as record_count
FROM customer_profiles_with_addresses_view
UNION ALL
SELECT 
    'Final Verification' as test_type,
    'office_customer_dashboard_view' as view_name,
    COUNT(*) as record_count
FROM office_customer_dashboard_view;
