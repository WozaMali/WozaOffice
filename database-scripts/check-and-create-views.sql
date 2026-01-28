-- Check if views exist and create them if they don't
-- This script handles the case where views might not exist

-- Check if views exist
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE viewname IN ('v_team_members', 'v_pending_collectors')
  AND schemaname = 'public';

-- If views don't exist, create them
-- View for team members
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

-- View for pending collectors
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

-- Test the views
SELECT 'Testing v_team_members...' as test;
SELECT COUNT(*) as team_member_count FROM public.v_team_members;

SELECT 'Testing v_pending_collectors...' as test;
SELECT COUNT(*) as pending_count FROM public.v_pending_collectors;

-- Show sample data
SELECT 'Sample team members...' as test;
SELECT id, email, full_name, role, status, employee_number 
FROM public.v_team_members 
LIMIT 3;

SELECT 'Sample pending collectors...' as test;
SELECT id, email, full_name, employee_number 
FROM public.v_pending_collectors 
LIMIT 3;

-- Success message
SELECT 'Views created and tested successfully!' as result;
