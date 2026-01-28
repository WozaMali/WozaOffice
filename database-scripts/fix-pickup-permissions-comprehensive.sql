-- ============================================================================
-- COMPREHENSIVE FIX FOR PICKUP TABLE PERMISSIONS
-- ============================================================================
-- Run this in your Supabase SQL Editor to fix admin update permissions

-- 1. Check table ownership and current permissions
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'pickups';

-- 2. Check if RLS is enabled and what policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'pickups';

-- 3. Check current grants on the table
SELECT 
    grantee,
    table_name,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'pickups';

-- 4. Try to grant permissions as the table owner (usually 'postgres' or 'supabase_admin')
-- First, let's see who can grant permissions:
SELECT 
    n.nspname as schema_name,
    c.relname as table_name,
    a.rolname as owner_name
FROM pg_class c
JOIN pg_roles a ON a.oid = c.relowner
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'pickups';

-- 5. Grant permissions using the proper owner context
-- If you're logged in as the table owner, this should work:
GRANT ALL PRIVILEGES ON public.pickups TO authenticated;

-- 6. Alternative: Grant specific permissions one by one
GRANT SELECT ON public.pickups TO authenticated;
GRANT INSERT ON public.pickups TO authenticated;
GRANT UPDATE ON public.pickups TO authenticated;
GRANT DELETE ON public.pickups TO authenticated;

-- 7. Verify permissions were granted
SELECT 
    grantee,
    table_name,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'pickups' 
AND grantee = 'authenticated'
ORDER BY privilege_type;

-- 8. If permissions still don't work, check RLS policies
-- You might need to create or modify RLS policies to allow updates
-- Here's a basic RLS policy that allows authenticated users to update pickups:

-- First, check if RLS is enabled:
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'pickups';

-- If RLS is enabled, you might need to create a policy like this:
-- CREATE POLICY "Allow authenticated users to update pickups" ON public.pickups
--     FOR UPDATE TO authenticated
--     USING (true)
--     WITH CHECK (true);

-- 9. Test the permissions (after granting them)
-- Find a pickup to test with:
SELECT 
    id, 
    status, 
    customer_id, 
    collector_id,
    total_kg,
    created_at
FROM public.pickups 
WHERE status = 'submitted'
LIMIT 1;

-- 10. If you want to test an update, uncomment and modify this:
-- UPDATE public.pickups 
-- SET status = 'test_approved', 
--     approval_note = 'Permission test successful', 
--     updated_at = NOW()
-- WHERE id = 'REPLACE_WITH_ACTUAL_PICKUP_ID'
-- RETURNING id, status, approval_note, updated_at;
