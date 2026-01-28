-- User Creation and Management Schema
-- This script creates the necessary tables and functions for user management

-- ============================================================================
-- ROLES TABLE (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default roles if they don't exist
INSERT INTO public.roles (id, name, description, permissions) VALUES
('00000000-0000-0000-0000-000000000001', 'SUPER_ADMIN', 'Super Administrator with full system access', '{"can_manage_all": true, "can_view_analytics": true, "can_manage_users": true, "can_access_team_members": true}'),
('00000000-0000-0000-0000-000000000002', 'admin', 'Administrator with management privileges', '{"can_manage_users": true, "can_view_analytics": true, "can_approve_collections": true}'),
('00000000-0000-0000-0000-000000000003', 'collector', 'Collector with collection privileges', '{"can_collect": true, "can_view_own_data": true}'),
('00000000-0000-0000-0000-000000000004', 'customer', 'Customer with basic privileges', '{"can_view_own_data": true, "can_make_collections": true}')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- USERS TABLE ENHANCEMENTS
-- ============================================================================

-- Add missing columns to users table if they don't exist
DO $$ 
BEGIN
    -- Add employee_number column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'employee_number') THEN
        ALTER TABLE public.users ADD COLUMN employee_number TEXT;
    END IF;
    
    -- Add department column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'department') THEN
        ALTER TABLE public.users ADD COLUMN department TEXT;
    END IF;
    
    -- Add township column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'township') THEN
        ALTER TABLE public.users ADD COLUMN township TEXT;
    END IF;
    
    -- Add role column (if using direct role instead of role_id)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
        ALTER TABLE public.users ADD COLUMN role TEXT;
    END IF;
    
    -- Ensure role_id is UUID type for proper joins
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role_id' AND data_type != 'uuid') THEN
        ALTER TABLE public.users ALTER COLUMN role_id TYPE UUID USING role_id::uuid;
    END IF;
    
    -- Add status column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'status') THEN
        ALTER TABLE public.users ADD COLUMN status TEXT DEFAULT 'active';
    END IF;
    
    -- Add created_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_at') THEN
        ALTER TABLE public.users ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- Add updated_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at') THEN
        ALTER TABLE public.users ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- ============================================================================
-- USER CREATION FUNCTIONS
-- ============================================================================

