-- ============================================================================
-- CREATE PROFILES VIEW AS ALTERNATIVE SOLUTION
-- ============================================================================
-- This creates a view that maps 'profiles' to 'user_profiles'
-- This is simpler than creating a separate table with triggers

-- Drop the view if it exists
DROP VIEW IF EXISTS public.profiles;

-- Create a view that maps profiles to user_profiles
CREATE VIEW public.profiles AS
SELECT 
    id,
    user_id,
    email,
    full_name,
    phone,
    role,
    CASE WHEN status = 'active' THEN true ELSE false END as is_active,
    avatar_url,
    date_of_birth,
    emergency_contact,
    created_at,
    updated_at,
    last_login,
    collector_id,
    admin_level,
    office_department,
    -- Additional fields for compatibility
    COALESCE(full_name, '') as username,
    SPLIT_PART(COALESCE(full_name, ''), ' ', 1) as first_name,
    SPLIT_PART(COALESCE(full_name, ''), ' ', 2) as last_name
FROM public.user_profiles;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- Create a function to handle inserts through the view
CREATE OR REPLACE FUNCTION insert_profile_through_view()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (
        id, user_id, email, full_name, phone, role, status,
        avatar_url, date_of_birth, emergency_contact, created_at,
        updated_at, last_login, collector_id, admin_level, office_department
    ) VALUES (
        COALESCE(NEW.id, gen_random_uuid()),
        NEW.user_id,
        NEW.email,
        NEW.full_name,
        NEW.phone,
        NEW.role,
        CASE WHEN NEW.is_active THEN 'active' ELSE 'inactive' END,
        NEW.avatar_url,
        NEW.date_of_birth,
        NEW.emergency_contact,
        COALESCE(NEW.created_at, NOW()),
        COALESCE(NEW.updated_at, NOW()),
        NEW.last_login,
        NEW.collector_id,
        NEW.admin_level,
        NEW.office_department
    );
    
    -- Return the newly inserted row
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function to handle updates through the view
CREATE OR REPLACE FUNCTION update_profile_through_view()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.user_profiles SET
        email = NEW.email,
        full_name = NEW.full_name,
        phone = NEW.phone,
        role = NEW.role,
        status = CASE WHEN NEW.is_active THEN 'active' ELSE 'inactive' END,
        avatar_url = NEW.avatar_url,
        date_of_birth = NEW.date_of_birth,
        emergency_contact = NEW.emergency_contact,
        updated_at = COALESCE(NEW.updated_at, NOW()),
        last_login = NEW.last_login,
        collector_id = NEW.collector_id,
        admin_level = NEW.admin_level,
        office_department = NEW.office_department
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function to handle deletes through the view
CREATE OR REPLACE FUNCTION delete_profile_through_view()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.user_profiles WHERE id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers on the view
CREATE TRIGGER trigger_insert_profile_view
    INSTEAD OF INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION insert_profile_through_view();

CREATE TRIGGER trigger_update_profile_view
    INSTEAD OF UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_profile_through_view();

CREATE TRIGGER trigger_delete_profile_view
    INSTEAD OF DELETE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION delete_profile_through_view();

-- Test the view
SELECT 'View created successfully' as status;

-- Show the structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;
