-- ============================================================================
-- FIX PICKUP TABLE PERMISSIONS
-- ============================================================================
-- Run this in your Supabase SQL Editor to fix admin update permissions

-- 1. Grant UPDATE permission to authenticated users on pickups table
GRANT UPDATE ON public.pickups TO authenticated;

-- 2. Verify the permission was granted
SELECT 
    grantee,
    table_name,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'pickups' 
AND grantee = 'authenticated'
AND privilege_type = 'UPDATE';

-- 3. Test if we can now update a pickup (optional - uncomment to test)
-- First, find a submitted pickup to test with:
-- SELECT id, status FROM public.pickups WHERE status = 'submitted' LIMIT 1;

-- Then test the update (replace PICKUP_ID_HERE with actual ID):
-- UPDATE public.pickups 
-- SET status = 'test_approved', 
--     approval_note = 'Permission test', 
--     updated_at = NOW()
-- WHERE id = 'PICKUP_ID_HERE'
-- RETURNING id, status, approval_note, updated_at;

-- 4. Revert the test update (if you ran the test above):
-- UPDATE public.pickups 
-- SET status = 'submitted', 
--     approval_note = NULL, 
--     updated_at = NOW()
-- WHERE id = 'PICKUP_ID_HERE'
-- RETURNING id, status, approval_note, updated_at;