-- Function to create a new user with proper validation
CREATE OR REPLACE FUNCTION public.create_team_member(
    p_email TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_phone TEXT,
    p_role TEXT,
    p_department TEXT DEFAULT NULL,
    p_township TEXT DEFAULT NULL,
    p_employee_number TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_role_id UUID;
    v_emp_number TEXT;
    v_result JSONB;
BEGIN
    -- Validate required fields
    IF p_email IS NULL OR p_email = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Email is required');
    END IF;
    
    IF p_first_name IS NULL OR p_first_name = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'First name is required');
    END IF;
    
    IF p_last_name IS NULL OR p_last_name = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Last name is required');
    END IF;
    
    IF p_phone IS NULL OR p_phone = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Phone number is required');
    END IF;
    
    IF p_role IS NULL OR p_role = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Role is required');
    END IF;
    
    -- Check if email already exists
    IF EXISTS (SELECT 1 FROM public.users WHERE email = p_email) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Email already exists');
    END IF;
    
    -- Get role ID
    SELECT id INTO v_role_id FROM public.roles WHERE name = p_role;
    IF v_role_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid role specified');
    END IF;
    
    -- Generate employee number if not provided
    IF p_employee_number IS NULL OR p_employee_number = '' THEN
        SELECT COALESCE(MAX(CAST(SUBSTRING(employee_number FROM 4) AS INTEGER)), 0) + 1
        INTO v_emp_number
        FROM public.users 
        WHERE employee_number ~ '^EMP[0-9]+$';
        
        v_emp_number := 'EMP' || LPAD(v_emp_number::TEXT, 4, '0');
    ELSE
        v_emp_number := p_employee_number;
    END IF;
    
    -- Generate UUID for user
    v_user_id := gen_random_uuid();
    
    -- Insert user record
    INSERT INTO public.users (
        id,
        email,
        first_name,
        last_name,
        full_name,
        phone,
        role_id,
        role,
        status,
        employee_number,
        department,
        township,
        created_at,
        updated_at
    ) VALUES (
        v_user_id,
        p_email,
        p_first_name,
        p_last_name,
        p_first_name || ' ' || p_last_name,
        p_phone,
        v_role_id,
        p_role,
        'active',
        v_emp_number,
        p_department,
        p_township,
        NOW(),
        NOW()
    );
    
    -- Return success response
    v_result := jsonb_build_object(
        'success', true,
        'user_id', v_user_id,
        'employee_number', v_emp_number,
        'message', 'User created successfully'
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Function to approve pending collectors
CREATE OR REPLACE FUNCTION public.approve_collector(
    p_user_id UUID,
    p_approver_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user RECORD;
    v_result JSONB;
BEGIN
    -- Get user details
    SELECT * INTO v_user FROM public.users WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;
    
    IF v_user.status != 'pending_approval' THEN
        RETURN jsonb_build_object('success', false, 'error', 'User is not pending approval');
    END IF;
    
    IF v_user.role != 'collector' THEN
        RETURN jsonb_build_object('success', false, 'error', 'User is not a collector');
    END IF;
    
    -- Update user status
    UPDATE public.users 
    SET 
        status = 'active',
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Log approval activity
    INSERT INTO public.activity_log (user_id, entity_type, entity_id, action, metadata)
    VALUES (p_approver_id, 'user', p_user_id, 'approved_collector', jsonb_build_object('approved_user', p_user_id));
    
    v_result := jsonb_build_object(
        'success', true,
        'message', 'Collector approved successfully'
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Function to reject pending collectors
CREATE OR REPLACE FUNCTION public.reject_collector(
    p_user_id UUID,
    p_approver_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user RECORD;
    v_result JSONB;
BEGIN
    -- Get user details
    SELECT * INTO v_user FROM public.users WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;
    
    IF v_user.status != 'pending_approval' THEN
        RETURN jsonb_build_object('success', false, 'error', 'User is not pending approval');
    END IF;
    
    IF v_user.role != 'collector' THEN
        RETURN jsonb_build_object('success', false, 'error', 'User is not a collector');
    END IF;
    
    -- Update user status
    UPDATE public.users 
    SET 
        status = 'rejected',
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Log rejection activity
    INSERT INTO public.activity_log (user_id, entity_type, entity_id, action, metadata)
    VALUES (p_approver_id, 'user', p_user_id, 'rejected_collector', jsonb_build_object('rejected_user', p_user_id, 'reason', p_reason));
    
    v_result := jsonb_build_object(
        'success', true,
        'message', 'Collector rejected successfully'
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- ============================================================================
-- VIEWS FOR ADMIN INTERFACE
-- ============================================================================

-- View for pending collector approvals
CREATE OR REPLACE VIEW public.v_pending_collectors AS
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.full_name,
    u.phone,
    u.employee_number,
    u.township,
    u.department,
    u.created_at,
    u.updated_at
FROM public.users u
WHERE u.status = 'pending_approval' 
  AND u.role = 'collector'
ORDER BY u.created_at ASC;

-- View for team members (active admins and collectors)
CREATE OR REPLACE VIEW public.v_team_members AS
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.full_name,
    u.phone,
    u.employee_number,
    u.role,
    u.status,
    u.township,
    u.department,
    u.created_at,
    u.updated_at,
    r.name as role_name,
    r.permissions
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
WHERE u.status = 'active' 
  AND u.role IN ('admin', 'collector', 'super_admin')
ORDER BY u.created_at DESC;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on roles table
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Allow admins and super admins to read roles
CREATE POLICY "Allow admins to read roles" ON public.roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
            AND status = 'active'
        )
    );

-- Allow super admins to manage roles
CREATE POLICY "Allow super admins to manage roles" ON public.roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'super_admin'
            AND status = 'active'
        )
    );

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index on users table for common queries
CREATE INDEX IF NOT EXISTS idx_users_status_role ON public.users(status, role);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_employee_number ON public.users(employee_number);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at);

-- Index on roles table
CREATE INDEX IF NOT EXISTS idx_roles_name ON public.roles(name);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT ON public.roles TO authenticated;
GRANT SELECT ON public.v_pending_collectors TO authenticated;
GRANT SELECT ON public.v_team_members TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.create_team_member TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_collector TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_collector TO authenticated;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'User creation and management schema has been successfully created!';
    RAISE NOTICE 'Available functions:';
    RAISE NOTICE '- create_team_member() - Create new team members';
    RAISE NOTICE '- approve_collector() - Approve pending collectors';
    RAISE NOTICE '- reject_collector() - Reject pending collectors';
    RAISE NOTICE 'Available views:';
    RAISE NOTICE '- v_pending_collectors - View pending collector approvals';
    RAISE NOTICE '- v_team_members - View active team members';
END $$;
