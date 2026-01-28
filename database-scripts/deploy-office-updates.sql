-- ============================================================================
-- COMPREHENSIVE OFFICE DATABASE UPDATES
-- ============================================================================
-- This script applies all the same updates that were performed for the collector to the office
-- Run this in your Supabase SQL Editor to update the office database

-- ============================================================================
-- STEP 1: UPDATE TABLE STRUCTURE FOR CONSISTENCY
-- ============================================================================

-- Add missing columns to profiles table if they don't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Update full_name for existing records if it's null
UPDATE public.profiles 
SET full_name = CONCAT(first_name, ' ', last_name)
WHERE full_name IS NULL AND first_name IS NOT NULL AND last_name IS NOT NULL;

-- ============================================================================
-- STEP 2: UPDATE ADDRESSES TABLE STRUCTURE
-- ============================================================================

-- Ensure addresses table has the correct structure
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Rename columns if they exist with different names (for consistency)
DO $$
BEGIN
    -- Check if line1 exists and street_address doesn't, then rename
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'addresses' AND column_name = 'line1') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'addresses' AND column_name = 'street_address') THEN
        ALTER TABLE public.addresses RENAME COLUMN line1 TO street_address;
    END IF;
    
    -- Check if lat exists and latitude doesn't, then rename
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'addresses' AND column_name = 'lat') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'addresses' AND column_name = 'latitude') THEN
        ALTER TABLE public.addresses RENAME COLUMN lat TO latitude;
    END IF;
    
    -- Check if lng exists and longitude doesn't, then rename
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'addresses' AND column_name = 'lng') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'addresses' AND column_name = 'longitude') THEN
        ALTER TABLE public.addresses RENAME COLUMN lng TO longitude;
    END IF;
    
    -- Check if profile_id exists and customer_id doesn't, then rename
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'addresses' AND column_name = 'profile_id') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'addresses' AND column_name = 'customer_id') THEN
        ALTER TABLE public.addresses RENAME COLUMN profile_id TO customer_id;
    END IF;
END $$;

-- ============================================================================
-- STEP 3: UPDATE PICKUPS TABLE STRUCTURE
-- ============================================================================

-- Add missing columns to pickups table if they don't exist
ALTER TABLE public.pickups ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.pickups ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.pickups ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE public.pickups ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
ALTER TABLE public.pickups ADD COLUMN IF NOT EXISTS approval_note TEXT;

-- Update status values to match collector structure if needed
UPDATE public.pickups 
SET status = 'submitted' 
WHERE status = 'pending';

-- ============================================================================
-- STEP 4: UPDATE PICKUP_ITEMS TABLE STRUCTURE
-- ============================================================================

-- Add missing columns to pickup_items table if they don't exist
ALTER TABLE public.pickup_items ADD COLUMN IF NOT EXISTS kilograms DECIMAL(10,3);
ALTER TABLE public.pickup_items ADD COLUMN IF NOT EXISTS contamination_pct DECIMAL(5,2);

-- Rename weight to kilograms if weight exists and kilograms doesn't
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pickup_items' AND column_name = 'weight') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pickup_items' AND column_name = 'kilograms') THEN
        ALTER TABLE public.pickup_items RENAME COLUMN weight TO kilograms;
    END IF;
END $$;

-- ============================================================================
-- STEP 5: UPDATE MATERIALS TABLE STRUCTURE
-- ============================================================================

-- Add missing columns to materials table if they don't exist
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS rate_per_kg DECIMAL(10,2);

-- Rename price_per_unit to rate_per_kg if price_per_unit exists and rate_per_kg doesn't
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'price_per_unit') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'rate_per_kg') THEN
        ALTER TABLE public.materials RENAME COLUMN price_per_unit TO rate_per_kg;
    END IF;
END $$;

-- First, add the missing columns if they don't exist
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'kg';

-- Update the existing metal material to Aluminium Cans with new rate
UPDATE public.materials 
SET 
    name = 'Aluminium Cans',
    category = 'Metal',
    rate_per_kg = 18.55,
    description = 'Clean aluminium beverage cans and containers',
    updated_at = NOW()
WHERE name = 'Aluminum Cans' OR name = 'Aluminium Cans' OR (category IS NOT NULL AND category = 'Metal');

-- If no metal material exists, insert the new Aluminium Cans material
INSERT INTO public.materials (
    name,
    category,
    unit,
    rate_per_kg,
    description,
    is_active
) 
SELECT 
    'Aluminium Cans',
    'Metal',
    'kg',
    18.55,
    'Clean aluminium beverage cans and containers',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.materials 
    WHERE name = 'Aluminium Cans' OR (category IS NOT NULL AND category = 'Metal')
);

