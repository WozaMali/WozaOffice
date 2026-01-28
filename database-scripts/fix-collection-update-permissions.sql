-- ============================================================================
-- FIX COLLECTION UPDATE PERMISSIONS
-- ============================================================================
-- This script fixes permissions for updating unified_collections

-- ============================================================================
-- STEP 1: CHECK CURRENT PERMISSIONS
-- ============================================================================

SELECT 'CURRENT UNIFIED_COLLECTIONS PERMISSIONS:' as info;
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'unified_collections' 
AND table_schema = 'public'
ORDER BY grantee, privilege_type;

-- ============================================================================
-- STEP 2: GRANT UPDATE PERMISSIONS
-- ============================================================================

-- Grant UPDATE permission to authenticated users
GRANT UPDATE ON public.unified_collections TO authenticated;

-- Grant UPDATE permission to service_role
GRANT UPDATE ON public.unified_collections TO service_role;

-- ============================================================================
-- STEP 3: CREATE UPDATE POLICY
-- ============================================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Admin can update collections" ON public.unified_collections;
DROP POLICY IF EXISTS "Admin can manage all collections" ON public.unified_collections;

-- Create policy for admin users to update collections
CREATE POLICY "Admin can update collections" ON public.unified_collections
    FOR UPDATE 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

-- ============================================================================
-- STEP 4: VERIFY UPDATED PERMISSIONS
-- ============================================================================

SELECT 'UPDATED UNIFIED_COLLECTIONS PERMISSIONS:' as info;
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'unified_collections' 
AND table_schema = 'public'
ORDER BY grantee, privilege_type;

-- ============================================================================
-- STEP 5: CHECK RLS POLICIES
-- ============================================================================

SELECT 'RLS POLICIES FOR UNIFIED_COLLECTIONS:' as info;
SELECT 
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'unified_collections' 
AND schemaname = 'public'
ORDER BY policyname;

-- ============================================================================
-- STEP 6: SUCCESS MESSAGE
-- ============================================================================

SELECT 'SUCCESS: Collection update permissions fixed!' as result;
SELECT 'Admin can now update collection status' as message;
SELECT 'Try approving the pending pickups again' as status;
