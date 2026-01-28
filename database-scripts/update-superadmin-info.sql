-- ============================================================================
-- UPDATE SUPER ADMIN PERSONAL INFORMATION
-- ============================================================================
-- This script allows you to update the Super Admin's personal details

-- Step 1: Show current Super Admin information
SELECT '=== CURRENT SUPER ADMIN INFORMATION ===' as info;

SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.full_name,
    u.phone,
    u.employee_number,
    u.township,
    u.status,
    u.is_approved,
    u.created_at,
    u.updated_at,
    r.name as role_name,
    r.permissions
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
WHERE u.id = 'b1b84587-6a12-43e9-85ef-d465cbf8ece3';

-- Step 2: Update Super Admin personal information
SELECT '=== UPDATING SUPER ADMIN INFORMATION ===' as info;

-- Update the Super Admin's personal details
UPDATE public.users 
SET 
    first_name = 'Super',                    -- Change this to desired first name
    last_name = 'Admin',                      -- Change this to desired last name
    full_name = 'Super Admin',                -- Change this to desired full name
    phone = '+27 11 123 4567',                -- Change this to desired phone number
    employee_number = 'EMP001',                -- Change this to desired employee number
    township = 'Johannesburg',                -- Change this to desired township
    updated_at = NOW()
WHERE id = 'b1b84587-6a12-43e9-85ef-d465cbf8ece3';

-- Step 3: Add additional personal information if needed
-- You can add more columns to the users table if needed
-- For example, if you want to add address, work_id, etc.

-- Add address column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'address'
    ) THEN
        ALTER TABLE public.users ADD COLUMN address TEXT;
        RAISE NOTICE 'Added address column to users table';
    END IF;
END $$;

-- Add work_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'work_id'
    ) THEN
        ALTER TABLE public.users ADD COLUMN work_id TEXT;
        RAISE NOTICE 'Added work_id column to users table';
    END IF;
END $$;

-- Add date_of_birth column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'date_of_birth'
    ) THEN
        ALTER TABLE public.users ADD COLUMN date_of_birth DATE;
        RAISE NOTICE 'Added date_of_birth column to users table';
    END IF;
END $$;

-- Add emergency_contact column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'emergency_contact'
    ) THEN
        ALTER TABLE public.users ADD COLUMN emergency_contact TEXT;
        RAISE NOTICE 'Added emergency_contact column to users table';
    END IF;
END $$;

-- Add emergency_contact_phone column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'emergency_contact_phone'
    ) THEN
        ALTER TABLE public.users ADD COLUMN emergency_contact_phone TEXT;
        RAISE NOTICE 'Added emergency_contact_phone column to users table';
    END IF;
END $$;

-- Step 4: Update Super Admin with additional information
UPDATE public.users 
SET 
    address = '123 Main Street, Johannesburg, 2000',           -- Change this to desired address
    work_id = 'WOZA-ADMIN-001',                                -- Change this to desired work ID
    date_of_birth = '1990-01-01',                              -- Change this to desired date of birth
    emergency_contact = 'Jane Admin',                           -- Change this to desired emergency contact
    emergency_contact_phone = '+27 11 987 6543',                -- Change this to desired emergency contact phone
    updated_at = NOW()
WHERE id = 'b1b84587-6a12-43e9-85ef-d465cbf8ece3';

-- Step 5: Show updated Super Admin information
SELECT '=== UPDATED SUPER ADMIN INFORMATION ===' as info;

SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.full_name,
    u.phone,
    u.employee_number,
    u.township,
    u.address,
    u.work_id,
    u.date_of_birth,
    u.emergency_contact,
    u.emergency_contact_phone,
    u.status,
    u.is_approved,
    u.created_at,
    u.updated_at,
    r.name as role_name
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
WHERE u.id = 'b1b84587-6a12-43e9-85ef-d465cbf8ece3';

-- Step 6: Create a function to easily update Super Admin info in the future
CREATE OR REPLACE FUNCTION public.update_superadmin_info(
    p_first_name TEXT DEFAULT NULL,
    p_last_name TEXT DEFAULT NULL,
    p_full_name TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_employee_number TEXT DEFAULT NULL,
    p_township TEXT DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_work_id TEXT DEFAULT NULL,
    p_date_of_birth DATE DEFAULT NULL,
    p_emergency_contact TEXT DEFAULT NULL,
    p_emergency_contact_phone TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    -- Update the Super Admin information
    UPDATE public.users 
    SET 
        first_name = COALESCE(p_first_name, first_name),
        last_name = COALESCE(p_last_name, last_name),
        full_name = COALESCE(p_full_name, full_name),
        phone = COALESCE(p_phone, phone),
        employee_number = COALESCE(p_employee_number, employee_number),
        township = COALESCE(p_township, township),
        address = COALESCE(p_address, address),
        work_id = COALESCE(p_work_id, work_id),
        date_of_birth = COALESCE(p_date_of_birth, date_of_birth),
        emergency_contact = COALESCE(p_emergency_contact, emergency_contact),
        emergency_contact_phone = COALESCE(p_emergency_contact_phone, emergency_contact_phone),
        updated_at = NOW()
    WHERE id = 'b1b84587-6a12-43e9-85ef-d465cbf8ece3';
    
    -- Check if the update was successful
    IF FOUND THEN
        result := 'Super Admin information updated successfully';
    ELSE
        result := 'Super Admin not found or update failed';
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Show how to use the function
SELECT '=== HOW TO USE THE UPDATE FUNCTION ===' as info;
SELECT 'Example usage:' as info;
SELECT 'SELECT public.update_superadmin_info(''John'', ''Doe'', ''John Doe'', ''+27 11 555 1234'', ''EMP123'', ''Cape Town'', ''456 Oak Street, Cape Town, 8000'', ''WOZA-ADMIN-123'', ''1985-05-15'', ''Mary Doe'', ''+27 11 555 5678'');' as example;

-- Step 8: Final verification
SELECT '=== FINAL VERIFICATION ===' as info;

-- Show the complete Super Admin profile
SELECT 'Complete Super Admin Profile:' as info;
SELECT 
    'User ID: ' || u.id as user_id,
    'Email: ' || u.email as email,
    'Full Name: ' || u.full_name as full_name,
    'Phone: ' || COALESCE(u.phone, 'Not set') as phone,
    'Employee Number: ' || COALESCE(u.employee_number, 'Not set') as employee_number,
    'Township: ' || COALESCE(u.township, 'Not set') as township,
    'Address: ' || COALESCE(u.address, 'Not set') as address,
    'Work ID: ' || COALESCE(u.work_id, 'Not set') as work_id,
    'Date of Birth: ' || COALESCE(u.date_of_birth::text, 'Not set') as date_of_birth,
    'Emergency Contact: ' || COALESCE(u.emergency_contact, 'Not set') as emergency_contact,
    'Emergency Contact Phone: ' || COALESCE(u.emergency_contact_phone, 'Not set') as emergency_contact_phone,
    'Role: ' || r.name as role,
    'Status: ' || u.status as status,
    'Approved: ' || CASE WHEN u.is_approved THEN 'Yes' ELSE 'No' END as approved
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
WHERE u.id = 'b1b84587-6a12-43e9-85ef-d465cbf8ece3';

SELECT '=== SUPER ADMIN UPDATE COMPLETE ===' as info;
SELECT 'You can now update the Super Admin information by modifying the values in this script and running it again.' as info;
SELECT 'Or use the update_superadmin_info() function for quick updates.' as info;