-- ============================================================================
-- STEP 6: CREATE ROBUST ADDRESS DISPLAY VIEWS
-- ============================================================================

-- Drop and recreate the view with a more robust structure for office customers
DROP VIEW IF EXISTS customer_profiles_with_addresses_view;

CREATE OR REPLACE VIEW customer_profiles_with_addresses_view AS
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.first_name,
    p.last_name,
    p.username,
    p.phone,
    p.role,
    p.is_active,
    p.created_at,
    p.updated_at,
    CASE 
        WHEN COUNT(a.id) > 0 THEN
            json_agg(
                json_build_object(
                    'id', a.id,
                    'line1', COALESCE(a.street_address, ''),
                    'suburb', COALESCE(a.suburb, ''),
                    'city', COALESCE(a.city, ''),
                    'postal_code', COALESCE(a.postal_code, ''),
                    'lat', a.latitude,
                    'lng', a.longitude,
                    'is_primary', COALESCE(a.is_primary, false)
                ) ORDER BY a.is_primary DESC, a.created_at ASC
            )
        ELSE '[]'::json
    END as addresses
FROM profiles p
LEFT JOIN addresses a ON p.id = a.customer_id
WHERE p.role = 'member' AND p.is_active = true
GROUP BY p.id, p.email, p.full_name, p.first_name, p.last_name, p.username, p.phone, p.role, p.is_active, p.created_at, p.updated_at;

-- ============================================================================
-- STEP 7: CREATE COMPREHENSIVE OFFICE DASHBOARD VIEWS
-- ============================================================================

-- Create or update the office dashboard view for customers
CREATE OR REPLACE VIEW office_customer_dashboard_view AS
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.first_name,
    p.last_name,
    p.phone,
    p.role,
    p.is_active,
    p.created_at,
    p.updated_at,
    CASE 
        WHEN COUNT(a.id) > 0 THEN
            json_agg(
                json_build_object(
                    'id', a.id,
                    'line1', COALESCE(a.street_address, ''),
                    'suburb', COALESCE(a.suburb, ''),
                    'city', COALESCE(a.city, ''),
                    'postal_code', COALESCE(a.postal_code, ''),
                    'lat', a.latitude,
                    'lng', a.longitude,
                    'is_primary', COALESCE(a.is_primary, false)
                ) ORDER BY a.is_primary DESC, a.created_at ASC
            )
        ELSE '[]'::json
    END as addresses,
    COALESCE(w.balance, 0.00) as wallet_balance,
    COALESCE(w.total_points, 0) as total_points,
    COALESCE(w.tier, 'Bronze Recycler') as tier,
    COUNT(pk.id) as total_pickups,
    COUNT(pk.id) FILTER (WHERE pk.status = 'completed') as completed_pickups,
    COUNT(pk.id) FILTER (WHERE pk.status = 'submitted') as pending_pickups,
    COALESCE(SUM(pk.total_value), 0.00) as total_earnings
FROM profiles p
LEFT JOIN addresses a ON p.id = a.customer_id
LEFT JOIN wallets w ON p.id = w.user_id
LEFT JOIN pickups pk ON p.id = pk.customer_id
WHERE p.role = 'member' AND p.is_active = true
GROUP BY p.id, p.email, p.full_name, p.first_name, p.last_name, p.username, p.phone, p.role, p.is_active, p.created_at, p.updated_at, w.balance, w.total_points, w.tier;

-- Create a comprehensive customer management view
CREATE OR REPLACE VIEW public.office_customer_management_view AS
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.first_name,
  p.last_name,
  p.phone,
  p.role,
  p.is_active,
  p.created_at,
  p.updated_at,
  COUNT(a.id) as address_count,
  COUNT(pk.id) as total_pickups,
  COUNT(pk.id) FILTER (WHERE pk.status = 'completed') as completed_pickups,
  COUNT(pk.id) FILTER (WHERE pk.status = 'submitted') as pending_pickups,
  COALESCE(SUM(pk.total_value), 0.00) as total_earnings,
  COALESCE(w.balance, 0.00) as wallet_balance,
  COALESCE(w.total_points, 0) as total_points,
  COALESCE(w.tier, 'Bronze Recycler') as tier
