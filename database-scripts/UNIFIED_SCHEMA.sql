-- ============================================================================
-- WOZAMALI UNIFIED DATABASE SCHEMA
-- ============================================================================
-- This schema establishes proper information flow between:
-- Main App → Office App → Collector App
-- Run this in your Supabase SQL Editor after the cleanup

-- ============================================================================
-- 1. CORE USER MANAGEMENT & AUTHENTICATION
-- ============================================================================

-- Extended user profiles with role-based access
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('member', 'collector', 'admin', 'office_staff')),
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
    
    CONSTRAINT valid_collector_id CHECK (
        (role = 'collector' AND collector_id IS NOT NULL) OR 
        (role != 'collector')
    )
);

-- User permissions and capabilities
CREATE TABLE public.user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    permission_name TEXT NOT NULL,
    granted BOOLEAN DEFAULT true,
    granted_by UUID REFERENCES public.user_profiles(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, permission_name)
);

-- ============================================================================
-- 2. LOCATION & ZONE MANAGEMENT
-- ============================================================================

-- Collection zones/areas
CREATE TABLE public.collection_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    city TEXT NOT NULL,
    province TEXT NOT NULL,
    country TEXT DEFAULT 'South Africa',
    coordinates POINT, -- For GPS mapping
    radius_km DECIMAL(5,2) DEFAULT 5.0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Zone assignments to collectors
CREATE TABLE public.zone_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID REFERENCES public.collection_zones(id) ON DELETE CASCADE,
    collector_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.user_profiles(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'temporary')),
    notes TEXT,
    
    UNIQUE(zone_id, collector_id)
);

-- ============================================================================
-- 3. MATERIALS & PRICING SYSTEM
-- ============================================================================

-- Material categories
CREATE TABLE public.material_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT, -- Icon identifier
    color TEXT DEFAULT '#3B82F6',
    sort_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Materials with pricing
CREATE TABLE public.materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.material_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    unit TEXT NOT NULL CHECK (unit IN ('kg', 'g', 'ton', 'piece', 'bottle', 'box')),
    base_price_per_unit DECIMAL(10,2) NOT NULL,
    current_price_per_unit DECIMAL(10,2) NOT NULL,
    min_quantity DECIMAL(8,2) DEFAULT 0,
    max_quantity_per_pickup DECIMAL(8,2),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dynamic pricing tiers
CREATE TABLE public.pricing_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID REFERENCES public.materials(id) ON DELETE CASCADE,
    tier_name TEXT NOT NULL,
    min_quantity DECIMAL(8,2) NOT NULL,
    max_quantity DECIMAL(8,2),
    price_multiplier DECIMAL(3,2) DEFAULT 1.00,
    bonus_points_per_unit INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(material_id, tier_name)
);

-- ============================================================================
-- 4. COLLECTION OPERATIONS
-- ============================================================================

-- Collection schedules
CREATE TABLE public.collection_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID REFERENCES public.collection_zones(id) ON DELETE CASCADE,
    collector_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    schedule_type TEXT DEFAULT 'weekly' CHECK (schedule_type IN ('daily', 'weekly', 'monthly', 'custom')),
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday
    start_time TIME,
    end_time TIME,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual collection pickups
CREATE TABLE public.collection_pickups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pickup_code TEXT UNIQUE NOT NULL, -- Human-readable code
    zone_id UUID REFERENCES public.collection_zones(id) ON DELETE CASCADE,
    collector_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_address TEXT NOT NULL,
    customer_coordinates POINT,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME,
    actual_date DATE,
    actual_time TIME,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Pickup items (materials collected)
CREATE TABLE public.pickup_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pickup_id UUID REFERENCES public.collection_pickups(id) ON DELETE CASCADE,
    material_id UUID REFERENCES public.materials(id) ON DELETE CASCADE,
    quantity DECIMAL(8,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pickup photos for verification
CREATE TABLE public.pickup_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pickup_id UUID REFERENCES public.collection_pickups(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    photo_type TEXT DEFAULT 'general' CHECK (photo_type IN ('before', 'after', 'general', 'verification')),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    uploaded_by UUID REFERENCES public.user_profiles(id)
);

-- ============================================================================
-- 5. REWARDS & POINTS SYSTEM
-- ============================================================================

-- User wallet/points
CREATE TABLE public.user_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    current_points INTEGER DEFAULT 0,
    total_points_earned INTEGER DEFAULT 0,
    total_points_spent INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Points transactions
CREATE TABLE public.points_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES public.user_wallets(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earned', 'spent', 'bonus', 'deduction', 'transfer', 'reset', 'adjustment')),
    points INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    source TEXT, -- 'collection', 'referral', 'bonus', 'reset', 'adjustment', etc.
    reference_id UUID, -- Links to pickup, referral, etc.
    description TEXT,
    admin_notes TEXT, -- For office staff to document reasons
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rewards catalog
CREATE TABLE public.rewards_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    points_cost INTEGER NOT NULL,
    reward_type TEXT DEFAULT 'physical' CHECK (reward_type IN ('physical', 'digital', 'voucher', 'cash')),
    active BOOLEAN DEFAULT true,
    stock_quantity INTEGER DEFAULT -1, -- -1 means unlimited
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User rewards redemptions
CREATE TABLE public.reward_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    reward_id UUID REFERENCES public.rewards_catalog(id) ON DELETE CASCADE,
    points_spent INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'fulfilled', 'cancelled')),
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fulfilled_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

