-- ============================================================================
-- WOZA MALI DATABASE SCHEMA
-- ============================================================================
-- This schema supports the three apps: Main App (User), Collector App, Office App

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'collector', 'admin')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ADDRESSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    line1 VARCHAR(255) NOT NULL,
    suburb VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(10),
    area VARCHAR(100) NOT NULL, -- Collector assignment area
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- WALLETS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    balance DECIMAL(10, 2) DEFAULT 0.00,
    total_earned DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- COLLECTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    collector_id UUID REFERENCES users(id) ON DELETE CASCADE,
    address_id UUID REFERENCES addresses(id) ON DELETE CASCADE,
    material_type VARCHAR(100) NOT NULL,
    kgs DECIMAL(8, 3) NOT NULL,
    total_value DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    notes TEXT,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- TRANSACTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('credit', 'debit', 'adjustment')),
    reference VARCHAR(255), -- Collection ID or other reference
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- MATERIALS TABLE (for pricing)
-- ============================================================================
CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    rate_per_kg DECIMAL(8, 2) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Addresses indexes
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_area ON addresses(area);
CREATE INDEX IF NOT EXISTS idx_addresses_city ON addresses(city);
CREATE INDEX IF NOT EXISTS idx_addresses_suburb ON addresses(suburb);
CREATE INDEX IF NOT EXISTS idx_addresses_location ON addresses(lat, lng);

-- Collections indexes
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collections_collector_id ON collections(collector_id);
CREATE INDEX IF NOT EXISTS idx_collections_status ON collections(status);
CREATE INDEX IF NOT EXISTS idx_collections_created_at ON collections(created_at);

-- Wallets indexes
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);

-- Transactions indexes
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- ============================================================================
-- CONSTRAINTS
-- ============================================================================

-- Ensure only one primary address per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_addresses_one_primary_per_user 
ON addresses(user_id) WHERE is_primary = true;

-- Ensure positive values
ALTER TABLE collections ADD CONSTRAINT chk_collections_positive_values 
CHECK (kgs > 0 AND total_value >= 0);

ALTER TABLE wallets ADD CONSTRAINT chk_wallets_positive_balance 
CHECK (balance >= 0 AND total_earned >= 0);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON collections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON materials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create wallet for new users
CREATE OR REPLACE FUNCTION create_wallet_for_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO wallets (user_id, balance, total_earned)
    VALUES (NEW.id, 0.00, 0.00);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create wallet when user is created
CREATE TRIGGER create_wallet_trigger
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_wallet_for_user();

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert default materials
INSERT INTO materials (name, rate_per_kg, description) VALUES
('Paper', 2.50, 'Mixed paper and cardboard'),
('Plastic', 3.00, 'PET, HDPE, and other plastics'),
('Glass', 1.50, 'Clear and colored glass'),
('Metal', 4.00, 'Aluminum cans and scrap metal'),
('Electronics', 5.00, 'E-waste and electronic components')
ON CONFLICT (name) DO NOTHING;

-- Insert test admin user
INSERT INTO users (name, email, phone, password_hash, role) VALUES
('Admin User', 'admin@wozamali.com', '+27123456789', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Insert test collectors
INSERT INTO users (name, email, phone, password_hash, role) VALUES
('John Collector', 'john@wozamali.com', '+27123456790', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', 'collector'),
('Sarah Collector', 'sarah@wozamali.com', '+27123456791', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', 'collector')
ON CONFLICT (email) DO NOTHING;

-- Insert test users
INSERT INTO users (name, email, phone, password_hash, role) VALUES
('Alice Johnson', 'alice@example.com', '+27123456792', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', 'user'),
('Bob Smith', 'bob@example.com', '+27123456793', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', 'user'),
('Carol Davis', 'carol@example.com', '+27123456794', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', 'user'),
('David Wilson', 'david@example.com', '+27123456795', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', 'user'),
('Eva Brown', 'eva@example.com', '+27123456796', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', 'user')
ON CONFLICT (email) DO NOTHING;

-- Insert test addresses
INSERT INTO addresses (user_id, line1, suburb, city, postal_code, area, lat, lng, is_primary) VALUES
((SELECT id FROM users WHERE email = 'alice@example.com'), '123 Main Street', 'Sandton', 'Johannesburg', '2196', 'North Area', -26.1076, 28.0567, true),
((SELECT id FROM users WHERE email = 'bob@example.com'), '456 Oak Avenue', 'Sandton', 'Johannesburg', '2196', 'North Area', -26.1080, 28.0570, true),
((SELECT id FROM users WHERE email = 'carol@example.com'), '789 Pine Road', 'Rosebank', 'Johannesburg', '2196', 'Central Area', -26.1420, 28.0440, true),
((SELECT id FROM users WHERE email = 'david@example.com'), '321 Elm Street', 'Rosebank', 'Johannesburg', '2196', 'Central Area', -26.1430, 28.0450, true),
((SELECT id FROM users WHERE email = 'eva@example.com'), '654 Maple Drive', 'Melville', 'Johannesburg', '2109', 'West Area', -26.1620, 27.9980, true)
ON CONFLICT DO NOTHING;

-- Update collectors with assigned areas
UPDATE users SET 
    name = 'John Collector (North Area)',
    updated_at = NOW()
WHERE email = 'john@wozamali.com';

UPDATE users SET 
    name = 'Sarah Collector (Central Area)',
    updated_at = NOW()
WHERE email = 'sarah@wozamali.com';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all users" ON users FOR ALL USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));

-- Addresses policies
CREATE POLICY "Users can view own addresses" ON addresses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Collectors can view addresses in their area" ON addresses FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'collector'
        AND users.assigned_area = addresses.area
    )
);

-- Wallets policies
CREATE POLICY "Users can view own wallet" ON wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all wallets" ON wallets FOR ALL USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));

-- Collections policies
CREATE POLICY "Users can view own collections" ON collections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Collectors can view own collections" ON collections FOR SELECT USING (auth.uid() = collector_id);
CREATE POLICY "Collectors can create collections" ON collections FOR INSERT WITH CHECK (auth.uid() = collector_id);
CREATE POLICY "Admins can view all collections" ON collections FOR ALL USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM wallets WHERE id = wallet_id)
);
CREATE POLICY "Admins can view all transactions" ON transactions FOR ALL USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE users IS 'User accounts for all three apps (Main, Collector, Office)';
COMMENT ON TABLE addresses IS 'User addresses with area assignment for collectors';
COMMENT ON TABLE wallets IS 'User wallet balances and earnings';
COMMENT ON TABLE collections IS 'Collection records submitted by collectors';
COMMENT ON TABLE transactions IS 'Wallet transaction history';
COMMENT ON TABLE materials IS 'Material types and pricing rates';

COMMENT ON COLUMN users.role IS 'User role: user (customer), collector, or admin';
COMMENT ON COLUMN addresses.area IS 'Geographic area for collector assignment';
COMMENT ON COLUMN collections.status IS 'Collection status: pending, approved, or rejected';
COMMENT ON COLUMN transactions.type IS 'Transaction type: credit, debit, or adjustment';