FROM public.profiles p
LEFT JOIN public.addresses a ON p.id = a.customer_id
LEFT JOIN public.pickups pk ON p.id = pk.customer_id
LEFT JOIN public.wallets w ON p.id = w.user_id
WHERE p.role = 'member'
GROUP BY p.id, p.email, p.full_name, p.first_name, p.last_name, p.username, p.phone, p.role, p.is_active, p.created_at, p.updated_at, w.balance, w.total_points, w.tier;

-- Create a collector performance view
CREATE OR REPLACE VIEW public.office_collector_performance_view AS
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.first_name,
  p.last_name,
  p.phone,
  p.role,
  p.is_active,
  p.created_at,
  p.updated_at,
  COUNT(pk.id) as total_pickups_assigned,
  COUNT(pk.id) FILTER (WHERE pk.status = 'completed') as completed_pickups,
  COUNT(pk.id) FILTER (WHERE pk.status = 'submitted') as pending_pickups,
  COALESCE(SUM(pi.total_kg), 0) as total_kg_collected,
  COALESCE(SUM(pi.total_value), 0.00) as total_value_collected,
  COUNT(DISTINCT cs.work_date) as total_work_days
FROM public.profiles p
LEFT JOIN public.pickups pk ON p.id = pk.collector_id
LEFT JOIN (
  SELECT 
    pickup_id,
    SUM(kilograms) as total_kg,
    SUM(kilograms * m.rate_per_kg) as total_value
  FROM public.pickup_items pi
  JOIN public.materials m ON pi.material_id = m.id
  GROUP BY pickup_id
) pi ON pk.id = pi.pickup_id
LEFT JOIN public.collector_schedules cs ON p.id = cs.collector_id
WHERE p.role = 'collector'
GROUP BY p.id, p.email, p.full_name, p.first_name, p.last_name, p.username, p.phone, p.role, p.is_active, p.created_at, p.updated_at;

-- ============================================================================
-- STEP 8: ENSURE PROPER CUSTOMER DATA WITH ADDRESSES
-- ============================================================================

DO $$
DECLARE
    customer_count INTEGER;
    address_count INTEGER;
BEGIN
    -- Check if we have any customers
    SELECT COUNT(*) INTO customer_count FROM profiles WHERE role = 'member';
    
    IF customer_count = 0 THEN
        RAISE NOTICE 'No customers found - creating sample customer data...';
        
        -- Insert sample customer profiles (using 'member' role as per existing constraint)
        INSERT INTO profiles (
            email,
            full_name,
            first_name,
            last_name,
            username,
            role,
            is_active,
            phone
        ) VALUES 
            ('john.doe@example.com', 'John Doe', 'John', 'Doe', 'johndoe', 'member', true, '+27123456789'),
            ('jane.smith@example.com', 'Jane Smith', 'Jane', 'Smith', 'janesmith', 'member', true, '+27123456790'),
            ('mike.johnson@example.com', 'Mike Johnson', 'Mike', 'Johnson', 'mikejohnson', 'member', true, '+27123456791'),
            ('sarah.wilson@example.com', 'Sarah Wilson', 'Sarah', 'Wilson', 'sarahwilson', 'member', true, '+27123456792'),
            ('david.brown@example.com', 'David Brown', 'David', 'Brown', 'davidbrown', 'member', true, '+27123456793')
        ON CONFLICT (email) DO NOTHING;
        
        RAISE NOTICE 'Sample customer profiles created';
    ELSE
        RAISE NOTICE 'Found % existing customers', customer_count;
    END IF;
    
    -- Check if we have addresses for customers
    SELECT COUNT(*) INTO address_count 
    FROM addresses a 
    JOIN profiles p ON a.customer_id = p.id 
    WHERE p.role = 'member';
    
    IF address_count = 0 THEN
        RAISE NOTICE 'No addresses found for customers - creating sample addresses...';
        
        -- Insert sample addresses for the customers
        INSERT INTO addresses (
            customer_id,
            street_address,
            suburb,
            city,
            postal_code,
            is_primary,
            latitude,
            longitude
        )
        SELECT 
            p.id,
            CASE 
                WHEN p.email = 'john.doe@example.com' THEN '123 Main Street'
                WHEN p.email = 'jane.smith@example.com' THEN '456 Oak Avenue'
                WHEN p.email = 'mike.johnson@example.com' THEN '789 Pine Road'
                WHEN p.email = 'sarah.wilson@example.com' THEN '321 Elm Street'
                WHEN p.email = 'david.brown@example.com' THEN '654 Maple Drive'
            END,
            CASE 
                WHEN p.email = 'john.doe@example.com' THEN 'Sandton'
                WHEN p.email = 'jane.smith@example.com' THEN 'Rosebank'
                WHEN p.email = 'mike.johnson@example.com' THEN 'Melrose'
                WHEN p.email = 'sarah.wilson@example.com' THEN 'Parktown'
                WHEN p.email = 'david.brown@example.com' THEN 'Houghton'
            END,
            'Johannesburg',
            '2000',
            true,
            CASE 
                WHEN p.email = 'john.doe@example.com' THEN -26.1087
                WHEN p.email = 'jane.smith@example.com' THEN -26.1420
                WHEN p.email = 'mike.johnson@example.com' THEN -26.1133
                WHEN p.email = 'sarah.wilson@example.com' THEN -26.1899
                WHEN p.email = 'david.brown@example.com' THEN -26.1659
            END,
            CASE 
                WHEN p.email = 'john.doe@example.com' THEN 28.0567
                WHEN p.email = 'jane.smith@example.com' THEN 28.0473
                WHEN p.email = 'mike.johnson@example.com' THEN 28.0473
                WHEN p.email = 'sarah.wilson@example.com' THEN 28.0444
                WHEN p.email = 'david.brown@example.com' THEN 28.0444
            END
        FROM profiles p
        WHERE p.role = 'member'
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Sample addresses created for customers';
    ELSE
        RAISE NOTICE 'Found % existing addresses for customers', address_count;
    END IF;