-- ============================================================================
-- 6. ANALYTICS & REPORTING
-- ============================================================================

-- Collection performance metrics
CREATE TABLE public.collection_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collector_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_pickups INTEGER DEFAULT 0,
    completed_pickups INTEGER DEFAULT 0,
    total_materials_kg DECIMAL(10,2) DEFAULT 0,
    total_value DECIMAL(12,2) DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    efficiency_score DECIMAL(3,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(collector_id, date)
);

-- Zone performance analytics
CREATE TABLE public.zone_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID REFERENCES public.collection_zones(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_pickups INTEGER DEFAULT 0,
    total_materials_kg DECIMAL(10,2) DEFAULT 0,
    total_value DECIMAL(12,2) DEFAULT 0,
    active_collectors INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(zone_id, date)
);

-- ============================================================================
-- 7. NOTIFICATIONS & COMMUNICATIONS
-- ============================================================================

-- User notifications
CREATE TABLE public.user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT DEFAULT 'info' CHECK (notification_type IN ('info', 'success', 'warning', 'error')),
    read BOOLEAN DEFAULT false,
    action_url TEXT, -- Link to relevant page
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- System announcements
CREATE TABLE public.system_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    target_roles TEXT[], -- Which roles should see this
    active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 8. AUDIT & LOGGING
-- ============================================================================

-- User activity logs
CREATE TABLE public.user_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System audit logs
CREATE TABLE public.system_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    performed_by UUID REFERENCES public.user_profiles(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Administrative actions log (for office staff actions)
CREATE TABLE public.admin_actions_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('wallet_reset', 'metrics_reset', 'user_suspension', 'role_change', 'points_adjustment', 'data_export')),
    target_user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    action_details JSONB NOT NULL, -- Detailed information about the action
    reason TEXT, -- Why the action was taken
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 9. FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Auto-create wallet for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_wallets (user_id, current_points, total_points_earned)
    VALUES (NEW.id, 0, 0);
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Calculate and award points for collections
CREATE OR REPLACE FUNCTION public.calculate_collection_points()
RETURNS TRIGGER AS $$
DECLARE
    points_earned INTEGER;
    wallet_id UUID;
BEGIN
    -- Calculate points based on material value and quantity
    SELECT 
        COALESCE(SUM(
            CASE 
                WHEN pi.quantity >= 10 THEN pi.total_price * 2 -- Bonus for large quantities
                ELSE pi.total_price
            END
        ), 0) INTO points_earned
    FROM public.pickup_items pi
    WHERE pi.pickup_id = NEW.id;
    
    -- Get user's wallet
    SELECT uw.id INTO wallet_id
    FROM public.user_wallets uw
    JOIN public.collection_pickups cp ON cp.collector_id = uw.user_id
    WHERE cp.id = NEW.id;
    
    -- Update wallet and log transaction
    IF wallet_id IS NOT NULL AND points_earned > 0 THEN
        UPDATE public.user_wallets 
        SET current_points = current_points + points_earned,
            total_points_earned = total_points_earned + points_earned,
            last_updated = NOW()
        WHERE id = wallet_id;
        
        INSERT INTO public.points_transactions (
            wallet_id, transaction_type, points, balance_after, source, reference_id, description
        ) VALUES (
            wallet_id, 'earned', points_earned, 
            (SELECT current_points FROM public.user_wallets WHERE id = wallet_id),
            'collection', NEW.id, 'Points earned from collection pickup'
        );
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- 10. ADMINISTRATIVE FUNCTIONS (Office App Control)
-- ============================================================================

