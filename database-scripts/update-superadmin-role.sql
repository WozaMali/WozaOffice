-- ============================================================================
-- QUICK SUPERADMIN ROLE UPDATE
-- ============================================================================
-- This script quickly updates superadmin@wozamali.co.za to have SUPER_ADMIN role
-- Run this if the user already exists in the database

-- Step 1: Ensure SUPER_ADMIN role exists
INSERT INTO public.roles (id, name, description, permissions) VALUES
('00000000-0000-0000-0000-000000000001', 'SUPER_ADMIN', 'Super Administrator with full system access', 
 '{
   "can_manage_all": true,
   "can_view_analytics": true,
   "can_manage_users": true,
   "can_access_team_members": true,
   "can_manage_collections": true,
   "can_manage_pickups": true,
   "can_manage_rewards": true,
   "can_manage_withdrawals": true,
   "can_manage_fund": true,
   "can_manage_config": true,
   "can_view_transactions": true,
   "can_manage_beneficiaries": true,
   "can_reset_system": true
 }')
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    updated_at = NOW();

-- Step 2: Update existing user to have SUPER_ADMIN role
UPDATE public.users 
SET 
    role_id = '00000000-0000-0000-0000-000000000001'::uuid,
    role = 'SUPER_ADMIN',
    status = 'active',
    is_approved = true,
    updated_at = NOW()
WHERE email = 'superadmin@wozamali.co.za';

-- Step 3: Update user_profiles if it exists
UPDATE public.user_profiles 
SET 
    role = 'SUPER_ADMIN',
    updated_at = NOW()
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'superadmin@wozamali.co.za'
);

-- Step 4: Verification
SELECT 'Updated user status:' as info;
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.status,
    u.is_approved,
    r.name as role_name
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
WHERE u.email = 'superadmin@wozamali.co.za';
