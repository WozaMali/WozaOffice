-- ============================================================================
-- TEST PICKUP FUNCTION WITH REAL DATA
-- ============================================================================
-- Run this in your Supabase SQL Editor to test the function

-- Step 1: Find a real pickup ID to test with
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
LIMIT 3;

-- Step 2: Copy one of the IDs from the results above and use it in this test
-- For example, if you got an ID like '123e4567-e89b-12d3-a456-426614174000'
-- Replace 'REPLACE_WITH_ACTUAL_ID' below with that actual ID

-- Step 3: Test the function with a real pickup ID
SELECT update_pickup_status(
    'REPLACE_WITH_ACTUAL_ID',  -- Replace this with an actual ID from Step 1
    'test_approved',
    'Function test successful'
);

-- Step 4: Verify the update worked
SELECT 
    id, 
    status, 
    approval_note,
    updated_at
FROM public.pickups 
WHERE id = 'REPLACE_WITH_ACTUAL_ID';  -- Same ID as above

-- Step 5: Revert the test update (optional)
SELECT update_pickup_status(
    'REPLACE_WITH_ACTUAL_ID',  -- Same ID as above
    'submitted',
    NULL
);

-- Step 6: Verify the revert worked
SELECT 
    id, 
    status, 
    approval_note,
    updated_at
FROM public.pickups 
WHERE id = 'REPLACE_WITH_ACTUAL_ID';  -- Same ID as above
