-- ============================================================================
-- DEBUG ADDRESS ID ISSUE
-- ============================================================================
-- This script helps debug why the address_id is not found in user_addresses table

-- Step 1: Check if the specific address_id exists in user_addresses
SELECT 
    'Checking Specific Address ID' as step,
    id,
    profile_id,
    address_type,
    address_line1,
    city,
    is_active,
    created_at
FROM public.user_addresses 
WHERE id = 'ada39fb9-b06f-4afd-af90-ec5fc0daa2c2';

-- Step 2: Check if this address_id exists in the old addresses table
SELECT 
    'Checking Old Addresses Table' as step,
    id,
    profile_id,
    address_line1,
    city,
    created_at
FROM public.addresses 
WHERE id = 'ada39fb9-b06f-4afd-af90-ec5fc0daa2c2';

-- Step 3: Check all addresses in user_addresses table
SELECT 
    'All User Addresses' as step,
    COUNT(*) as total_addresses,
    COUNT(*) FILTER (WHERE is_active = true) as active_addresses,
    COUNT(*) FILTER (WHERE address_type = 'primary') as primary_addresses,
    COUNT(*) FILTER (WHERE address_type = 'pickup') as pickup_addresses
FROM public.user_addresses;

-- Step 4: Show sample addresses from user_addresses
SELECT 
    'Sample User Addresses' as step,
    id,
    profile_id,
    address_type,
    address_line1,
    city,
    is_active
FROM public.user_addresses 
ORDER BY created_at DESC 
LIMIT 5;

-- Step 5: Check if there are any addresses in the old addresses table
SELECT 
    'Old Addresses Table Check' as step,
    COUNT(*) as total_old_addresses
FROM public.addresses;

-- Step 6: Check profiles table to see if users exist
SELECT 
    'Profiles Check' as step,
    COUNT(*) as total_profiles,
    COUNT(*) FILTER (WHERE role = 'member') as member_profiles
FROM public.profiles;

-- Step 7: Check if there's a mismatch in profile_id references
SELECT 
    'Profile ID Mismatch Check' as step,
    ua.profile_id,
    p.id as profile_id_from_profiles,
    p.role,
    COUNT(*) as address_count
FROM public.user_addresses ua
LEFT JOIN public.profiles p ON ua.profile_id = p.id
GROUP BY ua.profile_id, p.id, p.role
ORDER BY address_count DESC
LIMIT 10;

-- Step 8: Check for any orphaned addresses (addresses without corresponding profiles)
SELECT 
    'Orphaned Addresses Check' as step,
    ua.id,
    ua.profile_id,
    ua.address_type,
    ua.address_line1,
    ua.city
FROM public.user_addresses ua
LEFT JOIN public.profiles p ON ua.profile_id = p.id
WHERE p.id IS NULL
LIMIT 5;
