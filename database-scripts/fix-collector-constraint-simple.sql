-- ============================================================================
-- SIMPLE FIX FOR COLLECTOR CONSTRAINT ISSUE
-- ============================================================================
-- This script fixes the valid_collector_id constraint issue

-- 1. Check the constraint definition
-- ============================================================================

SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'valid_collector_id'
AND conrelid = 'public.user_profiles'::regclass;

-- 2. Find the correct collector ID from auth.users
-- ============================================================================

SELECT 
  'Correct collector ID:' as info,
  id,
  email,
  raw_user_meta_data->>'full_name' as full_name
FROM auth.users 
WHERE email = 'dumi@wozamali.co.za'
LIMIT 1;

-- 3. Create collector profile with correct ID
-- ============================================================================

-- First, let's get the actual collector ID
DO $$
DECLARE
  collector_id UUID;
BEGIN
  -- Get the collector ID from auth.users
  SELECT id INTO collector_id
  FROM auth.users 
  WHERE email = 'dumi@wozamali.co.za'
  LIMIT 1;
  
  IF collector_id IS NOT NULL THEN
    -- Insert the correct collector profile
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
      'dumi@wozamali.co.za',
      'Dumi Mngqi',
      'collector',
      'active',
      NOW(),
      NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      email = 'dumi@wozamali.co.za',
      full_name = 'Dumi Mngqi',
      role = 'collector',
      status = 'active',
      updated_at = NOW();
    
    RAISE NOTICE 'Collector profile created/updated for ID: %', collector_id;
  ELSE
    RAISE NOTICE 'Collector not found in auth.users';
  END IF;
END $$;

-- 4. Verify the fix
-- ============================================================================

SELECT 
  'Collector profile created:' as status,
  id,
  email,
  full_name,
  role,
  status
FROM public.user_profiles 
WHERE email = 'dumi@wozamali.co.za';

-- 5. Test collection creation
-- ============================================================================

-- This should now work without constraint errors
SELECT 'Ready to test collection creation!' as status;