END $$;

-- ============================================================================
-- STEP 9: GRANT PERMISSIONS AND SET UP RLS
-- ============================================================================

-- Grant permissions on the views
GRANT SELECT ON customer_profiles_with_addresses_view TO authenticated;
GRANT SELECT ON office_customer_dashboard_view TO authenticated;
GRANT SELECT ON public.office_customer_management_view TO authenticated;
GRANT SELECT ON public.office_collector_performance_view TO authenticated;

-- Create additional indexes for better performance
CREATE INDEX IF NOT EXISTS idx_addresses_customer_id ON addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_addresses_is_primary ON addresses(is_primary);
CREATE INDEX IF NOT EXISTS idx_profiles_role_active ON profiles(role, is_active);

-- Update RLS policies if needed
-- Ensure profiles table has proper RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to view customer profiles
DROP POLICY IF EXISTS "Authenticated users can view customer profiles" ON profiles;
CREATE POLICY "Authenticated users can view customer profiles" ON profiles
    FOR SELECT USING (auth.role() = 'authenticated' AND role = 'member');

-- Ensure addresses table has proper RLS
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to view addresses
DROP POLICY IF EXISTS "Authenticated users can view addresses" ON addresses;
CREATE POLICY "Authenticated users can view addresses" ON addresses
    FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================================
-- STEP 10: VERIFICATION AND TESTING
-- ============================================================================

-- Verify the data structure
SELECT 
    'Data Verification' as test_type,
    'profiles' as table_name,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE role = 'member') as customer_count
FROM profiles
UNION ALL
SELECT 
    'Data Verification' as test_type,
    'addresses' as table_name,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE customer_id IN (SELECT id FROM profiles WHERE role = 'member')) as customer_addresses
FROM addresses;

-- Test the view output structure
SELECT 
    'View Test' as test_type,
    id,
    email,
    first_name,
    last_name,
    json_typeof(addresses) as addresses_type,
    json_array_length(addresses) as addresses_count
FROM customer_profiles_with_addresses_view
LIMIT 3;

-- Test office dashboard view
SELECT 
    'Office Dashboard Test' as test_type,
    id,
    email,
    full_name,
    wallet_balance,
    total_points,
    tier,
    total_pickups,
    completed_pickups,
    total_earnings
FROM office_customer_dashboard_view
LIMIT 5;

-- Test authenticated user access
DO $$
BEGIN
    RAISE NOTICE 'Testing authenticated user access...';
    RAISE NOTICE 'Current user: %', current_user;
    RAISE NOTICE 'Current role: %', current_role;
    
    -- Test if we can access the views
    PERFORM COUNT(*) FROM customer_profiles_with_addresses_view;
    RAISE NOTICE 'Customer profiles view access successful - count: %', (SELECT COUNT(*) FROM customer_profiles_with_addresses_view);
    
    PERFORM COUNT(*) FROM office_customer_dashboard_view;
    RAISE NOTICE 'Office dashboard view access successful - count: %', (SELECT COUNT(*) FROM office_customer_dashboard_view);
    
    -- Test if we can access individual tables
    PERFORM COUNT(*) FROM profiles WHERE role = 'member';
    RAISE NOTICE 'Profiles access successful - customer count: %', (SELECT COUNT(*) FROM profiles WHERE role = 'member');
    
    PERFORM COUNT(*) FROM addresses WHERE customer_id IN (SELECT id FROM profiles WHERE role = 'member');
    RAISE NOTICE 'Addresses access successful - customer address count: %', (SELECT COUNT(*) FROM addresses WHERE customer_id IN (SELECT id FROM profiles WHERE role = 'member'));
