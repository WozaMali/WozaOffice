-- ============================================================================
-- GREEN SCHOLAR FUND SAFE SETUP
-- ============================================================================
-- This script safely sets up the Green Scholar Fund system
-- It handles existing tables and data gracefully

-- ============================================================================
-- DROP EXISTING TABLES IF THEY EXIST (SAFE APPROACH)
-- ============================================================================

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS collection_green_scholar_contributions CASCADE;
DROP TABLE IF EXISTS user_donations CASCADE;
DROP TABLE IF EXISTS green_scholar_transactions CASCADE;
DROP TABLE IF EXISTS green_scholar_fund_balance CASCADE;
DROP TABLE IF EXISTS child_headed_homes CASCADE;
DROP TABLE IF EXISTS schools CASCADE;

-- ============================================================================
-- BENEFICIARIES TABLES
-- ============================================================================

-- Schools table
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    school_code TEXT UNIQUE,
    address TEXT,
    city TEXT,
    province TEXT,
    contact_person TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    school_type TEXT CHECK (school_type IN ('primary', 'secondary', 'combined', 'special_needs')),
    student_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Child-headed homes table
CREATE TABLE child_headed_homes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    home_code TEXT UNIQUE,
    address TEXT,
    city TEXT,
    province TEXT,
    contact_person TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    children_count INTEGER DEFAULT 0,
    age_range TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- GREEN SCHOLAR FUND TABLES
-- ============================================================================

-- Green Scholar Fund transactions
CREATE TABLE green_scholar_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('pet_donation', 'direct_donation', 'fund_transfer', 'expense')),
    source_type TEXT NOT NULL CHECK (source_type IN ('collection', 'donation', 'admin_transfer')),
    source_id UUID,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    donor_name TEXT,
    donor_email TEXT,
    beneficiary_type TEXT CHECK (beneficiary_type IN ('school', 'child_home', 'general_fund')),
    beneficiary_id UUID,
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Green Scholar Fund balance tracking
CREATE TABLE green_scholar_fund_balance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_balance DECIMAL(10,2) DEFAULT 0.00,
    pet_donations_total DECIMAL(10,2) DEFAULT 0.00,
    direct_donations_total DECIMAL(10,2) DEFAULT 0.00,
    expenses_total DECIMAL(10,2) DEFAULT 0.00,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User donations with beneficiary selection
CREATE TABLE user_donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    donation_type TEXT DEFAULT 'monetary' CHECK (donation_type IN ('monetary', 'points', 'mixed')),
    beneficiary_type TEXT CHECK (beneficiary_type IN ('school', 'child_home', 'general_fund')),
    beneficiary_id UUID,
    donor_message TEXT,
    is_anonymous BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed', 'refunded')),
    payment_reference TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track which materials contribute to Green Scholar Fund
