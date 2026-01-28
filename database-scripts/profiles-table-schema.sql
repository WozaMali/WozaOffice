-- ============================================================================
-- UNIFIED PROFILES TABLE SCHEMA
-- ============================================================================
-- This schema creates a single profiles table for collectors and admins only
-- Residents are handled by the Main App and excluded from this schema

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. ROLES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default roles
INSERT INTO public.roles (name, description, permissions) VALUES
('collector', 'Waste collection staff', '{"can_collect_waste": true, "can_view_assigned_areas": true}'),
('admin', 'System administrators', '{"can_manage_all": true, "can_view_analytics": true, "can_manage_users": true}')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 2. AREAS TABLE (for township/subdivision data)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    city TEXT DEFAULT 'Soweto',
    postal_code TEXT,
    subdivisions JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. UNIFIED PROFILES TABLE (Collectors & Admins Only)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic Information
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    
    -- Identity Information
    identity_number TEXT UNIQUE, -- South African ID number
    date_of_birth DATE,
    
    -- Role and Status
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
    
    -- Address Information
    street_addr TEXT,
    township_id UUID REFERENCES public.areas(id) ON DELETE SET NULL,
    subdivision TEXT,
    city TEXT DEFAULT 'Soweto',
    postal_code TEXT,
    
    -- Role-specific fields
    employee_number TEXT, -- For collectors (e.g., C0001, C0002)
    admin_level INTEGER DEFAULT 1 CHECK (admin_level BETWEEN 1 AND 5), -- For admins (1-5)
    department TEXT, -- For admins
    
    -- System fields
    last_login TIMESTAMPTZ,
    login_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role_id ON public.profiles(role_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_identity_number ON public.profiles(identity_number);
CREATE INDEX IF NOT EXISTS idx_profiles_employee_number ON public.profiles(employee_number);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_township_id ON public.profiles(township_id);

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            JOIN public.roles r ON p.role_id = r.id 
            WHERE p.id = auth.uid() AND r.name = 'admin'
        )
    );

-- RLS Policies for roles (read-only for all authenticated users)
DROP POLICY IF EXISTS "Authenticated users can read roles" ON public.roles;
CREATE POLICY "Authenticated users can read roles" ON public.roles
    FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policies for areas (read-only for all authenticated users)
DROP POLICY IF EXISTS "Authenticated users can read areas" ON public.areas;
CREATE POLICY "Authenticated users can read areas" ON public.areas
    FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================================
-- 6. TRIGGERS
-- ============================================================================
-- Function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON public.profiles 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_roles_updated_at 
    BEFORE UPDATE ON public.roles 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_areas_updated_at 
    BEFORE UPDATE ON public.areas 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 7. SAMPLE DATA
-- ============================================================================
-- Insert sample areas with subdivisions
INSERT INTO public.areas (name, description, city, postal_code, subdivisions) VALUES
('Dobsonville', 'Dobsonville township', 'Soweto', '1863', '["Old Dobsonville", "Ext 1", "Ext 2", "Ext 3", "Ext 4", "Ext 5", "Ext 7"]'),
('Meadowlands', 'Meadowlands township', 'Soweto', '1852', '["Zone 1", "Zone 2", "Zone 3", "Zone 4", "Zone 5", "Zone 6", "Zone 7", "Zone 8", "Zone 9", "Zone 10", "Zone 11", "Zone 12"]'),
('Diepkloof', 'Diepkloof township', 'Soweto', '1862', '["Zone 1", "Zone 2", "Zone 3", "Zone 4", "Zone 5", "Zone 6", "Ext 1", "Ext 2", "Ext 3", "Ext 4", "Ext 5", "Ext 6", "Ext 7", "Ext 8", "Ext 9", "Ext 10"]'),
('Orlando East', 'Orlando East township', 'Soweto', '1804', '["Zone 1", "Zone 2", "Zone 3", "Zone 4", "Zone 5", "Zone 6", "Zone 7"]'),
('Orlando West', 'Orlando West township', 'Soweto', '1804', '["Zone 1", "Zone 2", "Zone 3", "Zone 4", "Zone 5", "Zone 6", "Ext 1", "Ext 2", "Ext 3", "Ext 4", "Ext 5"]')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 8. VIEWS FOR DROPDOWNS
-- ============================================================================
-- Township dropdown view
CREATE OR REPLACE VIEW public.township_dropdown AS
SELECT 
    a.id,
    a.name as township_name,
    a.postal_code,
    a.city,
    COALESCE(a.subdivisions, '[]'::jsonb) as subdivisions
FROM public.areas a
WHERE a.is_active = true
ORDER BY a.name;

-- Subdivision dropdown view
CREATE OR REPLACE VIEW public.subdivision_dropdown AS
SELECT 
    a.id as area_id,
    a.name as township_name,
    a.postal_code,
    jsonb_array_elements_text(COALESCE(a.subdivisions, '[]'::jsonb)) as subdivision
FROM public.areas a
WHERE a.is_active = true
ORDER BY a.name, subdivision;

-- Grant permissions on views
GRANT SELECT ON public.township_dropdown TO authenticated;
GRANT SELECT ON public.subdivision_dropdown TO authenticated;

-- ============================================================================
-- 9. VERIFICATION
-- ============================================================================
SELECT 'Unified Profiles Schema Created Successfully!' as status;
SELECT 'Tables created: profiles, roles, areas' as info;
SELECT 'Views created: township_dropdown, subdivision_dropdown' as info;
SELECT 'Ready for Collector App and Office App!' as info;
