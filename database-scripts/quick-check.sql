-- ============================================================================
-- QUICK DATABASE CHECK FOR WOZA MALI
-- ============================================================================

-- Check if profiles table exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') 
    THEN 'Table profiles exists' 
    ELSE 'Table profiles does not exist' 
  END as table_status;

-- Check existing policies
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'profiles';

-- Check if we have any users
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN role = 'ADMIN' THEN 1 END) as admin_count,
  COUNT(CASE WHEN role = 'STAFF' THEN 1 END) as staff_count,
  COUNT(CASE WHEN role = 'COLLECTOR' THEN 1 END) as collector_count
FROM profiles;

-- If no users exist, insert a default admin (modify as needed)
INSERT INTO profiles (id, email, username, first_name, last_name, role, is_active)
VALUES (
  gen_random_uuid(),
  'admin@wozamali.com',
  'admin',
  'System',
  'Administrator',
  'ADMIN',
  true
) ON CONFLICT (email) DO NOTHING;