CREATE TABLE collection_green_scholar_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES unified_collections(id) ON DELETE CASCADE,
    material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
    material_name TEXT NOT NULL,
    weight_kg DECIMAL(8,3) NOT NULL,
    rate_per_kg DECIMAL(10,2) NOT NULL,
    total_value DECIMAL(10,2) NOT NULL,
    green_scholar_contribution DECIMAL(10,2) NOT NULL,
    user_wallet_contribution DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_green_scholar_transactions_type ON green_scholar_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_green_scholar_transactions_source ON green_scholar_transactions(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_green_scholar_transactions_beneficiary ON green_scholar_transactions(beneficiary_type, beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_user_donations_user ON user_donations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_donations_beneficiary ON user_donations(beneficiary_type, beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_schools_active ON schools(is_active);
CREATE INDEX IF NOT EXISTS idx_child_homes_active ON child_headed_homes(is_active);

-- ============================================================================
-- FUNCTIONS FOR GREEN SCHOLAR FUND
-- ============================================================================

-- Function to update Green Scholar Fund balance
CREATE OR REPLACE FUNCTION update_green_scholar_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the balance table
    INSERT INTO green_scholar_fund_balance (
        total_balance,
        pet_donations_total,
        direct_donations_total,
        expenses_total,
        last_updated
    )
    SELECT 
        COALESCE(SUM(
            CASE 
                WHEN transaction_type = 'pet_donation' THEN amount
                WHEN transaction_type = 'direct_donation' THEN amount
                WHEN transaction_type = 'expense' THEN -amount
                ELSE 0
            END
        ), 0) as total_balance,
        COALESCE(SUM(CASE WHEN transaction_type = 'pet_donation' THEN amount ELSE 0 END), 0) as pet_donations_total,
        COALESCE(SUM(CASE WHEN transaction_type = 'direct_donation' THEN amount ELSE 0 END), 0) as direct_donations_total,
        COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0) as expenses_total,
        NOW() as last_updated
    FROM green_scholar_transactions
    WHERE status = 'confirmed'
    ON CONFLICT (id) DO UPDATE SET
        total_balance = EXCLUDED.total_balance,
        pet_donations_total = EXCLUDED.pet_donations_total,
        direct_donations_total = EXCLUDED.direct_donations_total,
        expenses_total = EXCLUDED.expenses_total,
        last_updated = EXCLUDED.last_updated;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update balance
DROP TRIGGER IF EXISTS trigger_update_green_scholar_balance ON green_scholar_transactions;
CREATE TRIGGER trigger_update_green_scholar_balance
    AFTER INSERT OR UPDATE OR DELETE ON green_scholar_transactions
    FOR EACH STATEMENT
    EXECUTE FUNCTION update_green_scholar_balance();

-- Function to get monthly statistics
CREATE OR REPLACE FUNCTION get_green_scholar_monthly_stats()
RETURNS TABLE (
    month TEXT,
    pet_donations DECIMAL(10,2),
    direct_donations DECIMAL(10,2),
    expenses DECIMAL(10,2),
    net_balance DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COALESCE(SUM(CASE WHEN transaction_type = 'pet_donation' AND status = 'confirmed' THEN amount ELSE 0 END), 0) as pet_donations,
        COALESCE(SUM(CASE WHEN transaction_type = 'direct_donation' AND status = 'confirmed' THEN amount ELSE 0 END), 0) as direct_donations,
        COALESCE(SUM(CASE WHEN transaction_type = 'expense' AND status = 'confirmed' THEN amount ELSE 0 END), 0) as expenses,
        COALESCE(SUM(CASE WHEN status = 'confirmed' THEN 
            CASE 
                WHEN transaction_type = 'expense' THEN -amount 
                ELSE amount 
            END 
            ELSE 0 
        END), 0) as net_balance
    FROM green_scholar_transactions
    WHERE created_at >= NOW() - INTERVAL '12 months'
    GROUP BY TO_CHAR(created_at, 'YYYY-MM')
    ORDER BY month DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to create a direct donation
CREATE OR REPLACE FUNCTION create_direct_donation(
    p_user_id UUID,
    p_amount DECIMAL(10,2),
    p_beneficiary_type TEXT,
    p_beneficiary_id UUID,
    p_donor_message TEXT DEFAULT NULL,
    p_is_anonymous BOOLEAN DEFAULT false
)
RETURNS UUID AS $$
DECLARE
    v_donation_id UUID;
    v_transaction_id UUID;
    v_donor_name TEXT;
    v_donor_email TEXT;
    v_beneficiary_name TEXT;
BEGIN
    -- Get donor information
    SELECT full_name, email INTO v_donor_name, v_donor_email
    FROM user_profiles 
    WHERE id = p_user_id;
    
    -- Get beneficiary name
    IF p_beneficiary_type = 'school' THEN
        SELECT name INTO v_beneficiary_name FROM schools WHERE id = p_beneficiary_id;
    ELSIF p_beneficiary_type = 'child_home' THEN
        SELECT name INTO v_beneficiary_name FROM child_headed_homes WHERE id = p_beneficiary_id;
    ELSE
        v_beneficiary_name := 'General Fund';
    END IF;
    
    -- Create user donation record
    INSERT INTO user_donations (
        user_id,
        amount,
        donation_type,
        beneficiary_type,
        beneficiary_id,
        donor_message,
        is_anonymous,
        status
    ) VALUES (
        p_user_id,
        p_amount,
        'monetary',
        p_beneficiary_type,
        p_beneficiary_id,
        p_donor_message,
        p_is_anonymous,
        'confirmed'
    ) RETURNING id INTO v_donation_id;
    
    -- Create Green Scholar transaction
    INSERT INTO green_scholar_transactions (
        transaction_type,
        source_type,
        source_id,
        amount,
        description,
        donor_name,
        donor_email,
        beneficiary_type,
        beneficiary_id,
        status
    ) VALUES (
        'direct_donation',
        'donation',
        v_donation_id,
        p_amount,
        'Direct donation' || CASE WHEN p_is_anonymous THEN ' (anonymous)' ELSE ' from ' || v_donor_name END,
        CASE WHEN p_is_anonymous THEN 'Anonymous' ELSE v_donor_name END,
        CASE WHEN p_is_anonymous THEN NULL ELSE v_donor_email END,
        p_beneficiary_type,
        p_beneficiary_id,
        'confirmed'
    ) RETURNING id INTO v_transaction_id;
    
    RETURN v_donation_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get beneficiary statistics
CREATE OR REPLACE FUNCTION get_beneficiary_stats()
RETURNS TABLE (
    beneficiary_type TEXT,
    beneficiary_name TEXT,
    total_received DECIMAL(10,2),
    transaction_count BIGINT,
    last_donation_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gst.beneficiary_type,
        COALESCE(s.name, ch.name, 'General Fund') as beneficiary_name,
        COALESCE(SUM(gst.amount), 0) as total_received,
        COUNT(*) as transaction_count,
        MAX(gst.created_at) as last_donation_date
    FROM green_scholar_transactions gst
    LEFT JOIN schools s ON gst.beneficiary_type = 'school' AND gst.beneficiary_id = s.id
    LEFT JOIN child_headed_homes ch ON gst.beneficiary_type = 'child_home' AND gst.beneficiary_id = ch.id
    WHERE gst.status = 'confirmed'
    AND gst.transaction_type IN ('pet_donation', 'direct_donation')
    GROUP BY gst.beneficiary_type, s.name, ch.name
    ORDER BY total_received DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- UPDATE COLLECTION APPROVAL TO PROCESS PET DONATIONS
-- ============================================================================

-- Update the update_wallet_simple function to also process PET donations
CREATE OR REPLACE FUNCTION update_wallet_simple(
    p_collection_id UUID,
    p_amount DECIMAL(10,2),
    p_description TEXT,
    p_points INTEGER,
    p_transaction_type TEXT,
    p_user_id UUID
) RETURNS JSON AS $$
DECLARE
    v_wallet_id UUID;
    v_new_balance DECIMAL(10,2);
    v_transaction_id UUID;
    v_collection_data RECORD;
    v_material_data RECORD;
    v_green_scholar_amount DECIMAL(10,2) := 0;
    v_user_wallet_amount DECIMAL(10,2) := 0;
    v_result JSON;
BEGIN
    -- Get collection details
    SELECT 
        uc.id,
        uc.customer_id,
        up.full_name as customer_name,
        up.email as customer_email
    INTO v_collection_data
    FROM unified_collections uc
    JOIN user_profiles up ON uc.customer_id = up.id
    WHERE uc.id = p_collection_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Collection not found');
    END IF;

    -- Get or create wallet
    SELECT id INTO v_wallet_id
    FROM user_wallets
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        INSERT INTO user_wallets (user_id, current_points, total_points_earned)
        VALUES (p_user_id, 0, 0)
        RETURNING id INTO v_wallet_id;
    END IF;

    -- Process each material in the collection for Green Scholar Fund
    FOR v_material_data IN
        SELECT 
            cm.material_name,
            cm.quantity as weight_kg,
            cm.price_per_kg as rate_per_kg,
            cm.total_price as total_value
        FROM collection_materials cm
        WHERE cm.collection_id = p_collection_id
    LOOP
        -- Calculate Green Scholar Fund allocation
        -- PET materials: 100% to Green Scholar Fund
        -- Other materials: 70% Green Scholar, 30% user wallet
        IF v_material_data.material_name ILIKE '%PET%' OR v_material_data.material_name ILIKE '%plastic%' THEN
            v_green_scholar_amount := v_green_scholar_amount + v_material_data.total_value;
        ELSE
            v_green_scholar_amount := v_green_scholar_amount + (v_material_data.total_value * 0.7);
            v_user_wallet_amount := v_user_wallet_amount + (v_material_data.total_value * 0.3);
        END IF;

        -- Record the contribution breakdown
        INSERT INTO collection_green_scholar_contributions (
            collection_id,
            material_name,
            weight_kg,
            rate_per_kg,
            total_value,
            green_scholar_contribution,
            user_wallet_contribution
        ) VALUES (
            p_collection_id,
            v_material_data.material_name,
            v_material_data.weight_kg,
            v_material_data.rate_per_kg,
            v_material_data.total_value,
            CASE 
                WHEN v_material_data.material_name ILIKE '%PET%' OR v_material_data.material_name ILIKE '%plastic%' 
                THEN v_material_data.total_value
                ELSE v_material_data.total_value * 0.7
            END,
            CASE 
                WHEN v_material_data.material_name ILIKE '%PET%' OR v_material_data.material_name ILIKE '%plastic%' 
                THEN 0
                ELSE v_material_data.total_value * 0.3
            END
        );
    END LOOP;

    -- Create Green Scholar Fund transaction for PET donations
    IF v_green_scholar_amount > 0 THEN
        INSERT INTO green_scholar_transactions (
            transaction_type,
            source_type,
            source_id,
            amount,
            description,
            donor_name,
            donor_email,
            beneficiary_type,
            status
        ) VALUES (
            'pet_donation',
            'collection',
            p_collection_id,
            v_green_scholar_amount,
            'PET donation from collection ' || p_collection_id,
            v_collection_data.customer_name,
            v_collection_data.customer_email,
            'general_fund',
            'confirmed'
        );
    END IF;

    -- Update user wallet with their portion
    IF v_user_wallet_amount > 0 THEN
        -- Update wallet balance
        UPDATE user_wallets
        SET 
            current_points = current_points + p_points,
            total_points_earned = total_points_earned + p_points,
            last_updated = NOW()
        WHERE id = v_wallet_id
        RETURNING current_points INTO v_new_balance;

        -- Create points transaction
        INSERT INTO points_transactions (
            wallet_id,
            transaction_type,
            points,
            balance_after,
            source,
            reference_id,
            description
        ) VALUES (
            v_wallet_id,
            p_transaction_type,
            p_points,
            v_new_balance,
            'collection_approval',
            p_collection_id,
            p_description
        ) RETURNING id INTO v_transaction_id;
    END IF;

    -- Return success result
    v_result := json_build_object(
        'success', true,
        'wallet_id', v_wallet_id,
        'new_balance', v_new_balance,
        'transaction_id', v_transaction_id,
        'green_scholar_amount', v_green_scholar_amount,
        'user_wallet_amount', v_user_wallet_amount
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_wallet_simple(UUID, DECIMAL, TEXT, INTEGER, TEXT, UUID) TO authenticated;

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert initial balance record
INSERT INTO green_scholar_fund_balance (total_balance, pet_donations_total, direct_donations_total, expenses_total)
VALUES (0.00, 0.00, 0.00, 0.00);

-- Sample schools data
INSERT INTO schools (name, school_code, address, city, province, contact_person, contact_phone, school_type, student_count) VALUES
('Green Valley Primary School', 'GVP001', '123 Education Street', 'Cape Town', 'Western Cape', 'Mrs. Sarah Johnson', '+27 21 123 4567', 'primary', 450),
('Mountain View High School', 'MVH001', '456 Learning Avenue', 'Johannesburg', 'Gauteng', 'Mr. David Smith', '+27 11 234 5678', 'secondary', 800),
('Hope Special Needs School', 'HSN001', '789 Care Road', 'Durban', 'KwaZulu-Natal', 'Ms. Lisa Brown', '+27 31 345 6789', 'special_needs', 120);

-- Sample child-headed homes data
INSERT INTO child_headed_homes (name, home_code, address, city, province, contact_person, contact_phone, children_count, age_range) VALUES
('Sunshine Children''s Home', 'SCH001', '321 Hope Street', 'Cape Town', 'Western Cape', 'Mrs. Grace Mthembu', '+27 21 456 7890', 15, '6-18 years'),
('Rainbow Family Home', 'RFH001', '654 Family Lane', 'Johannesburg', 'Gauteng', 'Mr. John Nkomo', '+27 11 567 8901', 12, '8-16 years'),
('Future Leaders Home', 'FLH001', '987 Future Drive', 'Durban', 'KwaZulu-Natal', 'Ms. Thandi Dlamini', '+27 31 678 9012', 20, '5-17 years');

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_headed_homes ENABLE ROW LEVEL SECURITY;
ALTER TABLE green_scholar_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE green_scholar_fund_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_green_scholar_contributions ENABLE ROW LEVEL SECURITY;

-- Policies for schools (public read, admin write)
CREATE POLICY "Schools are viewable by everyone" ON schools FOR SELECT USING (true);
CREATE POLICY "Only admins can modify schools" ON schools FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Policies for child-headed homes (public read, admin write)
CREATE POLICY "Child homes are viewable by everyone" ON child_headed_homes FOR SELECT USING (true);
CREATE POLICY "Only admins can modify child homes" ON child_headed_homes FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Policies for green scholar transactions (admin only)
CREATE POLICY "Only admins can access green scholar transactions" ON green_scholar_transactions FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Policies for fund balance (admin only)
CREATE POLICY "Only admins can access fund balance" ON green_scholar_fund_balance FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Policies for user donations (users can create, admins can manage)
CREATE POLICY "Users can create donations" ON user_donations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own donations" ON user_donations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all donations" ON user_donations FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Policies for collection contributions (admin only)
CREATE POLICY "Only admins can access collection contributions" ON collection_green_scholar_contributions FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check that everything was created successfully
SELECT 'Green Scholar Fund Setup Complete!' as status;

-- Show initial data
SELECT 'Schools registered:' as info, COUNT(*) as count FROM schools;
SELECT 'Child-headed homes registered:' as info, COUNT(*) as count FROM child_headed_homes;
SELECT 'Initial fund balance:' as info, total_balance FROM green_scholar_fund_balance;
