-- Fix permissions for Green Scholar Fund tables
-- Grant access to authenticated users and service role

-- Grant permissions on green_scholar_fund_balance
GRANT SELECT, INSERT, UPDATE ON green_scholar_fund_balance TO authenticated;
GRANT SELECT, INSERT, UPDATE ON green_scholar_fund_balance TO service_role;

-- Grant permissions on green_scholar_transactions
GRANT SELECT, INSERT, UPDATE ON green_scholar_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON green_scholar_transactions TO service_role;

-- Grant permissions on schools
GRANT SELECT ON schools TO authenticated;
GRANT SELECT ON schools TO service_role;

-- Grant permissions on child_headed_homes
GRANT SELECT ON child_headed_homes TO authenticated;
GRANT SELECT ON child_headed_homes TO service_role;

-- Grant permissions on user_donations
GRANT SELECT, INSERT, UPDATE ON user_donations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_donations TO service_role;

-- Create RLS policies for green_scholar_fund_balance
ALTER TABLE green_scholar_fund_balance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to fund balance" ON green_scholar_fund_balance
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to update fund balance" ON green_scholar_fund_balance
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create RLS policies for green_scholar_transactions
ALTER TABLE green_scholar_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to transactions" ON green_scholar_transactions
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert transactions" ON green_scholar_transactions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create RLS policies for schools
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to schools" ON schools
    FOR SELECT USING (is_active = true);

-- Create RLS policies for child_headed_homes
ALTER TABLE child_headed_homes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to child homes" ON child_headed_homes
    FOR SELECT USING (is_active = true);

-- Create RLS policies for user_donations
ALTER TABLE user_donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to read their own donations" ON user_donations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own donations" ON user_donations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Verify permissions
SELECT 'Permissions granted successfully' as status;
