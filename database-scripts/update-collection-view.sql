-- ============================================================================
-- UPDATE COLLECTION MEMBER USER ADDRESSES VIEW
-- ============================================================================
-- Add individual name fields to the view for better compatibility

-- Drop and recreate the view with additional name fields
DROP VIEW IF EXISTS public.collection_member_user_addresses_view;

CREATE OR REPLACE VIEW public.collection_member_user_addresses_view AS
SELECT 
    ua.id as address_id,
    ua.user_id as member_id,
    p.full_name as member_name,
    p.first_name,
    p.last_name,
    p.username,
    p.phone as member_phone,
    p.email as member_email,
    p.role,
    p.is_active as member_is_active,
    p.created_at as member_since,
    ua.address_type,
    ua.address_line1,
    ua.address_line2,
    ua.city,
    ua.province,
    ua.postal_code,
    ua.coordinates,
    ua.is_default,
    ua.is_active as address_is_active,
    ua.notes,
    ua.created_at as address_created,
    ua.updated_at as address_updated,
    -- Formatted address for display
    CONCAT(
        COALESCE(ua.address_line1, ''), 
        CASE WHEN ua.address_line2 IS NOT NULL AND ua.address_line2 != '' THEN ', ' || ua.address_line2 ELSE '' END,
        CASE WHEN ua.city IS NOT NULL AND ua.city != '' THEN ', ' || ua.city ELSE '' END,
        CASE WHEN ua.province IS NOT NULL AND ua.province != '' THEN ', ' || ua.province ELSE '' END
    ) as display_address,
    -- Collection history
    COUNT(pk.id) as total_collections,
    MAX(pk.created_at) as last_collection_date,
    -- Status indicators
    CASE 
        WHEN COUNT(pk.id) = 0 THEN 'new_customer'
        WHEN MAX(pk.created_at) > NOW() - INTERVAL '30 days' THEN 'active'
        WHEN MAX(pk.created_at) > NOW() - INTERVAL '90 days' THEN 'inactive'
        ELSE 'dormant'
    END as customer_status
FROM public.user_addresses ua
LEFT JOIN public.profiles p ON ua.user_id = p.id
LEFT JOIN public.collection_pickups pk ON ua.id = pk.pickup_address_id
WHERE p.role = 'member'
GROUP BY 
    ua.id, ua.user_id, p.full_name, p.first_name, p.last_name, p.username, 
    p.phone, p.email, p.role, p.is_active, p.created_at,
    ua.address_type, ua.address_line1, ua.address_line2, ua.city, ua.province, 
    ua.postal_code, ua.coordinates, ua.is_default, ua.is_active, ua.notes, 
    ua.created_at, ua.updated_at
ORDER BY p.full_name, ua.address_type;

-- Grant permissions
GRANT SELECT ON public.collection_member_user_addresses_view TO authenticated;

-- Test the updated view
SELECT 
    'Updated View Test' as test_type,
    member_id,
    member_name,
    first_name,
    last_name,
    username,
    member_email,
    address_type,
    address_line1,
    city
FROM public.collection_member_user_addresses_view
LIMIT 3;