END $$;

-- Final verification
SELECT 
    'Final Verification' as test_type,
    'customer_profiles_with_addresses_view' as view_name,
    COUNT(*) as record_count
FROM customer_profiles_with_addresses_view
UNION ALL
SELECT 
    'Final Verification' as test_type,
    'office_customer_dashboard_view' as view_name,
    COUNT(*) as record_count
FROM office_customer_dashboard_view
UNION ALL
SELECT 
    'Final Verification' as test_type,
    'office_customer_management_view' as view_name,
    COUNT(*) as record_count
FROM public.office_customer_management_view
UNION ALL
SELECT 
    'Final Verification' as test_type,
    'office_collector_performance_view' as view_name,
    COUNT(*) as record_count
FROM public.office_collector_performance_view;

-- ============================================================================
-- STEP 10.5: CREATE MISSING TABLES
-- ============================================================================

-- Create collector_assignments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.collector_assignments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  collector_id UUID REFERENCES public.profiles(id) NOT NULL,
  pickup_id UUID REFERENCES public.pickups(id) NOT NULL,
  assigned_by UUID REFERENCES public.profiles(id) NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'accepted', 'in_progress', 'completed')),
  notes TEXT,
  UNIQUE(pickup_id)
);

-- Create user_activity_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  activity_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create collector_schedules table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.collector_schedules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  collector_id UUID REFERENCES public.profiles(id) NOT NULL,
  work_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  area_assigned TEXT,
  max_pickups INTEGER DEFAULT 20,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 11: CREATE MEMBER PROFILE UPDATE TRIGGERS
-- ============================================================================

-- Create function to update member profile stats on collection completion
CREATE OR REPLACE FUNCTION public.update_member_profile_on_collection()
RETURNS TRIGGER AS $$
DECLARE
    total_kg DECIMAL(10,3);
    total_value DECIMAL(10,2);
    total_points INTEGER;
BEGIN
    -- Only process if pickup status changed to completed
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        
        -- Calculate total weight and value from pickup items
        SELECT 
            COALESCE(SUM(pi.kilograms), 0),
            COALESCE(SUM(pi.kilograms * m.rate_per_kg), 0)
        INTO total_kg, total_value
        FROM public.pickup_items pi
        JOIN public.materials m ON pi.material_id = m.id
        WHERE pi.pickup_id = NEW.id;
        
        -- Calculate points (example: 1 point per kg, bonus for high value)
        total_points := FLOOR(total_kg) + FLOOR(total_value / 10);
        
        -- Update or create wallet record for the member
        INSERT INTO public.wallets (
            user_id,
            balance,
            total_points,
            tier,
            updated_at
        )
        VALUES (
            NEW.customer_id,
            total_value,
            total_points,
            CASE 
                WHEN total_points >= 1000 THEN 'Diamond Recycler'
                WHEN total_points >= 500 THEN 'Platinum Recycler'
                WHEN total_points >= 250 THEN 'Gold Recycler'
                WHEN total_points >= 100 THEN 'Silver Recycler'
                ELSE 'Bronze Recycler'
            END,
            NOW()
        )
        ON CONFLICT (user_id) 
        DO UPDATE SET
            balance = wallets.balance + EXCLUDED.balance,
            total_points = wallets.total_points + EXCLUDED.total_points,
            tier = CASE 
                WHEN (wallets.total_points + EXCLUDED.total_points) >= 1000 THEN 'Diamond Recycler'
                WHEN (wallets.total_points + EXCLUDED.total_points) >= 500 THEN 'Platinum Recycler'
                WHEN (wallets.total_points + EXCLUDED.total_points) >= 250 THEN 'Gold Recycler'
                WHEN (wallets.total_points + EXCLUDED.total_points) >= 100 THEN 'Silver Recycler'
                ELSE 'Bronze Recycler'
            END,
            updated_at = NOW();
        
        -- Create payment record for the collection
        INSERT INTO public.payments (
            wallet_id,
            pickup_id,
            amount,
            transaction_type,
            description,
            reference,
            status,
            processed_at
        )
        SELECT 
            w.id,
            NEW.id,
            total_value,
            'credit',
            'Collection payment for pickup #' || NEW.id,
            'PICKUP_' || NEW.id,
            'completed',
            NOW()
        FROM public.wallets w
        WHERE w.user_id = NEW.customer_id;
        
        -- Log the activity
        INSERT INTO public.user_activity_log (
            user_id,
            activity_type,
            description,
            metadata
        )
        VALUES (
            NEW.customer_id,
            'collection_completed',
            'Completed collection with ' || total_kg || 'kg worth R' || total_value,
            jsonb_build_object(
                'pickup_id', NEW.id,
                'total_kg', total_kg,
                'total_value', total_value,
                'points_earned', total_points
            )
        );
        
        RAISE NOTICE 'Updated member profile for user %: +%kg, +R%, +% points', 
            NEW.customer_id, total_kg, total_value, total_points;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for pickup status changes
