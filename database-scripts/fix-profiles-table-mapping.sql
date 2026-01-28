-- ============================================================================
-- FIX PROFILES TABLE MAPPING ISSUE
-- ============================================================================
-- This script creates a profiles table that maps to user_profiles
-- to maintain compatibility with the collector app

-- First, let's check what tables currently exist
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'user_profiles', 'addresses');

-- Create a profiles table that mirrors user_profiles structure
-- This maintains compatibility with existing collector app code
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('member', 'collector', 'admin', 'office_staff', 'customer')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    avatar_url TEXT,
    date_of_birth DATE,
    emergency_contact TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    
    -- Role-specific fields
    collector_id TEXT UNIQUE, -- For collectors
    admin_level INTEGER DEFAULT 1, -- For admins (1-5)
    office_department TEXT, -- For office staff
    
    -- Additional fields for compatibility
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    is_active BOOLEAN DEFAULT true,
    
    CONSTRAINT valid_collector_id CHECK (
        (role = 'collector' AND collector_id IS NOT NULL) OR 
        (role != 'collector')
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

-- Create a trigger to sync data between user_profiles and profiles
CREATE OR REPLACE FUNCTION sync_profiles_tables()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Insert into profiles when user_profiles is inserted
        INSERT INTO public.profiles (
            id, user_id, email, full_name, phone, role, status, 
            avatar_url, date_of_birth, emergency_contact, created_at, 
            updated_at, last_login, collector_id, admin_level, 
            office_department, username, first_name, last_name, is_active
        ) VALUES (
            NEW.id, NEW.user_id, NEW.email, NEW.full_name, NEW.phone, 
            NEW.role, NEW.status, NEW.avatar_url, NEW.date_of_birth, 
            NEW.emergency_contact, NEW.created_at, NEW.updated_at, 
            NEW.last_login, NEW.collector_id, NEW.admin_level, 
            NEW.office_department, 
            COALESCE(NEW.full_name, ''), -- username fallback
            SPLIT_PART(COALESCE(NEW.full_name, ''), ' ', 1), -- first_name
            SPLIT_PART(COALESCE(NEW.full_name, ''), ' ', 2), -- last_name
            CASE WHEN NEW.status = 'active' THEN true ELSE false END
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Update profiles when user_profiles is updated
        UPDATE public.profiles SET
            email = NEW.email,
            full_name = NEW.full_name,
            phone = NEW.phone,
            role = NEW.role,
            status = NEW.status,
            avatar_url = NEW.avatar_url,
            date_of_birth = NEW.date_of_birth,
            emergency_contact = NEW.emergency_contact,
            updated_at = NEW.updated_at,
            last_login = NEW.last_login,
            collector_id = NEW.collector_id,
            admin_level = NEW.admin_level,
            office_department = NEW.office_department,
            username = COALESCE(NEW.full_name, ''),
            first_name = SPLIT_PART(COALESCE(NEW.full_name, ''), ' ', 1),
            last_name = SPLIT_PART(COALESCE(NEW.full_name, ''), ' ', 2),
            is_active = CASE WHEN NEW.status = 'active' THEN true ELSE false END
        WHERE id = NEW.id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Delete from profiles when user_profiles is deleted
        DELETE FROM public.profiles WHERE id = OLD.id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on user_profiles table
DROP TRIGGER IF EXISTS trigger_sync_profiles_tables ON public.user_profiles;
CREATE TRIGGER trigger_sync_profiles_tables
    AFTER INSERT OR UPDATE OR DELETE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION sync_profiles_tables();

-- Now let's populate the profiles table with existing data from user_profiles
INSERT INTO public.profiles (
    id, user_id, email, full_name, phone, role, status, 
    avatar_url, date_of_birth, emergency_contact, created_at, 
    updated_at, last_login, collector_id, admin_level, 
    office_department, username, first_name, last_name, is_active
)
SELECT 
    id, user_id, email, full_name, phone, role, status,
    avatar_url, date_of_birth, emergency_contact, created_at,
    updated_at, last_login, collector_id, admin_level,
    office_department,
    COALESCE(full_name, '') as username,
    SPLIT_PART(COALESCE(full_name, ''), ' ', 1) as first_name,
    SPLIT_PART(COALESCE(full_name, ''), ' ', 2) as last_name,
    CASE WHEN status = 'active' THEN true ELSE false END as is_active
FROM public.user_profiles
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    avatar_url = EXCLUDED.avatar_url,
    date_of_birth = EXCLUDED.date_of_birth,
    emergency_contact = EXCLUDED.emergency_contact,
    updated_at = EXCLUDED.updated_at,
    last_login = EXCLUDED.last_login,
    collector_id = EXCLUDED.collector_id,
    admin_level = EXCLUDED.admin_level,
    office_department = EXCLUDED.office_department,
    username = EXCLUDED.username,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- VERIFICATION QUERIES (Run these separately if needed)
-- ============================================================================

-- Query 1: Check record counts
SELECT 'profiles' as table_name, COUNT(*) as record_count FROM public.profiles;

-- Query 2: Check user_profiles count
SELECT 'user_profiles' as table_name, COUNT(*) as record_count FROM public.user_profiles;

-- Query 3: Show sample data from profiles
SELECT 'profiles' as source, id, email, role, is_active FROM public.profiles LIMIT 3;

-- Query 4: Show sample data from user_profiles
SELECT 'user_profiles' as source, id, email, role, 
       CASE WHEN status = 'active' THEN true ELSE false END as is_active 
FROM public.user_profiles LIMIT 3;

-- Query 5: Verify the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;
