-- Fix Member Display Complete
-- This script fixes all issues preventing members from showing with their names and addresses

-- 1. Enable RLS on tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON addresses;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON customer_profiles_with_addresses_view;

-- 3. Create new policies for profiles table
CREATE POLICY "Enable read access for authenticated users" ON profiles
    FOR SELECT
    TO authenticated
    USING (true); -- Allow authenticated users to read all profiles

-- 4. Create new policies for addresses table
CREATE POLICY "Enable read access for authenticated users" ON addresses
    FOR SELECT
    TO authenticated
    USING (true); -- Allow authenticated users to read all addresses

-- 5. Grant necessary permissions to authenticated users
GRANT SELECT ON profiles TO authenticated;
GRANT SELECT ON addresses TO authenticated;

-- 6. Create or recreate the view with correct permissions
DROP VIEW IF EXISTS customer_profiles_with_addresses_view;

CREATE VIEW customer_profiles_with_addresses_view AS
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
    COALESCE(
        json_agg(
            json_build_object(
                'id', a.id,
                'line1', a.line1,
                'suburb', a.suburb,
                'city', a.city,
                'postal_code', a.postal_code,
                'lat', a.lat,
                'lng', a.lng,
                'is_primary', a.is_primary
            ) ORDER BY a.is_primary DESC, a.created_at ASC
        ) FILTER (WHERE a.id IS NOT NULL),
        '[]'::json
    ) as addresses
FROM profiles p
LEFT JOIN addresses a ON p.id = a.profile_id
WHERE p.role = 'member' AND p.is_active = true
GROUP BY p.id, p.email, p.full_name, p.first_name, p.last_name, p.username, p.phone, p.role, p.is_active, p.created_at, p.updated_at;

-- 7. Grant permissions on the view
GRANT SELECT ON customer_profiles_with_addresses_view TO authenticated;

-- 8. Ensure we have member data - create sample members if none exist
DO $$
DECLARE
    member_count INTEGER;
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
        RAISE NOTICE 'Found % existing members', member_count;
    END IF;
END $$;

-- 9. Verify the data
SELECT 
    'profiles' as table_name,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE role = 'member') as member_count,
    COUNT(*) FILTER (WHERE role = 'collector') as collector_count
FROM profiles
UNION ALL
SELECT 
    'addresses' as table_name,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE profile_id IN (SELECT id FROM profiles WHERE role = 'member')) as member_addresses,
    COUNT(*) FILTER (WHERE profile_id IN (SELECT id FROM profiles WHERE role = 'collector')) as collector_addresses
FROM addresses;

-- 10. Show sample member data
SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.username,
    p.role,
    p.phone,
    a.line1,
    a.suburb,
    a.city,
    a.is_primary
FROM profiles p
LEFT JOIN addresses a ON p.id = a.profile_id AND a.is_primary = true
WHERE p.role = 'member'
ORDER BY p.created_at DESC
LIMIT 5;

-- 11. Test the view
SELECT COUNT(*) as view_count FROM customer_profiles_with_addresses_view;

-- 12. Show view sample data
SELECT 
    id,
    email,
    first_name,
    last_name,
    username,
    phone,
    role,
    addresses
FROM customer_profiles_with_addresses_view
LIMIT 3;
