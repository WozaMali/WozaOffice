-- Fix RLS Policies for Member Data Access
-- This script ensures authenticated users can access member profiles and addresses

-- 1. Enable RLS on tables if not already enabled
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
GRANT SELECT ON customer_profiles_with_addresses_view TO authenticated;

-- 6. Verify the view exists and has correct permissions
DO $$
BEGIN
    -- Check if view exists
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'customer_profiles_with_addresses_view') THEN
        RAISE NOTICE 'View customer_profiles_with_addresses_view exists';
        
        -- Grant permissions on the view
        EXECUTE 'GRANT SELECT ON customer_profiles_with_addresses_view TO authenticated';
        RAISE NOTICE 'Granted SELECT permission on view to authenticated users';
    ELSE
        RAISE NOTICE 'View customer_profiles_with_addresses_view does not exist - creating it';
        
        -- Create the view if it doesn't exist
        CREATE OR REPLACE VIEW customer_profiles_with_addresses_view AS
        SELECT 
            p.id,
            p.email,
            p.full_name,
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
        GROUP BY p.id, p.email, p.full_name, p.phone, p.role, p.is_active, p.created_at, p.updated_at;
        
        RAISE NOTICE 'Created customer_profiles_with_addresses_view';
    END IF;
END $$;

-- 7. Test the policies by checking current user permissions
DO $$
BEGIN
    RAISE NOTICE 'Current user: %', current_user;
    RAISE NOTICE 'Current role: %', current_role;
    RAISE NOTICE 'Is authenticated: %', (current_user != 'anon');
END $$;

-- 8. Verify member data exists
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

-- 9. Test the view
SELECT COUNT(*) as view_count FROM customer_profiles_with_addresses_view;
