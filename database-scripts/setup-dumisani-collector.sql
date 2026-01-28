-- Setup Dumisani as Collector User
-- This script first inspects your table structure and then creates the profile

-- Step 1: Inspect the profiles table structure
DO $$
DECLARE
    col_record record;
    profile_count integer;
    profile_id uuid;
    table_structure text := '';
BEGIN
    -- Show what columns actually exist in the profiles table
    RAISE NOTICE 'Inspecting profiles table structure...';
    
    FOR col_record IN 
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        ORDER BY ordinal_position
    LOOP
        table_structure := table_structure || col_record.column_name || ' (' || col_record.data_type || '), ';
    END LOOP;
    
    RAISE NOTICE 'Profiles table columns: %', table_structure;
    
    -- Check if profile already exists and clean up duplicates
    SELECT COUNT(*) INTO profile_count 
    FROM profiles 
    WHERE email = 'dumisani@wozamali.co.za';
    
    IF profile_count > 0 THEN
        -- Delete existing profiles for this email to avoid duplicates
        DELETE FROM profiles WHERE email = 'dumisani@wozamali.co.za';
        RAISE NOTICE 'Removed % existing profile(s) for dumisani@wozamali.co.za', profile_count;
    END IF;
    
    -- Create new profile - try different column combinations based on what exists
    BEGIN
        -- Try with first_name and last_name
        INSERT INTO profiles (
            id,
            email,
            first_name,
            last_name,
            role,
            phone,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            'dumisani@wozamali.co.za',
            'Dumisani',
            'Collector',
            'COLLECTOR',
            '+27 123 456 789',
            true,
            NOW(),
            NOW()
        );
        RAISE NOTICE 'Profile created with first_name/last_name columns';
    EXCEPTION WHEN undefined_column THEN
        BEGIN
            -- Try with full_name
            INSERT INTO profiles (
                id,
                email,
                full_name,
                role,
                phone,
                is_active,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                'dumisani@wozamali.co.za',
                'Dumisani Collector',
                'COLLECTOR',
                '+27 123 456 789',
                true,
                NOW(),
                NOW()
            );
            RAISE NOTICE 'Profile created with full_name column';
        EXCEPTION WHEN undefined_column THEN
            -- Try with just the basic columns
            INSERT INTO profiles (
                id,
                email,
                role,
                phone,
                is_active,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                'dumisani@wozamali.co.za',
                'COLLECTOR',
                '+27 123 456 789',
                true,
                NOW(),
                NOW()
            );
            RAISE NOTICE 'Profile created with basic columns only';
        END;
    END;
    
    -- Get the newly created profile ID
    SELECT id INTO profile_id 
    FROM profiles 
    WHERE email = 'dumisani@wozamali.co.za';
    
    RAISE NOTICE 'Profile created for Dumisani successfully with ID: %', profile_id;
END $$;

-- Step 2: Create address for Dumisani (check table structure first)
DO $$
DECLARE
    col_exists boolean;
    profile_id uuid;
    address_structure text := '';
    col_record record;
BEGIN
    -- Show what columns exist in the addresses table
    RAISE NOTICE 'Inspecting addresses table structure...';
    
    FOR col_record IN 
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'addresses' 
        ORDER BY ordinal_position
    LOOP
        address_structure := address_structure || col_record.column_name || ' (' || col_record.data_type || '), ';
    END LOOP;
    
    RAISE NOTICE 'Addresses table columns: %', address_structure;
    
    -- Get the profile ID (ensure only one row)
    SELECT id INTO profile_id 
    FROM profiles 
    WHERE email = 'dumisani@wozamali.co.za'
    LIMIT 1;
    
    -- Check if customer_id column exists in addresses table
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'addresses' AND column_name = 'customer_id'
    ) INTO col_exists;
    
    IF col_exists THEN
        -- Insert address with customer_id
        INSERT INTO addresses (
            id,
            customer_id,
            street_address,
            suburb,
            city,
            postal_code,
            is_primary
        ) VALUES (
            gen_random_uuid(),
            profile_id,
            '123 Collector Street',
            'Cape Town Central',
            'Cape Town',
            '8001',
            true
        );
        RAISE NOTICE 'Address created with customer_id column';
    ELSE
        -- Try with profile_id
        BEGIN
            INSERT INTO addresses (
                id,
                profile_id,
                line1,
                suburb,
                city,
                postal_code,
                is_primary
            ) VALUES (
                gen_random_uuid(),
                profile_id,
                '123 Collector Street',
                'Cape Town Central',
                'Cape Town',
                '8001',
                true
            );
            RAISE NOTICE 'Address created with profile_id column';
        EXCEPTION WHEN undefined_column THEN
            -- Try with just basic columns
            INSERT INTO addresses (
                id,
                profile_id,
                suburb,
                city,
                postal_code
            ) VALUES (
                gen_random_uuid(),
                profile_id,
                'Cape Town Central',
                'Cape Town',
                '8001'
            );
            RAISE NOTICE 'Address created with basic columns only';
        END;
    END IF;
    
    RAISE NOTICE 'Address created for Dumisani successfully!';
END $$;

-- Instructions for completing the setup:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add User"
-- 3. Email: dumisani@wozamali.co.za
-- 4. Password: Dumisani123
-- 5. Copy the generated User ID
-- 6. Update the profile ID to match:
--    UPDATE profiles 
--    SET id = 'COPIED_USER_ID_HERE' 
--    WHERE email = 'dumisani@wozamali.co.za';