-- Function to reset user wallet (Office App can call this)
CREATE OR REPLACE FUNCTION public.reset_user_wallet(
    target_user_uuid UUID,
    admin_user_uuid UUID,
    reason TEXT DEFAULT 'Administrative reset',
    admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    target_wallet_id UUID;
    old_points INTEGER;
    result JSONB;
BEGIN
    -- Check if admin user has permission
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = admin_user_uuid AND role IN ('admin', 'office_staff')
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions to reset wallet';
    END IF;
    
    -- Get target user's wallet
    SELECT id, current_points INTO target_wallet_id, old_points
    FROM public.user_wallets 
    WHERE user_id = target_user_uuid;
    
    IF target_wallet_id IS NULL THEN
        RAISE EXCEPTION 'User wallet not found';
    END IF;
    
    -- Reset wallet to 0
    UPDATE public.user_wallets 
    SET current_points = 0,
        last_updated = NOW()
    WHERE id = target_wallet_id;
    
    -- Log the reset transaction
    INSERT INTO public.points_transactions (
        wallet_id, transaction_type, points, balance_after, source, description, admin_notes
    ) VALUES (
        target_wallet_id, 'reset', -old_points, 0, 'administrative_reset', 
        'Wallet reset by office staff', admin_notes
    );
    
    -- Log admin action
    INSERT INTO public.admin_actions_log (
        admin_user_id, action_type, target_user_id, action_details, reason
    ) VALUES (
        admin_user_uuid, 'wallet_reset', target_user_uuid,
        jsonb_build_object(
            'old_points', old_points,
            'new_points', 0,
            'admin_notes', admin_notes
        ),
        reason
    );
    
    -- Return result
    result := jsonb_build_object(
        'success', true,
        'message', 'Wallet reset successfully',
        'old_points', old_points,
        'new_points', 0,
        'reset_at', NOW()
    );
    
    RETURN result;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Function to reset user collection metrics (Office App can call this)
CREATE OR REPLACE FUNCTION public.reset_user_metrics(
    target_user_uuid UUID,
    admin_user_uuid UUID,
    reason TEXT DEFAULT 'Administrative reset',
    admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    old_metrics JSONB;
    result JSONB;
BEGIN
    -- Check if admin user has permission
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = admin_user_uuid AND role IN ('admin', 'office_staff')
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions to reset metrics';
    END IF;
    
    -- Get current metrics
    SELECT jsonb_agg(
        jsonb_build_object(
            'date', date,
            'total_pickups', total_pickups,
            'completed_pickups', completed_pickups,
            'total_materials_kg', total_materials_kg,
            'total_value', total_value,
            'points_earned', points_earned
        )
    ) INTO old_metrics
    FROM public.collection_metrics 
    WHERE collector_id = target_user_uuid;
    
    -- Reset all metrics to 0
    UPDATE public.collection_metrics 
    SET total_pickups = 0,
        completed_pickups = 0,
        total_materials_kg = 0,
        total_value = 0,
        points_earned = 0
    WHERE collector_id = target_user_uuid;
    
    -- Log admin action
    INSERT INTO public.admin_actions_log (
        admin_user_id, action_type, target_user_id, action_details, reason
    ) VALUES (
        admin_user_uuid, 'metrics_reset', target_user_uuid,
        jsonb_build_object(
            'old_metrics', old_metrics,
            'admin_notes', admin_notes
        ),
        reason
    );
    
    -- Return result
    result := jsonb_build_object(
        'success', true,
        'message', 'Collection metrics reset successfully',
        'reset_at', NOW()
    );
    
    RETURN result;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Function to adjust user points (Office App can call this)
CREATE OR REPLACE FUNCTION public.adjust_user_points(
    target_user_uuid UUID,
    admin_user_uuid UUID,
    points_adjustment INTEGER,
    adjustment_type TEXT DEFAULT 'adjustment',
    reason TEXT DEFAULT 'Administrative adjustment',
    admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    target_wallet_id UUID;
    old_points INTEGER;
    new_points INTEGER;
    result JSONB;
BEGIN
    -- Check if admin user has permission
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = admin_user_uuid AND role IN ('admin', 'office_staff')
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions to adjust points';
    END IF;
    
    -- Get target user's wallet
    SELECT id, current_points INTO target_wallet_id, old_points
    FROM public.user_wallets 
    WHERE user_id = target_user_uuid;
    
    IF target_wallet_id IS NULL THEN
        RAISE EXCEPTION 'User wallet not found';
    END IF;
    
    -- Calculate new points (ensure it doesn't go negative)
    new_points := GREATEST(0, old_points + points_adjustment);
    
    -- Update wallet
    UPDATE public.user_wallets 
    SET current_points = new_points,
        last_updated = NOW()
    WHERE id = target_wallet_id;
    
    -- Log the adjustment transaction
    INSERT INTO public.points_transactions (
        wallet_id, transaction_type, points, balance_after, source, description, admin_notes
    ) VALUES (
        target_wallet_id, adjustment_type, points_adjustment, new_points, 'administrative_adjustment', 
        reason, admin_notes
    );
    
    -- Log admin action
    INSERT INTO public.admin_actions_log (
        admin_user_id, action_type, target_user_id, action_details, reason
    ) VALUES (
        admin_user_uuid, 'points_adjustment', target_user_uuid,
        jsonb_build_object(
            'old_points', old_points,
            'points_adjustment', points_adjustment,
            'new_points', new_points,
            'adjustment_type', adjustment_type,
            'admin_notes', admin_notes
        ),
        reason
    );
    
    -- Return result
    result := jsonb_build_object(
        'success', true,
        'message', 'Points adjusted successfully',
        'old_points', old_points,
        'points_adjustment', points_adjustment,
        'new_points', new_points,
        'adjusted_at', NOW()
    );
    
    RETURN result;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Function to get user summary for Office App
CREATE OR REPLACE FUNCTION public.get_user_summary(
    target_user_uuid UUID,
    admin_user_uuid UUID
)
RETURNS JSONB AS $$
DECLARE
    user_profile JSONB;
    wallet_info JSONB;
    collection_summary JSONB;
    result JSONB;
BEGIN
    -- Check if admin user has permission
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = admin_user_uuid AND role IN ('admin', 'office_staff')
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions to view user summary';
    END IF;
    
    -- Get user profile
    SELECT jsonb_build_object(
        'id', id,
        'email', email,
        'full_name', full_name,
        'role', role,
        'status', status,
        'created_at', created_at,
        'last_login', last_login
    ) INTO user_profile
    FROM public.user_profiles 
    WHERE id = target_user_uuid;
    
    -- Get wallet info
    SELECT jsonb_build_object(
        'current_points', current_points,
        'total_points_earned', total_points_earned,
        'total_points_spent', total_points_spent,
        'last_updated', last_updated
    ) INTO wallet_info
    FROM public.user_wallets 
    WHERE user_id = target_user_uuid;
    
    -- Get collection summary
    SELECT jsonb_build_object(
        'total_pickups', COALESCE(SUM(total_pickups), 0),
        'total_materials_kg', COALESCE(SUM(total_materials_kg), 0),
        'total_value', COALESCE(SUM(total_value), 0),
        'total_points_earned', COALESCE(SUM(points_earned), 0)
    ) INTO collection_summary
    FROM public.collection_metrics 
    WHERE collector_id = target_user_uuid;
    
    -- Build result
    result := jsonb_build_object(
        'user_profile', user_profile,
        'wallet_info', wallet_info,
        'collection_summary', collection_summary,
        'retrieved_at', NOW()
    );
    
    RETURN result;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- ============================================================================
-- 11. APPLY TRIGGERS
-- ============================================================================

-- Apply updated_at triggers
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON public.user_profiles 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_collection_zones_updated_at 
    BEFORE UPDATE ON public.collection_zones 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_materials_updated_at 
    BEFORE UPDATE ON public.materials 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_collection_schedules_updated_at 
    BEFORE UPDATE ON public.collection_schedules 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_collection_pickups_updated_at 
    BEFORE UPDATE ON public.collection_pickups 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Apply new user wallet creation trigger
CREATE TRIGGER create_user_wallet 
    AFTER INSERT ON public.user_profiles 
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Apply collection points calculation trigger
CREATE TRIGGER calculate_points_on_pickup_completion 
    AFTER UPDATE OF status ON public.collection_pickups 
    FOR EACH ROW 
    WHEN (OLD.status != 'completed' AND NEW.status = 'completed')
    EXECUTE FUNCTION public.calculate_collection_points();

-- ============================================================================
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zone_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_pickups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions_log ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view their own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.user_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'office_staff')
        )
    );

-- Collection zones policies
CREATE POLICY "Everyone can view active zones" ON public.collection_zones
    FOR SELECT USING (status = 'active');

CREATE POLICY "Admins can manage zones" ON public.collection_zones
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'office_staff')
        )
    );

