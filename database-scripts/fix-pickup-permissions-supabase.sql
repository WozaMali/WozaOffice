-- ============================================================================
-- SUPABASE-SPECIFIC PICKUP PERMISSIONS FIX
-- ============================================================================
-- Run this in your Supabase SQL Editor

-- Option 1: Try using the service role (if you have access)
-- This bypasses RLS and grants permissions directly
-- GRANT ALL PRIVILEGES ON public.pickups TO authenticated;

-- Option 2: Check if you're in the right role
SELECT current_user, current_role;

-- Option 3: Try granting as the postgres user
-- You might need to switch to the postgres role first
-- SET ROLE postgres;
-- GRANT UPDATE ON public.pickups TO authenticated;
-- RESET ROLE;

-- Option 4: Create a function that bypasses RLS for updates
-- This is a workaround if direct grants don't work

-- First, drop the existing function if it exists
DROP FUNCTION IF EXISTS update_pickup_status(uuid, text, text);
DROP FUNCTION IF EXISTS update_pickup_status(uuid, text);
DROP FUNCTION IF EXISTS update_pickup_status(text, text, text);

-- Now create the new function with renamed parameter to avoid ambiguity
CREATE OR REPLACE FUNCTION update_pickup_status(
    pickup_id UUID,
    new_status TEXT,
    note TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.pickups 
    SET 
        status = new_status,
        approval_note = note,
        updated_at = NOW()
    WHERE id = pickup_id;
    
    RETURN FOUND;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION update_pickup_status(UUID, TEXT, TEXT) TO authenticated;

-- Option 5: Check if there are any triggers or functions blocking updates
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'pickups';

-- Option 6: Temporarily disable RLS to test (DANGER - only for testing)
-- ALTER TABLE public.pickups DISABLE ROW LEVEL SECURITY;
-- Test your update
-- ALTER TABLE public.pickups ENABLE ROW LEVEL SECURITY;

-- Option 7: Create a new RLS policy that explicitly allows updates
-- First, check existing policies:
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'pickups';

-- If you need to create a new policy:
-- DROP POLICY IF EXISTS "Allow authenticated users to update pickups" ON public.pickups;
-- CREATE POLICY "Allow authenticated users to update pickups" ON public.pickups
--     FOR UPDATE TO authenticated
--     USING (true)
--     WITH CHECK (true);

-- Test the function approach (after creating it):
-- SELECT update_pickup_status(
--     'REPLACE_WITH_ACTUAL_PICKUP_ID',
--     'test_approved',
--     'Function test successful'
-- );
