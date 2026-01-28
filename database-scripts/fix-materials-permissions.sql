-- Fix materials table permissions
-- This script ensures proper RLS policies and permissions for the materials table

-- Check if materials table exists and has data
SELECT 'Materials table check:' as info, COUNT(*) as count FROM public.materials;

-- Check current RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'materials' AND schemaname = 'public';

-- Ensure RLS is enabled
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Materials are viewable by all authenticated users" ON public.materials;

-- Create the correct policy
CREATE POLICY "Materials are viewable by all authenticated users" ON public.materials
    FOR SELECT USING (auth.role() = 'authenticated');

-- Grant necessary permissions
GRANT SELECT ON public.materials TO authenticated;
GRANT SELECT ON public.materials TO anon;

-- Test the policy
SELECT 'Policy created successfully' as status;

-- Show materials data
SELECT name, unit_price, is_active FROM public.materials ORDER BY name;
