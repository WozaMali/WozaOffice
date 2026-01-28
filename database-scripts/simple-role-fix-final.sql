-- Simple fix for role_id type issues using only existing columns
-- This approach works with the actual users table structure

-- Step 1: Check current column types
SELECT 
    column_name, 
    data_type, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('role_id', 'id', 'township_id', 'department', 'employee_number', 'role', 'status')
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
    u.township_id::text as township_name
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
    u.township_id::text as township_name
FROM public.users u
WHERE u.status = 'pending_approval' 
  AND u.role = 'collector'
ORDER BY u.created_at ASC;

-- Step 3: Create user creation function that works with existing schema
CREATE OR REPLACE FUNCTION public.create_team_member_simple(
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
    v_role_id TEXT;
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
    
    -- Get role ID as text
    SELECT id::text INTO v_role_id FROM public.roles WHERE name = p_role;
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
    
    -- Insert user record with only existing columns
    -- Handle township_id as UUID if provided, otherwise NULL
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
        township_id,
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
        CASE 
            WHEN p_township IS NOT NULL AND p_township ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
            THEN p_township::uuid 
            ELSE NULL 
        END,
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

-- Step 4: Test the views
SELECT 'Testing v_team_members...' as test;
SELECT COUNT(*) as team_member_count FROM public.v_team_members;

SELECT 'Testing v_pending_collectors...' as test;
SELECT COUNT(*) as pending_count FROM public.v_pending_collectors;

-- Step 5: Test the function
SELECT 'Testing create_team_member_simple...' as test;
-- This will fail if the user already exists, which is expected
SELECT public.create_team_member_simple(
    'test@example.com',
    'Test',
    'User',
    '+1234567890',
    'admin',
    'IT',
    'Soweto'
) as test_result;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Simple role fix applied successfully!';
    RAISE NOTICE 'Created views:';
    RAISE NOTICE '- v_team_members - Team members with role info';
    RAISE NOTICE '- v_pending_collectors - Pending collector approvals';
    RAISE NOTICE 'Created function:';
    RAISE NOTICE '- create_team_member_simple() - User creation function';
    RAISE NOTICE 'The application should now work without column errors.';
END $$;
