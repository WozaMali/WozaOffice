-- ============================================================================
-- DEBUG SERVICE FUNCTION ISSUE
-- ============================================================================
-- This script helps debug why the service function isn't returning addresses

-- Step 1: Check if the service function is filtering correctly
-- Simulate what the service function should return
SELECT 
    'Service Function Simulation' as step,
    p.id as profile_id,
    p.email,
    p.first_name,
    p.last_name,
    p.role,
    p.is_active as profile_active,
    ua.id as address_id,
    ua.user_id,
    ua.address_type,
    ua.address_line1,
    ua.city,
    ua.is_default,
    ua.is_active as address_active
FROM public.profiles p
LEFT JOIN public.user_addresses ua ON p.id = ua.user_id AND ua.is_active = true
WHERE p.role = 'member' 
AND p.is_active = true
ORDER BY p.email, ua.is_default DESC;

-- Step 2: Check if there are any authentication issues
-- Check if the profiles are being filtered correctly
SELECT 
    'Profile Filtering Check' as step,
    COUNT(*) as total_profiles,
    COUNT(*) FILTER (WHERE role = 'member') as member_profiles,
    COUNT(*) FILTER (WHERE is_active = true) as active_profiles,
    COUNT(*) FILTER (WHERE role = 'member' AND is_active = true) as active_member_profiles
FROM public.profiles;

-- Step 3: Check if addresses are being filtered correctly
SELECT 
    'Address Filtering Check' as step,
    COUNT(*) as total_addresses,
    COUNT(*) FILTER (WHERE is_active = true) as active_addresses,
    COUNT(*) FILTER (WHERE is_default = true) as default_addresses
FROM public.user_addresses;

-- Step 4: Check the exact data that should be returned
SELECT 
    'Exact Data Check' as step,
    p.id as profile_id,
    p.email,
    p.first_name,
    p.last_name,
    COUNT(ua.id) as address_count,
    STRING_AGG(ua.address_line1 || ', ' || ua.city, '; ') as addresses
FROM public.profiles p
LEFT JOIN public.user_addresses ua ON p.id = ua.user_id AND ua.is_active = true
WHERE p.role = 'member' 
AND p.is_active = true
GROUP BY p.id, p.email, p.first_name, p.last_name
ORDER BY p.email;
