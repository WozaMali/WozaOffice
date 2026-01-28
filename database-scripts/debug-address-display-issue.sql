-- ============================================================================
-- DEBUG ADDRESS DISPLAY ISSUE
-- ============================================================================
-- This script checks why addresses are not showing up in the popup

-- Step 1: Check if there are any customer profiles
SELECT 
    'Customer Profiles Check' as step,
    COUNT(*) as total_profiles,
    COUNT(*) FILTER (WHERE role = 'member') as member_profiles,
    COUNT(*) FILTER (WHERE is_active = true) as active_profiles
FROM public.profiles;

-- Step 2: Check if there are any user addresses
SELECT 
    'User Addresses Check' as step,
    COUNT(*) as total_addresses,
    COUNT(*) FILTER (WHERE is_active = true) as active_addresses,
    COUNT(*) FILTER (WHERE is_default = true) as default_addresses
FROM public.user_addresses;

-- Step 3: Check the relationship between profiles and addresses
SELECT 
    'Profile-Address Relationship' as step,
    p.id as profile_id,
    p.email,
    p.first_name,
    p.last_name,
    p.role,
    p.is_active as profile_active,
    COUNT(ua.id) as address_count
FROM public.profiles p
LEFT JOIN public.user_addresses ua ON p.id = ua.user_id
WHERE p.role = 'member' AND p.is_active = true
GROUP BY p.id, p.email, p.first_name, p.last_name, p.role, p.is_active
ORDER BY p.email;

-- Step 4: Check specific address details for active members
SELECT 
    'Address Details for Active Members' as step,
    p.email as member_email,
    p.first_name,
    p.last_name,
    ua.id as address_id,
    ua.user_id,
    ua.address_type,
    ua.address_line1,
    ua.city,
    ua.is_default,
    ua.is_active as address_active
FROM public.profiles p
LEFT JOIN public.user_addresses ua ON p.id = ua.user_id
WHERE p.role = 'member' AND p.is_active = true
ORDER BY p.email, ua.is_default DESC;

-- Step 5: Check if there are any addresses with the specific address_id that was mentioned in the error
SELECT 
    'Specific Address ID Check' as step,
    id,
    user_id,
    address_type,
    address_line1,
    city,
    is_default,
    is_active,
    created_at
FROM public.user_addresses
WHERE id = 'ada39fb9-b06f-4afd-af90-ec5fc0daa2c2';

-- Step 6: Check if there are any addresses for the profile that owns that address
SELECT 
    'Profile for Specific Address' as step,
    p.id as profile_id,
    p.email,
    p.first_name,
    p.last_name,
    p.role,
    p.is_active
FROM public.profiles p
JOIN public.user_addresses ua ON p.id = ua.user_id
WHERE ua.id = 'ada39fb9-b06f-4afd-af90-ec5fc0daa2c2';
