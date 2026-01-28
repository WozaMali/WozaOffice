-- ============================================================================
-- POPULATE USER ADDRESSES WITH SAMPLE DATA
-- ============================================================================
-- This script populates the user_addresses table with sample data for testing
-- and provides migration from the existing addresses table

-- ============================================================================
-- STEP 1: MIGRATE EXISTING ADDRESSES (if any exist)
-- ============================================================================

-- Check if we have existing addresses to migrate
DO $$
DECLARE
    existing_addresses_count INTEGER;
    existing_members_count INTEGER;
BEGIN
    -- Count existing addresses
    SELECT COUNT(*) INTO existing_addresses_count FROM public.addresses;
    
    -- Count existing members
    SELECT COUNT(*) INTO existing_members_count FROM public.profiles WHERE role = 'member';
    
    RAISE NOTICE 'Found % existing addresses and % members', existing_addresses_count, existing_members_count;
    
    -- Migrate existing addresses if they exist
    IF existing_addresses_count > 0 THEN
        RAISE NOTICE 'Migrating existing addresses to user_addresses table...';
        
        INSERT INTO public.user_addresses (
            user_id,
            address_type,
            address_line1,
            city,
            province,
            postal_code,
            is_default,
            is_active,
            created_at,
            updated_at
        )
        SELECT 
            customer_id,
            'primary',
            street_address,
            city,
            'Western Cape', -- Default province - adjust as needed
            postal_code,
            is_primary,
            is_active,
            created_at,
            updated_at
        FROM public.addresses
        WHERE customer_id IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM public.user_addresses ua 
            WHERE ua.user_id = addresses.customer_id 
            AND ua.address_type = 'primary'
        );
        
        RAISE NOTICE 'Migration completed successfully';
    ELSE
        RAISE NOTICE 'No existing addresses found to migrate';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: CREATE SAMPLE MEMBER ADDRESSES
-- ============================================================================

-- Insert sample addresses for existing members
DO $$
DECLARE
    member_record RECORD;
    address_count INTEGER := 0;