DROP TRIGGER IF EXISTS trigger_update_member_profile_on_collection ON public.pickups;
CREATE TRIGGER trigger_update_member_profile_on_collection
    AFTER UPDATE ON public.pickups
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_member_profile_on_collection();

-- Create function for pickup creation logging
CREATE OR REPLACE FUNCTION public.update_member_profile_on_pickup_creation()
RETURNS TRIGGER AS $$
BEGIN
    -- Log pickup creation activity
    INSERT INTO public.user_activity_log (
        user_id,
        activity_type,
        description,
        metadata
    )
    VALUES (
        NEW.customer_id,
        'pickup_created',
        'Created new pickup request',
        jsonb_build_object(
            'pickup_id', NEW.id,
            'status', NEW.status,
            'address_id', NEW.address_id
        )
    );
    
    -- Update member's last activity
    UPDATE public.profiles 
    SET 
        updated_at = NOW()
    WHERE id = NEW.customer_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for pickup creation
DROP TRIGGER IF EXISTS trigger_update_member_profile_on_pickup_creation ON public.pickups;
CREATE TRIGGER trigger_update_member_profile_on_pickup_creation
    AFTER INSERT ON public.pickups
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_member_profile_on_pickup_creation();

-- Create member collection stats view
CREATE OR REPLACE VIEW public.member_collection_stats_view AS
SELECT 
    p.id as profile_id,
    p.email,
    p.full_name,
    p.first_name,
    p.last_name,
    p.role,
    p.is_active,
    p.created_at as member_since,
    COALESCE(w.balance, 0.00) as total_earnings,
    COALESCE(w.total_points, 0) as total_points,
    COALESCE(w.tier, 'Bronze Recycler') as current_tier,
    COUNT(pk.id) as total_collections,
    COUNT(pk.id) FILTER (WHERE pk.status = 'completed') as completed_collections,
    COUNT(pk.id) FILTER (WHERE pk.status = 'submitted') as pending_collections,
    COALESCE(SUM(pi.total_kg), 0) as total_kg_collected,
    COALESCE(SUM(pi.total_value), 0.00) as total_value_collected,
    COALESCE(AVG(pi.total_kg), 0) as avg_kg_per_collection,
    COALESCE(MAX(pk.submitted_at), p.created_at) as last_collection_date
FROM public.profiles p
LEFT JOIN public.wallets w ON p.id = w.user_id
LEFT JOIN public.pickups pk ON p.id = pk.customer_id
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
GROUP BY p.id, p.email, p.full_name, p.first_name, p.last_name, p.role, p.is_active, p.created_at, w.balance, w.total_points, w.tier;

-- Grant permissions on the new view
GRANT SELECT ON public.member_collection_stats_view TO authenticated;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- Office database updates complete!
-- The following updates have been applied:
-- 1. Updated table structures for consistency with collector
-- 2. Created robust address display views
-- 3. Added comprehensive office dashboard views
-- 4. Ensured proper customer data with addresses
-- 5. Set up proper permissions and RLS policies
-- 6. Added performance indexes
-- 7. Created sample data for testing
-- 8. Added comprehensive verification queries
-- 9. Added automatic member profile updates on collection save
-- 10. Implemented points system and tier progression
-- 11. Added activity logging and payment tracking
-- 
-- The office database now has the same robust structure and functionality as the collector database.
-- When members save collections, their profiles will automatically be updated with earnings, points, and tier progression.
