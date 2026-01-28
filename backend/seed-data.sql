-- ============================================================================
-- WOZA MALI SEED DATA
-- ============================================================================
-- This script populates the database with test data for development

-- Clear existing data (optional - comment out if you want to keep existing data)
-- DELETE FROM transactions;
-- DELETE FROM collections;
-- DELETE FROM wallets;
-- DELETE FROM addresses;
-- DELETE FROM users;
-- DELETE FROM materials;

-- ============================================================================
-- MATERIALS (Recycling rates)
-- ============================================================================
INSERT INTO materials (name, rate_per_kg, description) VALUES
('Paper', 2.50, 'Mixed paper and cardboard'),
('Plastic', 3.00, 'PET, HDPE, and other plastics'),
('Glass', 1.50, 'Clear and colored glass'),
('Metal', 4.00, 'Aluminum cans and scrap metal'),
('Electronics', 5.00, 'E-waste and electronic components'),
('Textiles', 1.00, 'Clothing and fabric waste'),
('Organic', 0.50, 'Food waste and compostables')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- ADMIN USERS
-- ============================================================================
INSERT INTO users (name, email, phone, password_hash, role, is_active) VALUES
('Admin User', 'admin@wozamali.com', '+27123456789', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', 'admin', true),
('Office Manager', 'manager@wozamali.com', '+27123456788', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', 'admin', true)
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- COLLECTORS (with assigned areas)
-- ============================================================================
INSERT INTO users (name, email, phone, password_hash, role, is_active) VALUES
('John Collector', 'john@wozamali.com', '+27123456790', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', 'collector', true),
('Sarah Collector', 'sarah@wozamali.com', '+27123456791', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', 'collector', true),
('Mike Collector', 'mike@wozamali.com', '+27123456792', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', 'collector', true),
('Lisa Collector', 'lisa@wozamali.com', '+27123456793', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', 'collector', true)
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- TEST USERS (Customers)
-- ============================================================================
INSERT INTO users (name, email, phone, password_hash, role, is_active) VALUES
('Alice Johnson', 'alice@example.com', '+27123456794', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', 'user', true),
('Bob Smith', 'bob@example.com', '+27123456795', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', 'user', true),
('Carol Davis', 'carol@example.com', '+27123456796', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', 'user', true),
('David Wilson', 'david@example.com', '+27123456797', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', 'user', true),
('Eva Brown', 'eva@example.com', '+27123456798', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', 'user', true),
('Frank Miller', 'frank@example.com', '+27123456799', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', 'user', true),
('Grace Lee', 'grace@example.com', '+27123456800', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', 'user', true),
('Henry Taylor', 'henry@example.com', '+27123456801', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', 'user', true),
('Ivy Chen', 'ivy@example.com', '+27123456802', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', 'user', true),
('Jack Anderson', 'jack@example.com', '+27123456803', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', 'user', true)
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- ADDRESSES (Geographically distributed across areas)
-- ============================================================================

-- North Area (John's territory)
INSERT INTO addresses (user_id, line1, suburb, city, postal_code, area, lat, lng, is_primary) VALUES
((SELECT id FROM users WHERE email = 'alice@example.com'), '123 Main Street', 'Sandton', 'Johannesburg', '2196', 'North Area', -26.1076, 28.0567, true),
((SELECT id FROM users WHERE email = 'bob@example.com'), '456 Oak Avenue', 'Sandton', 'Johannesburg', '2196', 'North Area', -26.1080, 28.0570, true),
((SELECT id FROM users WHERE email = 'frank@example.com'), '789 Pine Road', 'Sandton', 'Johannesburg', '2196', 'North Area', -26.1090, 28.0580, true),
((SELECT id FROM users WHERE email = 'grace@example.com'), '321 Elm Street', 'Sandton', 'Johannesburg', '2196', 'North Area', -26.1100, 28.0590, true);

-- Central Area (Sarah's territory)
INSERT INTO addresses (user_id, line1, suburb, city, postal_code, area, lat, lng, is_primary) VALUES
((SELECT id FROM users WHERE email = 'carol@example.com'), '654 Maple Drive', 'Rosebank', 'Johannesburg', '2196', 'Central Area', -26.1420, 28.0440, true),
((SELECT id FROM users WHERE email = 'david@example.com'), '987 Cedar Lane', 'Rosebank', 'Johannesburg', '2196', 'Central Area', -26.1430, 28.0450, true),
((SELECT id FROM users WHERE email = 'henry@example.com'), '147 Birch Court', 'Rosebank', 'Johannesburg', '2196', 'Central Area', -26.1440, 28.0460, true),
((SELECT id FROM users WHERE email = 'ivy@example.com'), '258 Spruce Way', 'Rosebank', 'Johannesburg', '2196', 'Central Area', -26.1450, 28.0470, true);

-- West Area (Mike's territory)
INSERT INTO addresses (user_id, line1, suburb, city, postal_code, area, lat, lng, is_primary) VALUES
((SELECT id FROM users WHERE email = 'eva@example.com'), '369 Willow Place', 'Melville', 'Johannesburg', '2109', 'West Area', -26.1620, 27.9980, true),
((SELECT id FROM users WHERE email = 'jack@example.com'), '741 Aspen Circle', 'Melville', 'Johannesburg', '2109', 'West Area', -26.1630, 27.9990, true);

-- ============================================================================
-- SAMPLE COLLECTIONS (Some pending, some approved)
-- ============================================================================

-- Get user and collector IDs for collections
DO $$
DECLARE
    alice_id UUID;
    bob_id UUID;
    carol_id UUID;
    john_id UUID;
    sarah_id UUID;
    mike_id UUID;
BEGIN
    -- Get user IDs
    SELECT id INTO alice_id FROM users WHERE email = 'alice@example.com';
    SELECT id INTO bob_id FROM users WHERE email = 'bob@example.com';
    SELECT id INTO carol_id FROM users WHERE email = 'carol@example.com';
    
    -- Get collector IDs
    SELECT id INTO john_id FROM users WHERE email = 'john@wozamali.com';
    SELECT id INTO sarah_id FROM users WHERE email = 'sarah@wozamali.com';
    SELECT id INTO mike_id FROM users WHERE email = 'mike@wozamali.com';
    
    -- Insert sample collections
    INSERT INTO collections (user_id, collector_id, address_id, material_type, kgs, total_value, status, notes, created_at) VALUES
    (alice_id, john_id, (SELECT id FROM addresses WHERE user_id = alice_id), 'Paper', 5.5, 13.75, 'approved', 'Good quality paper', NOW() - INTERVAL '2 days'),
    (bob_id, john_id, (SELECT id FROM addresses WHERE user_id = bob_id), 'Plastic', 3.2, 9.60, 'pending', 'Mixed plastics', NOW() - INTERVAL '1 day'),
    (carol_id, sarah_id, (SELECT id FROM addresses WHERE user_id = carol_id), 'Glass', 8.0, 12.00, 'approved', 'Clear glass bottles', NOW() - INTERVAL '3 days'),
    (alice_id, john_id, (SELECT id FROM addresses WHERE user_id = alice_id), 'Metal', 2.1, 8.40, 'pending', 'Aluminum cans', NOW() - INTERVAL '12 hours');
END $$;

-- ============================================================================
-- SAMPLE TRANSACTIONS (for approved collections)
-- ===========================================================================-
DO $$
DECLARE
    alice_wallet_id UUID;
    carol_wallet_id UUID;
BEGIN
    -- Get wallet IDs
    SELECT id INTO alice_wallet_id FROM wallets WHERE user_id = (SELECT id FROM users WHERE email = 'alice@example.com');
    SELECT id INTO carol_wallet_id FROM wallets WHERE user_id = (SELECT id FROM users WHERE email = 'carol@example.com');
    
    -- Insert transactions for approved collections
    INSERT INTO transactions (wallet_id, amount, type, reference, description, created_at) VALUES
    (alice_wallet_id, 13.75, 'credit', (SELECT id FROM collections WHERE user_id = (SELECT id FROM users WHERE email = 'alice@example.com') AND material_type = 'Paper'), 'Paper collection approved', NOW() - INTERVAL '2 days'),
    (carol_wallet_id, 12.00, 'credit', (SELECT id FROM collections WHERE user_id = (SELECT id FROM users WHERE email = 'carol@example.com') AND material_type = 'Glass'), 'Glass collection approved', NOW() - INTERVAL '3 days');
    
    -- Update wallet balances
    UPDATE wallets SET balance = balance + 13.75, total_earned = total_earned + 13.75 WHERE id = alice_wallet_id;
    UPDATE wallets SET balance = balance + 12.00, total_earned = total_earned + 12.00 WHERE id = carol_wallet_id;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check total counts
SELECT 'Users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Addresses', COUNT(*) FROM addresses
UNION ALL
SELECT 'Wallets', COUNT(*) FROM wallets
UNION ALL
SELECT 'Collections', COUNT(*) FROM collections
UNION ALL
SELECT 'Transactions', COUNT(*) FROM transactions
UNION ALL
SELECT 'Materials', COUNT(*) FROM materials;

-- Check users by role
SELECT role, COUNT(*) as count FROM users GROUP BY role ORDER BY role;

-- Check addresses by area
SELECT area, COUNT(*) as count FROM addresses GROUP BY area ORDER BY area;

-- Check collection statuses
SELECT status, COUNT(*) as count FROM collections GROUP BY status ORDER BY status;

-- Check wallet balances
SELECT 
    u.name,
    u.email,
    w.balance,
    w.total_earned
FROM wallets w
JOIN users u ON w.user_id = u.id
ORDER BY w.balance DESC;

-- ============================================================================
-- TEST LOGIN CREDENTIALS
-- ============================================================================
/*
All test users have the same password hash for simplicity in development.
Password: 'password123'

Test Accounts:
- Admin: admin@wozamali.com / password123
- Manager: manager@wozamali.com / password123
- Collectors: john@wozamali.com, sarah@wozamali.com, mike@wozamali.com, lisa@wozamali.com / password123
- Customers: alice@example.com, bob@example.com, carol@example.com, david@example.com, eva@example.com, frank@example.com, grace@example.com, henry@example.com, ivy@example.com, jack@example.com / password123

Areas:
- North Area: John Collector (Alice, Bob, Frank, Grace)
- Central Area: Sarah Collector (Carol, David, Henry, Ivy)
- West Area: Mike Collector (Eva, Jack)
*/
