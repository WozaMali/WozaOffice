-- ============================================================================
-- CHECK SUPABASE REDIRECT CONFIGURATION
-- ============================================================================

-- This script helps verify your Supabase redirect URL configuration
-- Run this in Supabase SQL Editor to check current settings

-- Check current auth configuration
SELECT 'Current Supabase Auth Configuration:' as info;

-- Note: These settings are managed in Supabase Dashboard, not via SQL
-- Go to: Authentication > URL Configuration

SELECT 'To fix the redirect issue:' as instruction;
SELECT '1. Go to Supabase Dashboard > Authentication > URL Configuration' as step;
SELECT '2. Set Site URL to: http://localhost:8081' as step;
SELECT '3. Add these Redirect URLs:' as step;
SELECT '   - http://localhost:8081' as redirect_url;
SELECT '   - http://localhost:8081/admin-login' as redirect_url;
SELECT '   - http://localhost:8081/auth/callback' as redirect_url;
SELECT '   - http://localhost:8082' as redirect_url;
SELECT '   - http://localhost:8082/login' as redirect_url;
SELECT '   - http://localhost:8082/auth/callback' as redirect_url;
SELECT '4. Save the changes' as step;
SELECT '5. Test with a new magic link' as step;

-- Check if there are any existing auth users
SELECT 'Current auth users:' as info;
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at,
    last_sign_in_at
FROM auth.users 
WHERE email = 'superadmin@wozamali.co.za'
LIMIT 1;
