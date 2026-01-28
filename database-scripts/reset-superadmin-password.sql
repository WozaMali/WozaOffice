-- ============================================================================
-- RESET SUPERADMIN PASSWORD
-- ============================================================================

-- Method 1: Update password directly (if you have the encrypted password)
-- Note: This requires the password to be properly hashed
-- UPDATE auth.users 
-- SET encrypted_password = crypt('your_new_password', gen_salt('bf'))
-- WHERE email = 'superadmin@wozamali.co.za';

-- Method 2: Check current user status first
SELECT 'Current superadmin status:' as info;
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at,
    last_sign_in_at,
    encrypted_password IS NOT NULL as has_password
FROM auth.users 
WHERE email = 'superadmin@wozamali.co.za';

-- Method 3: If user doesn't exist, you'll need to create it via Supabase Auth UI
-- or use the Supabase Admin API

-- RECOMMENDED: Use Supabase Dashboard > Authentication > Users
-- to reset the password for superadmin@wozamali.co.za