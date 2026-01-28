-- ============================================================================
-- CHECK SUPERADMIN USER AND RESET PASSWORD
-- ============================================================================

-- Check if superadmin user exists
SELECT 'Checking superadmin user:' as info;
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at,
    last_sign_in_at
FROM auth.users 
WHERE email = 'superadmin@wozamali.co.za';

-- Check if superadmin exists in users table
SELECT 'Checking users table:' as info;
SELECT 
    id,
    email,
    first_name,
    last_name,
    role_id,
    status
FROM users 
WHERE email = 'superadmin@wozamali.co.za';

-- If superadmin doesn't exist, create one
-- Note: You'll need to use Supabase Auth UI or API to create the user
-- This is just for reference
SELECT 'To create superadmin user, use Supabase Auth UI or run this in Supabase Dashboard:' as info;
SELECT '1. Go to Authentication > Users' as step;
SELECT '2. Click "Add User"' as step;
SELECT '3. Email: superadmin@wozamali.co.za' as step;
SELECT '4. Password: [your chosen password]' as step;
SELECT '5. Confirm email: Yes' as step;
