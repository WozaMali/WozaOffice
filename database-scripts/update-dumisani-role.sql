-- ============================================================================
-- UPDATE DUMISANI TO SUPERADMIN ROLE
-- ============================================================================
-- This script updates dumisani@sebenzawaste.co.za to have SUPER_ADMIN role
-- Run this in your Supabase SQL Editor

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

-- Step 2: First, check if user exists and current role
SELECT 'Current user status before update:' as info;
SELECT 
    u.id,
    u.email,
    u.role,
    u.role_id,
    u.status
FROM public.users u
WHERE LOWER(u.email) = LOWER('dumisani@sebenzawaste.co.za');

-- Step 3: Verify the role exists and get its ID
SELECT 'Verifying SUPER_ADMIN role exists:' as info;
SELECT id, name FROM public.roles 
WHERE id = '00000000-0000-0000-0000-000000000001'::uuid 
   OR name = 'SUPER_ADMIN';

-- Step 4: Check for incorrect role_id values (where role_id equals user's own ID)
SELECT 'Checking for incorrect role_id values:' as info;
SELECT 
    u.id as user_id,
    u.email,
    u.role_id,
    CASE 
        WHEN u.role_id = u.id THEN '❌ ERROR: role_id is set to user''s own ID!'
        WHEN u.role_id IS NULL THEN '⚠️ role_id is NULL'
        WHEN NOT EXISTS (SELECT 1 FROM public.roles WHERE id = u.role_id) THEN '❌ ERROR: role_id does not exist in roles table!'
        ELSE '✅ role_id looks valid'
    END as role_id_status
FROM public.users u
WHERE LOWER(u.email) = LOWER('dumisani@sebenzawaste.co.za');

-- Step 5: Temporarily disable the trigger that might interfere
-- (The trigger tries to set role from role_id, but we want to set both explicitly)
DROP TRIGGER IF EXISTS before_users_ins_upd_role ON public.users;

-- Step 6: Fix invalid role_id by updating directly to the correct SUPER_ADMIN role_id
-- The user's current role_id is incorrectly set to their own user ID
-- We'll find the actual SUPER_ADMIN role ID and use that
DO $$ 
DECLARE
    user_id_val UUID;
    super_admin_role_id UUID;
BEGIN
    -- Get the user's ID
    SELECT id INTO user_id_val
    FROM public.users
    WHERE LOWER(email) = LOWER('dumisani@sebenzawaste.co.za')
    LIMIT 1;
    
    IF user_id_val IS NULL THEN
        RAISE EXCEPTION 'User with email dumisani@sebenzawaste.co.za not found!';
    END IF;
    
    -- Find the SUPER_ADMIN role by name (more reliable than assuming a specific ID)
    SELECT id INTO super_admin_role_id
    FROM public.roles
    WHERE name = 'SUPER_ADMIN'
    LIMIT 1;
    
    -- If not found by name, try the expected ID
    IF super_admin_role_id IS NULL THEN
        SELECT id INTO super_admin_role_id
        FROM public.roles
        WHERE id = '00000000-0000-0000-0000-000000000001'::uuid
        LIMIT 1;
    END IF;
    
    -- If still not found, the role should have been created in Step 1, so this is an error
    IF super_admin_role_id IS NULL THEN
        RAISE EXCEPTION 'SUPER_ADMIN role does not exist! Please ensure Step 1 completed successfully.';
    END IF;
    
    -- Update role_id directly to the correct value
    UPDATE public.users 
    SET role_id = super_admin_role_id
    WHERE id = user_id_val;
    
    RAISE NOTICE 'Updated role_id for user % to SUPER_ADMIN role (ID: %)', user_id_val, super_admin_role_id;
END $$;

-- Step 7: Now update the role column and other fields
-- IMPORTANT: The role column must be 'SUPER_ADMIN' (uppercase with underscore) to match the constraint
-- Note: role_id was already updated in Step 6, so we just need to set the role column here
UPDATE public.users 
SET 
    role = 'SUPER_ADMIN',
    status = 'active',
    is_approved = true,
    updated_at = NOW()
WHERE LOWER(email) = LOWER('dumisani@sebenzawaste.co.za');

-- Step 8: Re-enable the trigger (only if the function exists)
-- Note: The trigger function should still exist, we just temporarily disabled it
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'before_users_ins_upd_role' 
        AND pronamespace = 'public'::regnamespace
    ) THEN
        -- Drop if exists to avoid conflicts, then create
        DROP TRIGGER IF EXISTS before_users_ins_upd_role ON public.users;
        CREATE TRIGGER before_users_ins_upd_role
            BEFORE INSERT OR UPDATE ON public.users
            FOR EACH ROW
            EXECUTE FUNCTION public.before_users_ins_upd_role();
        RAISE NOTICE 'Re-enabled trigger before_users_ins_upd_role';
    ELSE
        RAISE NOTICE 'Trigger function before_users_ins_upd_role does not exist, skipping trigger creation';
    END IF;
END $$;

-- Step 9: Update user_profiles if it exists (if this table uses different role values)
UPDATE public.user_profiles 
SET 
    role = 'superadmin',
    updated_at = NOW()
WHERE user_id IN (
    SELECT id FROM public.users WHERE LOWER(email) = LOWER('dumisani@sebenzawaste.co.za')
);

-- Step 10: Verification - Check that role is NOT NULL
SELECT 'Verifying role is set (should NOT be NULL):' as info;
SELECT 
    u.id,
    u.email,
    u.role,
    CASE 
        WHEN u.role IS NULL THEN '❌ ERROR: Role is NULL!'
        WHEN u.role = 'SUPER_ADMIN' THEN '✅ Role is correctly set to SUPER_ADMIN'
        ELSE '⚠️ Role is set to: ' || u.role
    END as role_status,
    u.role_id,
    u.status,
    u.is_approved,
    r.name as role_name_from_table
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
WHERE LOWER(u.email) = LOWER('dumisani@sebenzawaste.co.za');

-- Step 11: Final verification
SELECT 'Updated user status:' as info;
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.status,
    u.is_approved,
    r.name as role_name,
    r.id as role_id
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
WHERE LOWER(u.email) = LOWER('dumisani@sebenzawaste.co.za');