-- Materials policies
CREATE POLICY "Everyone can view active materials" ON public.materials
    FOR SELECT USING (active = true);

CREATE POLICY "Admins can manage materials" ON public.materials
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'office_staff')
        )
    );

-- Collection pickups policies
CREATE POLICY "Collectors can view their own pickups" ON public.collection_pickups
    FOR SELECT USING (
        collector_id = (
            SELECT id FROM public.user_profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Collectors can update their own pickups" ON public.collection_pickups
    FOR UPDATE USING (
        collector_id = (
            SELECT id FROM public.user_profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all pickups" ON public.collection_pickups
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'office_staff')
        )
    );

-- Wallet policies
CREATE POLICY "Users can view their own wallet" ON public.user_wallets
    FOR SELECT USING (
        user_id = (
            SELECT id FROM public.user_profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all wallets" ON public.user_wallets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'office_staff')
        )
    );

-- Admin actions log policies
CREATE POLICY "Admins can view admin actions" ON public.admin_actions_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'office_staff')
        )
    );

CREATE POLICY "Admins can create admin actions" ON public.admin_actions_log
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'office_staff')
        )
    );

-- ============================================================================
-- 13. INITIAL DATA SEEDING
-- ============================================================================

-- Insert default material categories
INSERT INTO public.material_categories (name, description, icon, color, sort_order) VALUES
('Plastics', 'All types of plastic materials', 'plastic', '#3B82F6', 1),
('Paper & Cardboard', 'Paper, cardboard, and paper products', 'paper', '#10B981', 2),
('Metals', 'Aluminum, steel, copper, and other metals', 'metal', '#F59E0B', 3),
('Glass', 'Glass bottles and containers', 'glass', '#8B5CF6', 4),
('Electronics', 'Electronic waste and components', 'electronics', '#EF4444', 5),
('Textiles', 'Clothing and fabric materials', 'textiles', '#EC4899', 6),
('Organic', 'Food waste and organic materials', 'organic', '#059669', 7);

