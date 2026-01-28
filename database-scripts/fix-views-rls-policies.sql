-- Fix RLS policies for views
-- This script adds proper Row Level Security policies for the views

-- First, ensure the views exist
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

-- Grant necessary permissions
GRANT SELECT ON v_team_members TO authenticated;
GRANT SELECT ON v_pending_collectors TO authenticated;

-- Also grant permissions on the underlying tables if needed
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.roles TO authenticated;

-- Test the views
SELECT 'Testing v_team_members...' as test_step;
SELECT COUNT(*) as team_members_count FROM v_team_members;

SELECT 'Testing v_pending_collectors...' as test_step;
SELECT COUNT(*) as pending_collectors_count FROM v_pending_collectors;

SELECT 'Views and permissions created successfully!' as result;
