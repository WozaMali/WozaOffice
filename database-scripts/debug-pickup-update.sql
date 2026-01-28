-- ============================================================================
-- DEBUG PICKUP UPDATE ISSUE
-- ============================================================================
-- Run this to understand why the function returned false

-- 1. Check if the pickup ID actually exists
SELECT 
    id, 
    status, 
    customer_id, 
    collector_id,
    total_kg,
    created_at,
    updated_at
FROM public.pickups 
WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';  -- Replace with your actual ID

-- 2. Check all pickups to see what statuses exist
SELECT 
    status,
    COUNT(*) as count
FROM public.pickups 
GROUP BY status
ORDER BY count DESC;

-- 3. Check recent pickups to see what's available
SELECT 
    id, 
    status, 
    customer_id, 
    collector_id,
    total_kg,
    created_at
FROM public.pickups 
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check if there are any pickups with 'submitted' status
SELECT 
    id, 
    status, 
    customer_id, 
    collector_id,
    total_kg,
    created_at
FROM public.pickups 
WHERE status = 'submitted'
ORDER BY created_at DESC
LIMIT 5;

-- 5. If no 'submitted' pickups exist, check what the actual status values are
SELECT DISTINCT status FROM public.pickups ORDER BY status;

-- 6. Test the function with a pickup that actually exists
-- First, get a pickup ID that definitely exists:
SELECT id, status FROM public.pickups LIMIT 1;

-- Then test with that ID (replace PICKUP_ID_HERE with actual ID from above):
-- SELECT update_pickup_status(
--     'PICKUP_ID_HERE',
--     'test_approved',
--     'Function test successful'
-- );