-- Insert default materials
INSERT INTO public.materials (category_id, name, description, unit, base_price_per_unit, current_price_per_unit, min_quantity) VALUES
((SELECT id FROM public.material_categories WHERE name = 'Plastics'), 'PET Bottles', 'Clear plastic bottles', 'kg', 2.50, 2.50, 0.5),
((SELECT id FROM public.material_categories WHERE name = 'Plastics'), 'HDPE Containers', 'Milk jugs and detergent bottles', 'kg', 3.00, 3.00, 0.5),
((SELECT id FROM public.material_categories WHERE name = 'Paper & Cardboard'), 'Cardboard Boxes', 'Clean cardboard boxes', 'kg', 1.50, 1.50, 1.0),
((SELECT id FROM public.material_categories WHERE name = 'Metals'), 'Aluminum Cans', 'Beverage cans', 'kg', 8.00, 8.00, 0.5),
((SELECT id FROM public.material_categories WHERE name = 'Glass'), 'Glass Bottles', 'Clear and colored glass', 'kg', 1.00, 1.00, 1.0);

-- Insert default pricing tiers
INSERT INTO public.pricing_tiers (material_id, tier_name, min_quantity, max_quantity, price_multiplier, bonus_points_per_unit) VALUES
((SELECT id FROM public.materials WHERE name = 'PET Bottles'), 'Small', 0.5, 4.9, 1.00, 0),
((SELECT id FROM public.materials WHERE name = 'PET Bottles'), 'Medium', 5.0, 9.9, 1.10, 1),
((SELECT id FROM public.materials WHERE name = 'PET Bottles'), 'Large', 10.0, NULL, 1.25, 2);

-- ============================================================================
-- 14. VERIFICATION QUERIES
-- ============================================================================

-- Verify all tables were created
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Verify RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true
ORDER BY tablename;

-- Verify triggers were created
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY trigger_name;

-- Verify functions were created
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%reset%' OR routine_name LIKE '%adjust%' OR routine_name LIKE '%get_user%'
ORDER BY routine_name;

-- ============================================================================
-- SCHEMA CREATION COMPLETE! 🎉
-- ============================================================================
-- Your WozaMali database now has:
-- ✅ Unified user management across all apps
-- ✅ Proper role-based access control
-- ✅ Real-time data synchronization capabilities
-- ✅ Integrated rewards system
-- ✅ Comprehensive audit logging
-- ✅ Scalable material and pricing system
-- ✅ Zone-based collection management
-- ✅ Performance analytics and reporting
-- ✅ OFFICE APP ADMINISTRATIVE CONTROL:
--   ✅ Reset user wallets
--   ✅ Reset collection metrics (kgs)
--   ✅ Adjust user points
--   ✅ View user summaries
--   ✅ Full audit trail of all admin actions
-- 
-- Next steps:
-- 1. Test the schema with sample data
-- 2. Configure your apps to use the new schema
-- 3. Set up real-time subscriptions
-- 4. Implement the information flow between apps
-- 5. Test Office App administrative functions
