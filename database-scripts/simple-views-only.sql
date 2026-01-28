-- Simple views-only approach that doesn't try to insert into users table
-- This avoids all foreign key constraint issues

-- Step 1: Check current column types
SELECT 
    column_name, 
    data_type, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('role_id', 'id', 'township_id', 'employee_number', 'role', 'status')
ORDER BY column_name;

-- Step 2: Create views that work with existing column types
-- View for team members with text casting (using only existing columns)
CREATE OR REPLACE VIEW public.v_team_members AS
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.full_name,
    u.phone,
    COALESCE(u.employee_number, 'N/A') as employee_number,
    u.role,
    COALESCE(u.status, 'active') as status,
    u.township_id,
    u.created_at,
    u.updated_at,
    r.name as role_name,
    r.permissions,
    COALESCE(u.township_id::text, 'Not specified') as township_name
FROM public.users u
LEFT JOIN public.roles r ON COALESCE(u.role_id::text, '') = r.id::text
WHERE COALESCE(u.status, 'active') = 'active' 
  AND u.role IN ('admin', 'collector', 'super_admin')
ORDER BY u.created_at DESC;

-- View for pending collectors (using only existing columns)
CREATE OR REPLACE VIEW public.v_pending_collectors AS
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.full_name,
    u.phone,
    COALESCE(u.employee_number, 'N/A') as employee_number,
    u.township_id,
    u.created_at,
    u.updated_at,
    COALESCE(u.township_id::text, 'Not specified') as township_name
FROM public.users u
WHERE u.status = 'pending_approval' 
  AND u.role = 'collector'
ORDER BY u.created_at ASC;

-- Step 3: Test the views
SELECT 'Testing v_team_members...' as test;
SELECT COUNT(*) as team_member_count FROM public.v_team_members;

SELECT 'Testing v_pending_collectors...' as test;
SELECT COUNT(*) as pending_count FROM public.v_pending_collectors;

-- Step 4: Show sample data from views
SELECT 'Sample team members...' as test;
SELECT id, email, full_name, role, status, employee_number 
FROM public.v_team_members 
LIMIT 5;

SELECT 'Sample pending collectors...' as test;
SELECT id, email, full_name, employee_number 
FROM public.v_pending_collectors 
LIMIT 5;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Views created successfully!';
    RAISE NOTICE 'Created views:';
    RAISE NOTICE '- v_team_members - Team members with role info';
    RAISE NOTICE '- v_pending_collectors - Pending collector approvals';
    RAISE NOTICE 'The API route will handle user creation directly without database functions.';
END $$;
