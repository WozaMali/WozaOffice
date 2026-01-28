-- ============================================================================
-- UPDATE MEMBER PROFILE ON COLLECTION SAVE
-- ============================================================================
-- This script creates triggers and functions to automatically update member profiles
-- when they save/complete a collection

-- ============================================================================
-- CREATE MISSING TABLES IF THEY DON'T EXIST
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
-- CREATE FUNCTION TO UPDATE MEMBER PROFILE STATS
-- ============================================================================

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
            balance = wallets.balance + total_value,
            total_points = wallets.total_points + total_points,
            tier = CASE 
                WHEN (wallets.total_points + total_points) >= 1000 THEN 'Diamond Recycler'
                WHEN (wallets.total_points + total_points) >= 500 THEN 'Platinum Recycler'
                WHEN (wallets.total_points + total_points) >= 250 THEN 'Gold Recycler'
                WHEN (wallets.total_points + total_points) >= 100 THEN 'Silver Recycler'
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

-- ============================================================================
-- CREATE TRIGGER FOR PICKUP STATUS CHANGES
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_member_profile_on_collection ON public.pickups;

-- Create trigger for pickup status changes
CREATE TRIGGER trigger_update_member_profile_on_collection
    AFTER UPDATE ON public.pickups
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_member_profile_on_collection();

-- ============================================================================
-- CREATE FUNCTION TO UPDATE PROFILE STATS ON PICKUP CREATION
-- ============================================================================

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

-- ============================================================================
-- CREATE TRIGGER FOR PICKUP CREATION
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_member_profile_on_pickup_creation ON public.pickups;

-- Create trigger for pickup creation
CREATE TRIGGER trigger_update_member_profile_on_pickup_creation
    AFTER INSERT ON public.pickups
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_member_profile_on_pickup_creation();

-- ============================================================================
-- CREATE FUNCTION TO UPDATE PROFILE STATS ON PICKUP ITEMS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_member_profile_on_pickup_items()
RETURNS TRIGGER AS $$
DECLARE
    pickup_status TEXT;
    customer_id UUID;
BEGIN
    -- Get pickup status and customer ID
    SELECT p.status, p.customer_id 
    INTO pickup_status, customer_id
    FROM public.pickups p 
    WHERE p.id = COALESCE(NEW.pickup_id, OLD.pickup_id);
    
    -- If pickup is completed, recalculate totals
    IF pickup_status = 'completed' THEN
        -- Recalculate and update wallet balance
        UPDATE public.wallets 
        SET 
            balance = (
                SELECT COALESCE(SUM(pi.kilograms * m.rate_per_kg), 0)
                FROM public.pickup_items pi
                JOIN public.materials m ON pi.material_id = m.id
                JOIN public.pickups p ON pi.pickup_id = p.id
                WHERE p.customer_id = wallets.user_id 
                AND p.status = 'completed'
            ),
            total_points = (
                SELECT COALESCE(SUM(FLOOR(pi.kilograms) + FLOOR(pi.kilograms * m.rate_per_kg / 10)), 0)
                FROM public.pickup_items pi
                JOIN public.materials m ON pi.material_id = m.id
                JOIN public.pickups p ON pi.pickup_id = p.id
                WHERE p.customer_id = wallets.user_id 
                AND p.status = 'completed'
            ),
            tier = CASE 
                WHEN (
                    SELECT COALESCE(SUM(FLOOR(pi.kilograms) + FLOOR(pi.kilograms * m.rate_per_kg / 10)), 0)
                    FROM public.pickup_items pi
                    JOIN public.materials m ON pi.material_id = m.id
                    JOIN public.pickups p ON pi.pickup_id = p.id
                    WHERE p.customer_id = wallets.user_id 
                    AND p.status = 'completed'
                ) >= 1000 THEN 'Diamond Recycler'
                WHEN (
                    SELECT COALESCE(SUM(FLOOR(pi.kilograms) + FLOOR(pi.kilograms * m.rate_per_kg / 10)), 0)
                    FROM public.pickup_items pi
                    JOIN public.materials m ON pi.material_id = m.id
                    JOIN public.pickups p ON pi.pickup_id = p.id
                    WHERE p.customer_id = wallets.user_id 
                    AND p.status = 'completed'
                ) >= 500 THEN 'Platinum Recycler'
                WHEN (
                    SELECT COALESCE(SUM(FLOOR(pi.kilograms) + FLOOR(pi.kilograms * m.rate_per_kg / 10)), 0)
                    FROM public.pickup_items pi
                    JOIN public.materials m ON pi.material_id = m.id
                    JOIN public.pickups p ON pi.pickup_id = p.id
                    WHERE p.customer_id = wallets.user_id 
                    AND p.status = 'completed'
                ) >= 250 THEN 'Gold Recycler'
                WHEN (
                    SELECT COALESCE(SUM(FLOOR(pi.kilograms) + FLOOR(pi.kilograms * m.rate_per_kg / 10)), 0)
                    FROM public.pickup_items pi
                    JOIN public.materials m ON pi.material_id = m.id
                    JOIN public.pickups p ON pi.pickup_id = p.id
                    WHERE p.customer_id = wallets.user_id 
                    AND p.status = 'completed'
                ) >= 100 THEN 'Silver Recycler'
                ELSE 'Bronze Recycler'
            END,
            updated_at = NOW()
        WHERE user_id = customer_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CREATE TRIGGER FOR PICKUP ITEMS CHANGES
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_member_profile_on_pickup_items ON public.pickup_items;

-- Create trigger for pickup items changes
CREATE TRIGGER trigger_update_member_profile_on_pickup_items
    AFTER INSERT OR UPDATE OR DELETE ON public.pickup_items
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_member_profile_on_pickup_items();

-- ============================================================================
-- CREATE VIEW FOR MEMBER COLLECTION STATS
-- ============================================================================

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
WHERE p.role = 'CUSTOMER'
GROUP BY p.id, p.email, p.full_name, p.first_name, p.last_name, p.role, p.is_active, p.created_at, w.balance, w.total_points, w.tier;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions on the new view
GRANT SELECT ON public.member_collection_stats_view TO authenticated;

-- ============================================================================
-- TEST THE TRIGGERS
-- ============================================================================

-- Test query to verify the setup
SELECT 
    'Trigger Setup Verification' as test_type,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE '%member_profile%'
ORDER BY trigger_name;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Show member collection stats
SELECT 
    'Member Collection Stats' as test_type,
    profile_id,
    email,
    full_name,
    total_earnings,
    total_points,
    current_tier,
    total_collections,
    completed_collections,
    total_kg_collected,
    total_value_collected
FROM public.member_collection_stats_view
LIMIT 5;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- Member profile update on collection save complete!
-- The following features have been implemented:
-- 1. Automatic wallet balance updates when collections are completed
-- 2. Points system with tier progression (Bronze to Diamond Recycler)
-- 3. Payment records for each completed collection
-- 4. Activity logging for all collection-related actions
-- 5. Real-time profile statistics updates
-- 6. Comprehensive member collection stats view
-- 7. Triggers for pickup creation, completion, and item changes
-- 
-- When a member saves/completes a collection, their profile will automatically
-- be updated with earnings, points, tier progression, and activity history.
