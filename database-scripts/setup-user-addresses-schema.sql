-- ============================================================================
-- SETUP USER ADDRESSES SCHEMA FOR MEMBER ADDRESSES
-- ============================================================================
-- This script sets up the user addresses schema and creates views for member addresses
-- to be used in both collection and office apps

-- ============================================================================
-- STEP 1: CREATE USER ADDRESSES SCHEMA
-- ============================================================================

-- Check if user_profiles table exists before creating user_addresses
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_profiles' 
        AND table_schema = 'public'
    ) THEN
        -- If user_profiles doesn't exist, use profiles table instead
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'profiles' 
            AND table_schema = 'public'
        ) THEN
            RAISE EXCEPTION 'Neither user_profiles nor profiles table exists. Please run the main schema first.';
        END IF;
    END IF;
END $$;

-- User addresses for flexible location management
CREATE TABLE IF NOT EXISTS public.user_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- Use profiles table
    address_type TEXT DEFAULT 'primary' CHECK (address_type IN ('primary', 'secondary', 'pickup', 'billing')),
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL,
    province TEXT NOT NULL,
    postal_code TEXT,
    country TEXT DEFAULT 'South Africa',
    coordinates POINT, -- For GPS mapping and route optimization
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    notes TEXT, -- Additional delivery instructions, landmarks, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure only one default address per user per type
    CONSTRAINT unique_default_per_type UNIQUE (user_id, address_type, is_default) 
        DEFERRABLE INITIALLY DEFERRED
);

-- ============================================================================
-- STEP 2: UPDATE EXISTING PICKUPS TABLE
-- ============================================================================

-- Add pickup_address_id column to pickups table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pickups' 
        AND column_name = 'pickup_address_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.pickups 
        ADD COLUMN pickup_address_id UUID REFERENCES public.user_addresses(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================================
-- STEP 3: CREATE TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp (create if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger for user_addresses (drop and recreate to avoid conflicts)
DROP TRIGGER IF EXISTS update_user_addresses_updated_at ON public.user_addresses;
CREATE TRIGGER update_user_addresses_updated_at 
    BEFORE UPDATE ON public.user_addresses 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- STEP 4: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to get user addresses
CREATE OR REPLACE FUNCTION public.get_user_addresses(
    target_user_uuid UUID,
    requesting_user_uuid UUID
)
RETURNS JSONB AS $$
DECLARE
    addresses JSONB;
    result JSONB;
BEGIN
    -- Check if requesting user has permission (own addresses or admin)
    IF NOT (
        target_user_uuid = requesting_user_uuid OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = requesting_user_uuid AND role IN ('admin', 'staff')
        )
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions to view addresses';
    END IF;
    
    -- Get user addresses
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'address_type', address_type,
            'address_line1', address_line1,
            'address_line2', address_line2,
            'city', city,
            'province', province,
            'postal_code', postal_code,
            'country', country,
            'coordinates', coordinates,
            'is_default', is_default,
            'is_active', is_active,
            'notes', notes,
            'created_at', created_at,
            'updated_at', updated_at
        )
    ) INTO addresses
    FROM public.user_addresses 
    WHERE user_id = target_user_uuid AND is_active = true
    ORDER BY is_default DESC, address_type, created_at;
    
    -- Build result
    result := jsonb_build_object(
        'user_id', target_user_uuid,
        'addresses', COALESCE(addresses, '[]'::jsonb),
        'retrieved_at', NOW()
    );
    
    RETURN result;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Function to set default address
CREATE OR REPLACE FUNCTION public.set_default_address(
    address_uuid UUID,
    requesting_user_uuid UUID
)
RETURNS JSONB AS $$
DECLARE
    target_user_id UUID;
    address_type_val TEXT;
    result JSONB;