BEGIN
    -- Get existing members and create sample addresses for them
    FOR member_record IN 
        SELECT id, full_name, email 
        FROM public.profiles 
        WHERE role = 'member' 
        AND is_active = true
        LIMIT 10
    LOOP
                -- Create primary address (only if one doesn't exist)
        INSERT INTO public.user_addresses (
            user_id,
            address_type,
            address_line1,
            address_line2,
            city,
            province,
            postal_code,
            country,
            coordinates,
            is_default,
            is_active,
            notes
        ) 
        SELECT 
            member_record.id,
            'primary',
            '123 ' || split_part(member_record.full_name, ' ', 1) || ' Street',
            'Unit ' || (address_count + 1),
            'Cape Town',
            'Western Cape',
            '800' || LPAD((address_count % 10)::text, 1, '0'),
            'South Africa',
            POINT(18.4241 + (address_count * 0.01), -33.9249 + (address_count * 0.01)),
            true,
            true,
            'Primary residence for ' || member_record.full_name
        WHERE NOT EXISTS (
            SELECT 1 FROM public.user_addresses ua 
            WHERE ua.user_id = member_record.id 
            AND ua.address_type = 'primary'
        );
        
        address_count := address_count + 1;
        
                -- Create pickup address (only if one doesn't exist)
        INSERT INTO public.user_addresses (
            user_id,
            address_type,
            address_line1,
            address_line2,
            city,
            province,
            postal_code,
            country,
            coordinates,
            is_default,
            is_active,
            notes
        ) 
        SELECT 
            member_record.id,
            'pickup',
            '456 ' || split_part(member_record.full_name, ' ', 1) || ' Avenue',
            'Collection Point',
            'Cape Town',
            'Western Cape',
            '800' || LPAD((address_count % 10)::text, 1, '0'),
            'South Africa',
            POINT(18.4241 + (address_count * 0.01), -33.9249 + (address_count * 0.01)),
            true,
            true,
            'Collection address - call when arriving'
        WHERE NOT EXISTS (
            SELECT 1 FROM public.user_addresses ua 
            WHERE ua.user_id = member_record.id 
            AND ua.address_type = 'pickup'
        );
        
        address_count := address_count + 1;
        
                -- Create secondary address (optional, only if one doesn't exist)
        IF address_count % 3 = 0 THEN
            INSERT INTO public.user_addresses (
                user_id,
                address_type,
                address_line1,
                city,
                province,
                postal_code,
                country,
                coordinates,
                is_default,
                is_active,
                notes
            ) 
            SELECT 
                member_record.id,
                'secondary',
                '789 ' || split_part(member_record.full_name, ' ', 1) || ' Road',
                'Cape Town',
                'Western Cape',
                '800' || LPAD((address_count % 10)::text, 1, '0'),
                'South Africa',
                POINT(18.4241 + (address_count * 0.01), -33.9249 + (address_count * 0.01)),
                false,
                true,
                'Alternative address'
            WHERE NOT EXISTS (
                SELECT 1 FROM public.user_addresses ua 
                WHERE ua.user_id = member_record.id 
                AND ua.address_type = 'secondary'
            );
            
            address_count := address_count + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Created sample addresses for existing members';
END $$;

-- ============================================================================
-- STEP 3: CREATE ADDITIONAL SAMPLE MEMBERS WITH ADDRESSES
-- ============================================================================

-- Insert additional sample members if we don't have enough
DO $$
DECLARE
    member_count INTEGER;
    i INTEGER;
    new_member_id UUID;
BEGIN
    -- Count existing members
    SELECT COUNT(*) INTO member_count FROM public.profiles WHERE role = 'member';
    
    -- Create additional sample members if we have less than 5
    IF member_count < 5 THEN
        RAISE NOTICE 'Creating additional sample members...';
        
        FOR i IN 1..(5 - member_count) LOOP
            -- Create sample member profile
            INSERT INTO public.profiles (
                email,
                full_name,
                first_name,
                last_name,
                username,
                role,
                is_active,
                phone
            ) VALUES (
                'sample.member' || i || '@example.com',
                'Sample Member ' || i,
                'Sample',
                'Member ' || i,
                'samplemember' || i,
                'member',
                true,
                '+2712345678' || LPAD(i::text, 1, '0')
            ) RETURNING id INTO new_member_id;
            
            -- Create primary address for new member
            INSERT INTO public.user_addresses (
                user_id,
                address_type,
                address_line1,
                address_line2,
                city,
                province,
                postal_code,
                country,
                coordinates,
                is_default,
                is_active,
                notes
            ) VALUES (
                new_member_id,
                'primary',
                (100 + i) || ' Sample Street',
                'Apartment ' || i,
                'Cape Town',
                'Western Cape',
                '800' || LPAD(i::text, 1, '0'),
                'South Africa',
                POINT(18.4241 + (i * 0.01), -33.9249 + (i * 0.01)),
                true,
                true,
                'Primary residence for Sample Member ' || i
            );
            
            -- Create pickup address for new member
            INSERT INTO public.user_addresses (
                user_id,
                address_type,
                address_line1,
                city,
                province,
                postal_code,
                country,
                coordinates,
                is_default,
                is_active,
                notes
            ) VALUES (
                new_member_id,
                'pickup',
                (200 + i) || ' Collection Avenue',
                'Cape Town',
                'Western Cape',
                '800' || LPAD(i::text, 1, '0'),
                'South Africa',
                POINT(18.4241 + (i * 0.01), -33.9249 + (i * 0.01)),
                true,
                true,
                'Collection address for Sample Member ' || i
            );
            
                        -- Create wallet for new member (only if one doesn't exist)
            INSERT INTO public.wallets (
                user_id,
                balance,
                total_points,
                tier
            ) 
            SELECT 
                new_member_id,
                0.00,
                0,
                'Bronze Recycler'
            WHERE NOT EXISTS (
                SELECT 1 FROM public.wallets w 
                WHERE w.user_id = new_member_id
            );
        END LOOP;
        
        RAISE NOTICE 'Created % additional sample members with addresses', (5 - member_count);
    END IF;
END $$;

-- ============================================================================
-- STEP 4: VERIFICATION QUERIES
-- ============================================================================

-- Check the results
SELECT 
    'Address Population Results' as test_type,
    COUNT(*) as total_addresses,
    COUNT(DISTINCT user_id) as unique_members,
    COUNT(*) FILTER (WHERE address_type = 'primary') as primary_addresses,
    COUNT(*) FILTER (WHERE address_type = 'pickup') as pickup_addresses,
    COUNT(*) FILTER (WHERE address_type = 'secondary') as secondary_addresses,
    COUNT(*) FILTER (WHERE is_default = true) as default_addresses
FROM public.user_addresses;

-- Test the views
SELECT 
    'Member Addresses View Test' as test_type,
    COUNT(*) as total_addresses,
    COUNT(DISTINCT member_id) as unique_members,
    COUNT(*) FILTER (WHERE is_default = true) as default_addresses
FROM public.member_user_addresses_view;

-- Test collection app view
SELECT 
    'Collection App View Test' as test_type,
    COUNT(*) as total_addresses,
    COUNT(DISTINCT member_id) as unique_members,
    COUNT(*) FILTER (WHERE customer_status = 'active') as active_customers,
    COUNT(*) FILTER (WHERE customer_status = 'new_customer') as new_customers
FROM public.collection_member_user_addresses_view;

-- Test office app view
SELECT 
    'Office App View Test' as test_type,
    COUNT(*) as total_addresses,
    COUNT(DISTINCT member_id) as unique_members,
    COUNT(*) FILTER (WHERE total_pickups > 0) as addresses_with_pickups,
    COUNT(*) FILTER (WHERE wallet_balance > 0) as addresses_with_balance
FROM public.office_member_user_addresses_view;

-- Show sample data
SELECT 
    'Sample Addresses' as test_type,
    ua.address_type,
    ua.address_line1,
    ua.city,
    ua.province,
    p.full_name as member_name,
    ua.is_default,
    ua.coordinates
FROM public.user_addresses ua
JOIN public.profiles p ON ua.user_id = p.id
WHERE p.role = 'member'
ORDER BY ua.created_at
LIMIT 10;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- Address population complete! 🎉
-- The following have been created:
-- 1. Migrated existing addresses from addresses table (if any)
-- 2. Created sample addresses for existing members
-- 3. Created additional sample members with addresses
-- 4. Set up primary and pickup addresses for each member
-- 5. Created wallets for new members
-- 
-- You should now see data in your views:
-- - member_user_addresses_view
-- - collection_member_user_addresses_view  
-- - office_member_user_addresses_view
-- 
-- Next steps:
-- 1. Test the views with the sample data
-- 2. Update your applications to use the new address system
-- 3. Add real member addresses as needed
-- 4. Integrate with your collection system
