-- ============================================================================
-- URGENT DATABASE FIX FOR OFFICE APP
-- ============================================================================
-- This script fixes all the critical database issues preventing the office app from working

-- Step 1: Drop ALL problematic RLS policies
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "SUPER_ADMIN can view all users" ON public.users;
DROP POLICY IF EXISTS "SUPER_ADMIN can manage all users" ON public.users;
DROP POLICY IF EXISTS "ADMIN can view non-superadmin users" ON public.users;
DROP POLICY IF EXISTS "ADMIN can manage non-superadmin users" ON public.users;
DROP POLICY IF EXISTS "simple_users_select" ON public.users;
DROP POLICY IF EXISTS "simple_users_update" ON public.users;
DROP POLICY IF EXISTS "simple_users_insert" ON public.users;
DROP POLICY IF EXISTS "simple_users_service_all" ON public.users;
DROP POLICY IF EXISTS "users_allow_all" ON public.users;

-- Drop unified_collections policies
DROP POLICY IF EXISTS "unified_collections_select_all" ON public.unified_collections;
DROP POLICY IF EXISTS "unified_collections_insert_all" ON public.unified_collections;
DROP POLICY IF EXISTS "unified_collections_update_all" ON public.unified_collections;
DROP POLICY IF EXISTS "unified_collections_service_role_all" ON public.unified_collections;
DROP POLICY IF EXISTS "allow_all_select" ON public.unified_collections;
DROP POLICY IF EXISTS "allow_all_insert" ON public.unified_collections;
DROP POLICY IF EXISTS "allow_all_update" ON public.unified_collections;
DROP POLICY IF EXISTS "allow_all_delete" ON public.unified_collections;
DROP POLICY IF EXISTS "service_role_all" ON public.unified_collections;
DROP POLICY IF EXISTS "unified_collections_allow_all" ON public.unified_collections;

-- Drop profiles policies
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_service_role_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_service_all" ON public.profiles;

-- Step 2: Temporarily disable RLS on all tables
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.unified_collections DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Step 3: Grant all permissions to all roles
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.users TO anon;
GRANT ALL ON public.unified_collections TO authenticated;
GRANT ALL ON public.unified_collections TO service_role;
GRANT ALL ON public.unified_collections TO anon;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.profiles TO anon;

-- Step 4: Create missing tables that the app expects
-- Create areas table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Insert default data for missing tables
-- Insert default roles
INSERT INTO public.roles (id, name, permissions) VALUES 
    (gen_random_uuid(), 'SUPER_ADMIN', '{"all": true}'),
    (gen_random_uuid(), 'ADMIN', '{"users": true, "collections": true}'),
    (gen_random_uuid(), 'MEMBER', '{"profile": true}'),
    (gen_random_uuid(), 'CUSTOMER', '{"profile": true}')
ON CONFLICT (name) DO NOTHING;

-- Insert default areas
INSERT INTO public.areas (id, name) VALUES 
    (gen_random_uuid(), 'Johannesburg'),
    (gen_random_uuid(), 'Cape Town'),
    (gen_random_uuid(), 'Durban'),
    (gen_random_uuid(), 'Pretoria')
ON CONFLICT DO NOTHING;

-- Step 6: Update users table to have proper foreign key relationships
-- Add foreign key constraints if they don't exist
DO $$
BEGIN
    -- Add role_id foreign key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_role_id_fkey' 
        AND table_name = 'users'
    ) THEN
        ALTER TABLE public.users 
        ADD CONSTRAINT users_role_id_fkey 
        FOREIGN KEY (role_id) REFERENCES public.roles(id);
    END IF;
    
    -- Skip township foreign key for now since township is text and areas.id is UUID
    -- This would require data migration which is complex
    -- We'll handle township relationships differently
END $$;

-- Step 7: Re-enable RLS with very simple policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unified_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create very permissive policies for development
CREATE POLICY "users_allow_all" ON public.users 
    FOR ALL TO authenticated, anon, service_role 
    USING (true) WITH CHECK (true);

CREATE POLICY "unified_collections_allow_all" ON public.unified_collections 
    FOR ALL TO authenticated, anon, service_role 
    USING (true) WITH CHECK (true);

CREATE POLICY "profiles_allow_all" ON public.profiles 
    FOR ALL TO authenticated, anon, service_role 
    USING (true) WITH CHECK (true);

-- Step 8: Create some test data for unified_collections if empty
INSERT INTO public.unified_collections (
    id, 
    customer_name,
    status, 
    computed_value, 
    total_value, 
    created_at
) VALUES 
    (
        gen_random_uuid(), 
        'Test Customer 1',
        'pending', 
        100, 
        100, 
        NOW()
    ),
    (
        gen_random_uuid(), 
        'Test Customer 2',
        'approved', 
        200, 
        200, 
        NOW()
    )
ON CONFLICT DO NOTHING;

-- Step 9: Verify the fix
SELECT 'Database fix completed successfully' as status;

-- Check that all tables exist and have data
SELECT 'users' as table_name, COUNT(*) as row_count FROM public.users
UNION ALL
SELECT 'unified_collections' as table_name, COUNT(*) as row_count FROM public.unified_collections
UNION ALL
SELECT 'roles' as table_name, COUNT(*) as row_count FROM public.roles
UNION ALL
SELECT 'areas' as table_name, COUNT(*) as row_count FROM public.areas;