BEGIN
    -- Get address details and verify ownership
    SELECT user_id, address_type INTO target_user_id, address_type_val
    FROM public.user_addresses 
    WHERE id = address_uuid;
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'Address not found';
    END IF;
    
    -- Check if requesting user has permission
    IF NOT (
        target_user_id = requesting_user_uuid OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = requesting_user_uuid AND role IN ('admin', 'staff')
        )
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions to modify address';
    END IF;
    
    -- Remove default from other addresses of same type
    UPDATE public.user_addresses 
    SET is_default = false, updated_at = NOW()
    WHERE user_id = target_user_id 
    AND address_type = address_type_val 
    AND id != address_uuid;
    
    -- Set this address as default
    UPDATE public.user_addresses 
    SET is_default = true, updated_at = NOW()
    WHERE id = address_uuid;
    
    -- Return result
    result := jsonb_build_object(
        'success', true,
        'message', 'Default address updated successfully',
        'address_id', address_uuid,
        'address_type', address_type_val,
        'updated_at', NOW()
    );
    
    RETURN result;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Function to get default address for user
CREATE OR REPLACE FUNCTION public.get_default_address(
    target_user_uuid UUID,
    address_type_filter TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    address_record RECORD;
    result JSONB;
BEGIN
    -- Get default address
    SELECT * INTO address_record
    FROM public.user_addresses 
    WHERE user_id = target_user_uuid 
    AND is_default = true 
    AND is_active = true
    AND (address_type_filter IS NULL OR address_type = address_type_filter)
    ORDER BY 
        CASE WHEN address_type_filter IS NULL THEN 
            CASE address_type 
                WHEN 'primary' THEN 1
                WHEN 'pickup' THEN 2
                WHEN 'secondary' THEN 3
                WHEN 'billing' THEN 4
                ELSE 5
            END
        ELSE 0 END
    LIMIT 1;
    
    IF address_record IS NULL THEN
        result := jsonb_build_object(
            'found', false,
            'message', 'No default address found'
        );
    ELSE
        result := jsonb_build_object(
            'found', true,
            'address', jsonb_build_object(
                'id', address_record.id,
                'address_type', address_record.address_type,
                'address_line1', address_record.address_line1,
                'address_line2', address_record.address_line2,
                'city', address_record.city,
                'province', address_record.province,
                'postal_code', address_record.postal_code,
                'country', address_record.country,
                'coordinates', address_record.coordinates,
                'notes', address_record.notes
            )
        );
    END IF;
    
    RETURN result;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- ============================================================================
-- STEP 5: CREATE MEMBER ADDRESSES VIEWS
-- ============================================================================

-- Create a comprehensive view for member addresses using user_addresses
CREATE OR REPLACE VIEW public.member_user_addresses_view AS
SELECT 
    ua.id as address_id,
    ua.user_id as member_id,
    p.email,
    p.full_name,
    p.first_name,
    p.last_name,
    p.phone,
    p.role,
    p.is_active as member_is_active,
    p.created_at as member_since,
    -- Address details
    ua.address_type,
    ua.address_line1,
    ua.address_line2,
    ua.city,
    ua.province,
    ua.postal_code,
    ua.country,
    ua.coordinates,
    ua.is_default,
    ua.is_active as address_is_active,
    ua.notes,
    ua.created_at as address_created,
    ua.updated_at as address_updated,
    -- Formatted addresses
    CONCAT(
        COALESCE(ua.address_line1, ''), 
        CASE WHEN ua.address_line2 IS NOT NULL AND ua.address_line2 != '' THEN ', ' || ua.address_line2 ELSE '' END,
        CASE WHEN ua.city IS NOT NULL AND ua.city != '' THEN ', ' || ua.city ELSE '' END,
        CASE WHEN ua.province IS NOT NULL AND ua.province != '' THEN ', ' || ua.province ELSE '' END,
        CASE WHEN ua.postal_code IS NOT NULL AND ua.postal_code != '' THEN ' ' || ua.postal_code ELSE '' END
    ) as full_address,
    -- Short address for lists
    CONCAT(
        COALESCE(ua.address_line1, ''), 
        CASE WHEN ua.city IS NOT NULL AND ua.city != '' THEN ', ' || ua.city ELSE '' END
    ) as short_address,
    -- Collection statistics
    COUNT(pk.id) as total_pickups,
    COUNT(pk.id) FILTER (WHERE pk.status = 'completed') as completed_pickups,
    COUNT(pk.id) FILTER (WHERE pk.status = 'submitted') as pending_pickups,
    COUNT(pk.id) FILTER (WHERE pk.status = 'in_progress') as in_progress_pickups,
    COUNT(pk.id) FILTER (WHERE pk.status = 'cancelled') as cancelled_pickups,
    MAX(pk.created_at) as last_pickup_date,
    MAX(pk.submitted_at) as last_submission_date,
    -- Financial statistics
    COALESCE(SUM(pi.total_kg), 0) as total_kg_collected,
    COALESCE(SUM(pi.total_value), 0.00) as total_value_collected,
    COALESCE(AVG(pi.total_kg), 0) as avg_kg_per_pickup,
    -- Wallet information
    COALESCE(w.balance, 0.00) as wallet_balance,
    COALESCE(w.total_points, 0) as total_points,
    COALESCE(w.tier, 'Bronze Recycler') as tier
FROM public.user_addresses ua
JOIN public.profiles p ON ua.user_id = p.id
LEFT JOIN public.pickups pk ON ua.id = pk.pickup_address_id
LEFT JOIN public.wallets w ON p.id = w.user_id
LEFT JOIN (
    SELECT 
        pickup_id,
        SUM(kilograms) as total_kg,
        SUM(kilograms * m.rate_per_kg) as total_value
    FROM public.pickup_items pi
    JOIN public.materials m ON pi.material_id = m.id
    GROUP BY pickup_id
) pi ON pk.id = pi.pickup_id
WHERE p.role = 'member'
GROUP BY ua.id, ua.user_id, p.email, p.full_name, p.first_name, 
         p.last_name, p.phone, p.role, p.is_active, p.created_at, 
         ua.address_type, ua.address_line1, ua.address_line2, ua.city, 
         ua.province, ua.postal_code, ua.country, 
         ua.is_default, ua.is_active, ua.notes, ua.created_at, 
         ua.updated_at, w.balance, w.total_points, w.tier;

-- Create a simplified view for collection app
CREATE OR REPLACE VIEW public.collection_member_user_addresses_view AS
SELECT 
    ua.id as address_id,
    ua.user_id as member_id,
    p.full_name as member_name,
    p.phone as member_phone,
    p.email as member_email,
    ua.address_type,
    ua.address_line1,
    ua.address_line2,
    ua.city,
    ua.province,
    ua.postal_code,
    ua.coordinates,
    ua.is_default,
    ua.notes,
    -- Formatted address for display
    CONCAT(
        COALESCE(ua.address_line1, ''), 
        CASE WHEN ua.address_line2 IS NOT NULL AND ua.address_line2 != '' THEN ', ' || ua.address_line2 ELSE '' END,
        CASE WHEN ua.city IS NOT NULL AND ua.city != '' THEN ', ' || ua.city ELSE '' END,
        CASE WHEN ua.province IS NOT NULL AND ua.province != '' THEN ', ' || ua.province ELSE '' END
    ) as display_address,
    -- Collection history
    COUNT(pk.id) as total_collections,
    MAX(pk.created_at) as last_collection_date,
    -- Status indicators
    CASE 
        WHEN COUNT(pk.id) = 0 THEN 'new_customer'
        WHEN MAX(pk.created_at) > NOW() - INTERVAL '30 days' THEN 'active'
        WHEN MAX(pk.created_at) > NOW() - INTERVAL '90 days' THEN 'inactive'
        ELSE 'dormant'
    END as customer_status
FROM public.user_addresses ua
JOIN public.profiles p ON ua.user_id = p.id
LEFT JOIN public.pickups pk ON ua.id = pk.pickup_address_id
WHERE p.role = 'member' AND p.is_active = true AND ua.is_active = true
GROUP BY ua.id, ua.user_id, p.full_name, p.phone, p.email,
         ua.address_type, ua.address_line1, ua.address_line2, ua.city, 
         ua.province, ua.postal_code, ua.is_default, ua.notes;

-- Create a view for office app with full details
CREATE OR REPLACE VIEW public.office_member_user_addresses_view AS
SELECT 
    ua.id as address_id,
    ua.user_id as member_id,
    p.email,
    p.full_name,
    p.first_name,
    p.last_name,
    p.phone,
    p.role,
    p.is_active as member_is_active,
    p.created_at as member_since,
    -- Address details
    ua.address_type,
    ua.address_line1,
    ua.address_line2,
    ua.city,
    ua.province,
    ua.postal_code,
    ua.country,
    ua.coordinates,
    ua.is_default,
    ua.is_active as address_is_active,
    ua.notes,
    ua.created_at as address_created,
    ua.updated_at as address_updated,
    -- Formatted addresses
    CONCAT(
        COALESCE(ua.address_line1, ''), 
        CASE WHEN ua.address_line2 IS NOT NULL AND ua.address_line2 != '' THEN ', ' || ua.address_line2 ELSE '' END,
        CASE WHEN ua.city IS NOT NULL AND ua.city != '' THEN ', ' || ua.city ELSE '' END,
        CASE WHEN ua.province IS NOT NULL AND ua.province != '' THEN ', ' || ua.province ELSE '' END,
        CASE WHEN ua.postal_code IS NOT NULL AND ua.postal_code != '' THEN ' ' || ua.postal_code ELSE '' END
    ) as full_address,
    -- Collection statistics
    COUNT(pk.id) as total_pickups,
    COUNT(pk.id) FILTER (WHERE pk.status = 'completed') as completed_pickups,
    COUNT(pk.id) FILTER (WHERE pk.status = 'submitted') as pending_pickups,
    COUNT(pk.id) FILTER (WHERE pk.status = 'in_progress') as in_progress_pickups,
    COUNT(pk.id) FILTER (WHERE pk.status = 'cancelled') as cancelled_pickups,
    MAX(pk.created_at) as last_pickup_date,
    MAX(pk.submitted_at) as last_submission_date,
    -- Financial statistics
    COALESCE(SUM(pi.total_kg), 0) as total_kg_collected,
    COALESCE(SUM(pi.total_value), 0.00) as total_value_collected,
    COALESCE(AVG(pi.total_kg), 0) as avg_kg_per_pickup,
    -- Wallet information
    COALESCE(w.balance, 0.00) as wallet_balance,
    COALESCE(w.total_points, 0) as total_points,
    COALESCE(w.tier, 'Bronze Recycler') as tier
FROM public.user_addresses ua
JOIN public.profiles p ON ua.user_id = p.id
LEFT JOIN public.pickups pk ON ua.id = pk.pickup_address_id
LEFT JOIN public.wallets w ON p.id = w.user_id
LEFT JOIN (
    SELECT 
        pickup_id,
        SUM(kilograms) as total_kg,
        SUM(kilograms * m.rate_per_kg) as total_value
    FROM public.pickup_items pi
    JOIN public.materials m ON pi.material_id = m.id
    GROUP BY pickup_id
) pi ON pk.id = pi.pickup_id
WHERE p.role = 'member'
GROUP BY ua.id, ua.user_id, p.email, p.full_name, p.first_name, 
         p.last_name, p.phone, p.role, p.is_active, p.created_at, 
         ua.address_type, ua.address_line1, ua.address_line2, ua.city, 
         ua.province, ua.postal_code, ua.country, 
         ua.is_default, ua.is_active, ua.notes, ua.created_at, 
         ua.updated_at, w.balance, w.total_points, w.tier;

-- ============================================================================
-- STEP 6: SETUP ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on user_addresses table
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own addresses" ON public.user_addresses;
DROP POLICY IF EXISTS "Users can manage their own addresses" ON public.user_addresses;
DROP POLICY IF EXISTS "Admins can view all addresses" ON public.user_addresses;

-- User addresses policies
CREATE POLICY "Users can view their own addresses" ON public.user_addresses
    FOR SELECT USING (
        user_id = auth.uid()
    );

CREATE POLICY "Users can manage their own addresses" ON public.user_addresses
    FOR ALL USING (
        user_id = auth.uid()
    );

CREATE POLICY "Admins can view all addresses" ON public.user_addresses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

-- ============================================================================
-- STEP 7: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for user_id lookups (create if not exists)
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON public.user_addresses(user_id);

-- Index for active addresses (create if not exists)
CREATE INDEX IF NOT EXISTS idx_user_addresses_active ON public.user_addresses(user_id, is_active) WHERE is_active = true;

-- Index for default addresses (create if not exists)
CREATE INDEX IF NOT EXISTS idx_user_addresses_default ON public.user_addresses(user_id, address_type, is_default) WHERE is_default = true;

-- Index for coordinates (for spatial queries) (create if not exists)
CREATE INDEX IF NOT EXISTS idx_user_addresses_coordinates ON public.user_addresses USING GIST(coordinates);

-- Index for address type lookups
CREATE INDEX IF NOT EXISTS idx_user_addresses_type ON public.user_addresses(user_id, address_type);

-- ============================================================================
-- STEP 8: GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions on the new views
GRANT SELECT ON public.member_user_addresses_view TO authenticated;
GRANT SELECT ON public.collection_member_user_addresses_view TO authenticated;
GRANT SELECT ON public.office_member_user_addresses_view TO authenticated;

-- Grant permissions on functions
GRANT EXECUTE ON FUNCTION public.get_user_addresses(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_default_address(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_default_address(UUID, TEXT) TO authenticated;

-- ============================================================================
-- STEP 9: VERIFICATION QUERIES
-- ============================================================================

-- Verify table was created
SELECT 
    'Table Creation' as test_type,
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'user_addresses';

-- Verify RLS is enabled
SELECT 
    'RLS Status' as test_type,
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'user_addresses' 
AND rowsecurity = true;

-- Verify triggers were created
SELECT 
    'Triggers' as test_type,
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
AND event_object_table = 'user_addresses'
ORDER BY trigger_name;

-- Verify functions were created
SELECT 
    'Functions' as test_type,
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%address%'
ORDER BY routine_name;

-- Test the views
SELECT 
    'View Test' as test_type,
    COUNT(*) as total_addresses,
    COUNT(DISTINCT member_id) as unique_members,
    COUNT(*) FILTER (WHERE is_default = true) as default_addresses
FROM public.member_user_addresses_view;

-- Test collection app view
SELECT 
    'Collection View Test' as test_type,
    COUNT(*) as total_addresses,
    COUNT(DISTINCT member_id) as unique_members,
    COUNT(*) FILTER (WHERE customer_status = 'active') as active_customers
FROM public.collection_member_user_addresses_view;

-- Test office app view
SELECT 
    'Office View Test' as test_type,
    COUNT(*) as total_addresses,
    COUNT(DISTINCT member_id) as unique_members,
    COUNT(*) FILTER (WHERE total_pickups > 0) as addresses_with_pickups
FROM public.office_member_user_addresses_view;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- User addresses schema setup complete! 🎉
-- The following have been created:
-- 1. user_addresses table - Flexible address management
-- 2. Helper functions - get_user_addresses, set_default_address, get_default_address
-- 3. Member address views - For collection and office apps
-- 4. RLS policies - For data security
-- 5. Performance indexes - For fast queries
-- 
-- Usage Examples:
-- 1. Get user addresses: SELECT get_user_addresses('user-id', 'requesting-user-id');
-- 2. Set default address: SELECT set_default_address('address-id', 'user-id');
-- 3. Get default address: SELECT get_default_address('user-id', 'pickup');
-- 4. Query member addresses: SELECT * FROM member_user_addresses_view WHERE member_id = 'user-id';
-- 
-- Next steps:
-- 1. Run this script in your database
-- 2. Update your app to use the new address functions and views
-- 3. Test with sample data
-- 4. Integrate with your collection system
