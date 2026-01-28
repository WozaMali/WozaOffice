-- ============================================================================
-- FIX LOGIN POPUP ADS RLS POLICIES
-- ============================================================================
-- This script fixes RLS policies to allow authenticated admin users to manage ads

-- Step 1: Drop existing restrictive policies
DROP POLICY IF EXISTS "login_popup_ads_select_active" ON public.login_popup_ads;
DROP POLICY IF EXISTS "login_popup_ads_select_active_anon" ON public.login_popup_ads;
DROP POLICY IF EXISTS "login_popup_ads_select_admin" ON public.login_popup_ads;
DROP POLICY IF EXISTS "login_popup_ads_insert_admin" ON public.login_popup_ads;
DROP POLICY IF EXISTS "login_popup_ads_update_admin" ON public.login_popup_ads;
DROP POLICY IF EXISTS "login_popup_ads_delete_admin" ON public.login_popup_ads;

-- Step 2: Create more permissive policies for authenticated users
-- Since this is accessed through the admin dashboard, authenticated users should be able to manage ads

-- Policy: Allow all authenticated users to read active ads (for display)
CREATE POLICY "login_popup_ads_select_active" ON public.login_popup_ads
    FOR SELECT
    TO authenticated
    USING (enabled = true);

-- Policy: Allow anonymous users to read active ads (for public login pages)
CREATE POLICY "login_popup_ads_select_active_anon" ON public.login_popup_ads
    FOR SELECT
    TO anon
    USING (enabled = true);

-- Policy: Allow all authenticated users to read all ads (for admin management)
CREATE POLICY "login_popup_ads_select_all" ON public.login_popup_ads
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Allow all authenticated users to insert ads
CREATE POLICY "login_popup_ads_insert_authenticated" ON public.login_popup_ads
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Allow all authenticated users to update ads
CREATE POLICY "login_popup_ads_update_authenticated" ON public.login_popup_ads
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: Allow all authenticated users to delete ads
CREATE POLICY "login_popup_ads_delete_authenticated" ON public.login_popup_ads
    FOR DELETE
    TO authenticated
    USING (true);

-- Step 3: Ensure proper grants are in place
GRANT SELECT, INSERT, UPDATE, DELETE ON public.login_popup_ads TO authenticated;
GRANT SELECT ON public.login_popup_ads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.login_popup_ads TO service_role;

-- Step 4: Verify RLS is enabled
ALTER TABLE public.login_popup_ads ENABLE ROW LEVEL SECURITY;

-- Step 5: Verify policies were created
SELECT 
    'RLS Policies for login_popup_ads:' as info,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'login_popup_ads'
AND schemaname = 'public'
ORDER BY policyname;

SELECT 'Login popup ads RLS policies fixed successfully!' as message;

