-- ============================================================================
-- FIX MISSING COLLECTOR PROFILE
-- ============================================================================
-- This script creates a collector profile for the missing collector ID
-- Run this in your Supabase SQL Editor

-- 1. Check if the collector ID exists in auth.users
-- ============================================================================

SELECT 
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users 
WHERE id = '90341fc7-d088-4824-9a1f-c2870d1486e1';

-- 2. Create the missing collector profile
-- ============================================================================

INSERT INTO public.user_profiles (
  id,
  user_id,
  email,
  full_name,
  role,
  status,
  created_at,
  updated_at
) VALUES (
  '90341fc7-d088-4824-9a1f-c2870d1486e1',
  '90341fc7-d088-4824-9a1f-c2870d1486e1',
  'collector@wozamali.com', -- Placeholder email
  'Collector', -- Placeholder name
  'collector',
  'active',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 3. Verify the profile was created
-- ============================================================================

SELECT 
  id,
  email,
  full_name,
  role,
  status,
  created_at
FROM public.user_profiles 
WHERE id = '90341fc7-d088-4824-9a1f-c2870d1486e1';

-- 4. Create a function to handle missing collector profiles automatically
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ensure_collector_profile(
  collector_id UUID,
  collector_email TEXT DEFAULT NULL,
  collector_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  profile_id UUID;
BEGIN
  -- Check if profile exists
  SELECT id INTO profile_id
  FROM public.user_profiles
  WHERE id = collector_id;
  
  -- If profile doesn't exist, create it
  IF profile_id IS NULL THEN
    INSERT INTO public.user_profiles (
      id,
      user_id,
      email,
      full_name,
      role,
      status,
      created_at,
      updated_at
    ) VALUES (
      collector_id,
      collector_id,
      COALESCE(collector_email, 'collector@wozamali.com'),
      COALESCE(collector_name, 'Collector'),
      'collector',
      'active',
      NOW(),
      NOW()
    ) RETURNING id INTO profile_id;
    
    RAISE NOTICE 'Created collector profile for ID: %', collector_id;
  END IF;
  
  RETURN profile_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.ensure_collector_profile TO authenticated;

-- 5. Create a trigger to automatically create collector profiles
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_create_collector_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure collector profile exists before inserting collection
  IF NEW.collector_id IS NOT NULL THEN
    PERFORM public.ensure_collector_profile(NEW.collector_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on unified_collections table
DROP TRIGGER IF EXISTS trigger_auto_create_collector_profile ON public.unified_collections;

CREATE TRIGGER trigger_auto_create_collector_profile
  BEFORE INSERT ON public.unified_collections
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_collector_profile();

-- 6. Test the fix
-- ============================================================================

-- Test the function
SELECT public.ensure_collector_profile('90341fc7-d088-4824-9a1f-c2870d1486e1');

-- Verify the profile exists
SELECT 
  id,
  email,
  full_name,
  role,
  status
FROM public.user_profiles 
WHERE id = '90341fc7-d088-4824-9a1f-c2870d1486e1';

-- 7. Success message
-- ============================================================================

SELECT 'Collector profile fix completed successfully!' as status;
