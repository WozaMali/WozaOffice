-- ============================================================================
-- GREEN SCHOLAR FUND SYSTEM
-- ============================================================================
-- This schema creates the Green Scholar Fund system for tracking PET donations
-- and managing beneficiaries (schools and child-headed homes)

-- ============================================================================
-- BENEFICIARIES TABLES
-- ============================================================================

-- Schools table
CREATE TABLE IF NOT EXISTS schools (
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
CREATE TABLE IF NOT EXISTS child_headed_homes (
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
    age_range TEXT, -- e.g., "5-18 years"
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- GREEN SCHOLAR FUND TABLES
-- ============================================================================

-- Green Scholar Fund transactions
CREATE TABLE IF NOT EXISTS green_scholar_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('pet_donation', 'direct_donation', 'fund_transfer', 'expense')),
    source_type TEXT NOT NULL CHECK (source_type IN ('collection', 'donation', 'admin_transfer')),
    source_id UUID, -- Reference to collection_id or donation_id
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    donor_name TEXT, -- Name of person who made the donation
    donor_email TEXT, -- Email of person who made the donation
    beneficiary_type TEXT CHECK (beneficiary_type IN ('school', 'child_home', 'general_fund')),
    beneficiary_id UUID, -- Reference to school_id or child_headed_home_id
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Green Scholar Fund balance tracking
CREATE TABLE IF NOT EXISTS green_scholar_fund_balance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_balance DECIMAL(10,2) DEFAULT 0.00,
    pet_donations_total DECIMAL(10,2) DEFAULT 0.00,
    direct_donations_total DECIMAL(10,2) DEFAULT 0.00,
    expenses_total DECIMAL(10,2) DEFAULT 0.00,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- DONATION TRACKING TABLES
-- ============================================================================

-- User donations with beneficiary selection
CREATE TABLE IF NOT EXISTS user_donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    donation_type TEXT DEFAULT 'monetary' CHECK (donation_type IN ('monetary', 'points', 'mixed')),
    beneficiary_type TEXT CHECK (beneficiary_type IN ('school', 'child_home', 'general_fund')),
    beneficiary_id UUID, -- Reference to school_id or child_headed_home_id
    donor_message TEXT, -- Optional message from donor
    is_anonymous BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed', 'refunded')),
    payment_reference TEXT, -- External payment reference
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- COLLECTION MATERIALS TRACKING
-- ============================================================================

-- Track which materials contribute to Green Scholar Fund
CREATE TABLE IF NOT EXISTS collection_green_scholar_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES unified_collections(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    material_name TEXT NOT NULL,
    weight_kg DECIMAL(8,3) NOT NULL,
    rate_per_kg DECIMAL(10,2) NOT NULL,
    total_value DECIMAL(10,2) NOT NULL,
    green_scholar_contribution DECIMAL(10,2) NOT NULL, -- Amount going to Green Scholar Fund
    user_wallet_contribution DECIMAL(10,2) NOT NULL, -- Amount going to user wallet
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
CREATE TRIGGER trigger_update_green_scholar_balance
    AFTER INSERT OR UPDATE OR DELETE ON green_scholar_transactions
    FOR EACH STATEMENT
    EXECUTE FUNCTION update_green_scholar_balance();

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert initial balance record
INSERT INTO green_scholar_fund_balance (total_balance, pet_donations_total, direct_donations_total, expenses_total)
VALUES (0.00, 0.00, 0.00, 0.00)
ON CONFLICT DO NOTHING;

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
