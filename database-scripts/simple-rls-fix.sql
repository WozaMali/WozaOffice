-- Simple fix: Allow service role to bypass RLS for Green Scholar operations
-- This is the quickest way to fix the permission issue

-- Grant service role the ability to bypass RLS
ALTER TABLE green_scholar_transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE green_scholar_fund_balance FORCE ROW LEVEL SECURITY;

-- Create policies that allow service role full access
CREATE POLICY "Service role bypass for green_scholar_transactions" ON green_scholar_transactions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role bypass for green_scholar_fund_balance" ON green_scholar_fund_balance
    FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to read
CREATE POLICY "Authenticated users can read transactions" ON green_scholar_transactions
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read balance" ON green_scholar_fund_balance
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Ensure service role has all necessary permissions
GRANT ALL ON green_scholar_transactions TO service_role;
GRANT ALL ON green_scholar_fund_balance TO service_role;
GRANT SELECT ON collection_materials TO service_role;
GRANT SELECT ON materials TO service_role;
GRANT SELECT ON unified_collections TO service_role;
