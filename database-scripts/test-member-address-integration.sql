-- ============================================================================
-- TEST MEMBER ADDRESS INTEGRATION
-- ============================================================================
-- This script tests the new member address integration to ensure everything
-- is working correctly with the member page components

-- ============================================================================
-- STEP 1: VERIFY VIEWS HAVE DATA
-- ============================================================================

-- Test basic member addresses view
SELECT 
    'Basic Member View Test' as test_type,
    COUNT(*) as total_addresses,
    COUNT(DISTINCT member_id) as unique_members,
    COUNT(*) FILTER (WHERE address_type = 'primary') as primary_addresses,
    COUNT(*) FILTER (WHERE address_type = 'pickup') as pickup_addresses,
    COUNT(*) FILTER (WHERE is_default = true) as default_addresses
FROM public.member_user_addresses_view;

-- Test collection app view
SELECT 
    'Collection App View Test' as test_type,
    COUNT(*) as total_addresses,
    COUNT(DISTINCT member_id) as unique_members,
    COUNT(*) FILTER (WHERE customer_status = 'active') as active_customers,
    COUNT(*) FILTER (WHERE customer_status = 'new_customer') as new_customers,
    COUNT(*) FILTER (WHERE address_type = 'pickup') as pickup_addresses
FROM public.collection_member_user_addresses_view;

-- Test office app view
SELECT 
    'Office App View Test' as test_type,
    COUNT(*) as total_addresses,
    COUNT(DISTINCT member_id) as unique_members,
    COUNT(*) FILTER (WHERE total_pickups > 0) as addresses_with_pickups,
    COUNT(*) FILTER (WHERE wallet_balance > 0) as addresses_with_balance,
    COUNT(*) FILTER (WHERE address_type = 'primary') as primary_addresses
FROM public.office_member_user_addresses_view;

-- ============================================================================
-- STEP 2: TEST ADDRESS TYPE DISTRIBUTION
-- ============================================================================

SELECT 
    'Address Type Distribution' as test_type,
    address_type,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE is_default = true) as default_count,
    COUNT(*) FILTER (WHERE is_active = true) as active_count
FROM public.user_addresses
GROUP BY address_type
ORDER BY address_type;

-- ============================================================================
-- STEP 3: TEST MEMBER ADDRESS RELATIONSHIPS
-- ============================================================================

-- Check members with multiple addresses
SELECT 
    'Members with Multiple Addresses' as test_type,
    member_id,
    full_name,
    COUNT(*) as address_count,
    STRING_AGG(address_type, ', ' ORDER BY address_type) as address_types,
    STRING_AGG(
        CASE WHEN is_default THEN address_type || ' (default)' ELSE address_type END, 
        ', ' 
        ORDER BY address_type
    ) as address_types_with_defaults
FROM public.member_user_addresses_view
GROUP BY member_id, full_name
HAVING COUNT(*) > 1
ORDER BY address_count DESC;

-- ============================================================================
-- STEP 4: TEST DEFAULT ADDRESS MANAGEMENT
-- ============================================================================

-- Check default address distribution
SELECT 
    'Default Address Distribution' as test_type,
    address_type,
    COUNT(*) as total_addresses,
    COUNT(*) FILTER (WHERE is_default = true) as default_addresses,
    ROUND(
        (COUNT(*) FILTER (WHERE is_default = true)::decimal / COUNT(*)) * 100, 
        2
    ) as default_percentage
FROM public.user_addresses
WHERE is_active = true
GROUP BY address_type
ORDER BY address_type;

-- ============================================================================
-- STEP 5: TEST COLLECTION READINESS
-- ============================================================================

-- Members ready for collection (have pickup addresses)
SELECT 
    'Collection Ready Members' as test_type,
    COUNT(DISTINCT member_id) as members_with_pickup_addresses,
    COUNT(*) as total_pickup_addresses,
    COUNT(*) FILTER (WHERE is_default = true) as default_pickup_addresses
FROM public.member_user_addresses_view
WHERE address_type = 'pickup';

-- ============================================================================
-- STEP 6: TEST WALLET AND POINTS INTEGRATION
-- ============================================================================

-- Check wallet integration
SELECT 
    'Wallet Integration Test' as test_type,
    COUNT(*) as total_members,
    COUNT(*) FILTER (WHERE wallet_balance > 0) as members_with_balance,
    COUNT(*) FILTER (WHERE total_points > 0) as members_with_points,
    COUNT(*) FILTER (WHERE tier IS NOT NULL) as members_with_tier,
    ROUND(AVG(wallet_balance), 2) as avg_wallet_balance,
    ROUND(AVG(total_points), 0) as avg_total_points
FROM public.office_member_user_addresses_view;

-- ============================================================================
-- STEP 7: SAMPLE DATA FOR TESTING
-- ============================================================================

-- Show sample member with all address types
SELECT 
    'Sample Member Data' as test_type,
    member_id,
    full_name,
    email,
    address_type,
    address_line1,
    city,
    province,
    is_default,
    wallet_balance,
    total_points,
    tier
FROM public.office_member_user_addresses_view
WHERE member_id IN (
    SELECT member_id 
    FROM public.office_member_user_addresses_view 
    GROUP BY member_id 
    HAVING COUNT(DISTINCT address_type) >= 2
    LIMIT 1
)
ORDER BY 
    CASE address_type 
        WHEN 'primary' THEN 1 
        WHEN 'pickup' THEN 2 
        WHEN 'secondary' THEN 3 
        WHEN 'billing' THEN 4 
        ELSE 5 
    END;

-- ============================================================================
-- STEP 8: TEST ADDRESS FORMATTING
-- ============================================================================

-- Test address formatting for display
SELECT 
    'Address Formatting Test' as test_type,
    member_id,
    full_name,
    address_type,
    CONCAT(
        address_line1,
        CASE WHEN address_line2 IS NOT NULL THEN ', ' || address_line2 ELSE '' END,
        ', ', city, ', ', province,
        CASE WHEN postal_code IS NOT NULL THEN ', ' || postal_code ELSE '' END
    ) as formatted_address,
    CASE WHEN is_default THEN '⭐ Default' ELSE '' END as default_indicator
FROM public.member_user_addresses_view
LIMIT 10;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- Integration test complete! 🎉
-- 
-- Expected Results:
-- 1. All views should return data (not 0 results)
-- 2. Address types should be distributed across primary, pickup, secondary, billing
-- 3. Default addresses should be properly managed (one per type per member)
-- 4. Members should have wallet balances and points
-- 5. Collection readiness should show members with pickup addresses
-- 
-- If any test returns 0 results, run the populate-user-addresses.sql script first.
-- 
-- Next steps:
-- 1. Verify all tests pass
-- 2. Test the React components with this data
-- 3. Ensure the member page displays correctly
-- 4. Test address management functionality
