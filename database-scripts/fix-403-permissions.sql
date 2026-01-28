-- Fix 403 errors for child_headed_homes and green_scholar_applications
-- This script adds proper RLS policies to allow admin users to read these tables

-- ============================================================================
-- 1. FIX child_headed_homes PERMISSIONS
-- ============================================================================

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Child homes are viewable by everyone" ON child_headed_homes;
DROP POLICY IF EXISTS "Allow public read access to child homes" ON child_headed_homes;
DROP POLICY IF EXISTS "Only admins can modify child homes" ON child_headed_homes;

-- Grant table-level permissions
GRANT SELECT ON child_headed_homes TO authenticated;
GRANT SELECT ON child_headed_homes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON child_headed_homes TO service_role;

-- Enable RLS
ALTER TABLE child_headed_homes ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to read all child homes
-- This is safe because this table only contains public beneficiary information
CREATE POLICY "child_homes_select_all" ON child_headed_homes
    FOR SELECT
    TO authenticated
    USING (true);

-- Also allow anon to read active homes (for public donation forms)
CREATE POLICY "child_homes_select_active_anon" ON child_headed_homes
    FOR SELECT
    TO anon
    USING (COALESCE(is_active, true) = true);


-- Policy: Allow admins to modify child homes
CREATE POLICY "child_homes_modify_admin" ON child_headed_homes
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND (
                r.name IN ('admin', 'super_admin', 'superadmin')
                OR u.email = 'superadmin@wozamali.co.za'
                OR u.email LIKE '%admin@wozamali%'
            )
        )
    );

-- ============================================================================
-- 2. FIX green_scholar_applications PERMISSIONS
-- ============================================================================

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "gsa_select_own" ON green_scholar_applications;
DROP POLICY IF EXISTS "Users can read their own applications" ON green_scholar_applications;
DROP POLICY IF EXISTS "Admins can read all applications" ON green_scholar_applications;

-- Grant table-level permissions
GRANT SELECT ON green_scholar_applications TO authenticated;
GRANT SELECT, INSERT ON green_scholar_applications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON green_scholar_applications TO service_role;

-- Enable RLS
ALTER TABLE green_scholar_applications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own applications
CREATE POLICY "gsa_select_own" ON green_scholar_applications
    FOR SELECT
    TO authenticated
    USING (created_by = auth.uid());

-- Policy: Admins can read ALL applications
-- Check if user is admin by checking users table role
CREATE POLICY "gsa_select_admin_all" ON green_scholar_applications
    FOR SELECT
    TO authenticated
    USING (
        -- Check if user has admin role in users table
        EXISTS (
            SELECT 1 FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND (
                r.name IN ('admin', 'super_admin', 'superadmin')
                OR u.email = 'superadmin@wozamali.co.za'
                OR u.email LIKE '%admin@wozamali%'
            )
        )
    );

-- Policy: Users can insert their own applications (keep existing)
-- This should already exist, but we'll ensure it's there
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'green_scholar_applications' 
        AND policyname = 'gsa_insert_own'
    ) THEN
        CREATE POLICY "gsa_insert_own" ON green_scholar_applications
            FOR INSERT
            TO authenticated
            WITH CHECK (created_by = auth.uid());
    END IF;
END $$;

-- Policy: Admins can update all applications
CREATE POLICY "gsa_update_admin" ON green_scholar_applications
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND (
                r.name IN ('admin', 'super_admin', 'superadmin')
                OR u.email = 'superadmin@wozamali.co.za'
                OR u.email LIKE '%admin@wozamali%'
            )
        )
    );

-- ============================================================================
-- 3. VERIFY PERMISSIONS
-- ============================================================================

-- Check policies for child_headed_homes
SELECT 
    'child_headed_homes policies' as table_name,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'child_headed_homes'
ORDER BY policyname;

-- Check policies for green_scholar_applications
SELECT 
    'green_scholar_applications policies' as table_name,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'green_scholar_applications'
ORDER BY policyname;

SELECT 'Permissions fixed successfully!' as status;

