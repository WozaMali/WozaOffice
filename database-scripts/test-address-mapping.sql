-- ============================================================================
-- TEST ADDRESS MAPPING
-- ============================================================================
-- This script tests the exact address mapping logic

-- Step 1: Get the exact profile IDs and addresses that should match
SELECT 
    'Profile and Address Mapping Test' as step,
    p.id as profile_id,
    p.email,
    p.first_name,
    p.last_name,
    ua.id as address_id,
    ua.user_id as address_user_id,
    ua.address_line1,
    ua.city,
    CASE 
        WHEN p.id = ua.user_id THEN 'MATCH' 
        ELSE 'NO MATCH' 
    END as id_match
FROM public.profiles p
LEFT JOIN public.user_addresses ua ON p.id = ua.user_id
WHERE p.role = 'member' 
AND p.is_active = true
ORDER BY p.email;

-- Step 2: Check data type for profiles.id
SELECT 
    'Data Type Check - Profiles' as step,
    'profiles.id' as table_column,
    pg_typeof(id) as data_type,
    id as sample_value
FROM public.profiles 
WHERE role = 'member' 
LIMIT 1;

-- Step 2b: Check data type for user_addresses.user_id
SELECT 
    'Data Type Check - Addresses' as step,
    'user_addresses.user_id' as table_column,
    pg_typeof(user_id) as data_type,
    user_id as sample_value
FROM public.user_addresses 
LIMIT 1;

-- Step 3: Check for any NULL or empty values in profiles
SELECT 
    'NULL Check - Profiles' as step,
    COUNT(*) as total_profiles,
    COUNT(*) FILTER (WHERE id IS NULL) as null_profile_ids,
    COUNT(*) FILTER (WHERE email IS NULL) as null_emails
FROM public.profiles 
WHERE role = 'member' AND is_active = true;

-- Step 4: Check for any NULL or empty values in addresses
SELECT 
    'NULL Check - Addresses' as step,
    COUNT(*) as total_addresses,
    COUNT(*) FILTER (WHERE user_id IS NULL) as null_user_ids,
    COUNT(*) FILTER (WHERE address_line1 IS NULL) as null_addresses
FROM public.user_addresses 
WHERE is_active = true;
