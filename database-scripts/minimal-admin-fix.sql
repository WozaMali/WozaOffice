-- ============================================================================
-- MINIMAL ADMIN FIX - PRESERVE EXISTING FUNCTIONALITY
-- ============================================================================
-- This script provides minimal fixes without breaking existing functionality

-- ============================================================================
-- STEP 1: CHECK CURRENT STATE
-- ============================================================================

SELECT 'CURRENT UNIFIED_COLLECTIONS STATUS:' as info;
SELECT 
    status,
    COUNT(*) as count,
    SUM(total_weight_kg) as total_weight,
    SUM(total_value) as total_value
FROM public.unified_collections
GROUP BY status
ORDER BY count DESC;

-- ============================================================================
-- STEP 2: GRANT MINIMAL PERMISSIONS (ONLY IF NEEDED)
-- ============================================================================

-- Only grant UPDATE permission if it doesn't exist
DO $$
BEGIN
    -- Check if admin already has UPDATE permission
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_privileges 
        WHERE table_name = 'unified_collections' 
        AND table_schema = 'public'
        AND grantee = 'authenticated'
        AND privilege_type = 'UPDATE'
    ) THEN
        -- Grant UPDATE permission
        GRANT UPDATE ON public.unified_collections TO authenticated;
        RAISE NOTICE 'UPDATE permission granted to authenticated users';
    ELSE
        RAISE NOTICE 'UPDATE permission already exists for authenticated users';
    END IF;
END $$;

-- ============================================================================
-- STEP 3: CREATE MINIMAL RLS POLICY (ONLY IF NEEDED)
-- ============================================================================

-- Only create policy if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'unified_collections' 
        AND policyname = 'Admin can update collections'
    ) THEN
        -- Create minimal admin policy
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
        RAISE NOTICE 'Admin update policy created for unified_collections';
    ELSE
        RAISE NOTICE 'Admin update policy already exists for unified_collections';
    END IF;
END $$;

-- ============================================================================
-- STEP 4: VERIFY PERMISSIONS
-- ============================================================================

SELECT 'CURRENT PERMISSIONS FOR UNIFIED_COLLECTIONS:' as info;
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'unified_collections' 
AND table_schema = 'public'
ORDER BY grantee, privilege_type;

-- ============================================================================
-- STEP 5: SUCCESS MESSAGE
-- ============================================================================

SELECT 'MINIMAL FIX COMPLETE!' as result;
SELECT 'Existing functionality preserved' as message;
SELECT 'Admin should now be able to update collection status' as status;
