-- Fix RLS policies for Green Scholar Fund tables
-- Allow service role to insert PET contributions while maintaining security

-- First, grant necessary permissions to service_role
GRANT SELECT, INSERT, UPDATE ON green_scholar_transactions TO service_role;
GRANT SELECT, INSERT, UPDATE ON green_scholar_fund_balance TO service_role;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Only admins can access green scholar transactions" ON green_scholar_transactions;
DROP POLICY IF EXISTS "Only admins can access fund balance" ON green_scholar_fund_balance;

-- Create new policies that allow service role access
CREATE POLICY "Allow service role full access to green_scholar_transactions" ON green_scholar_transactions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow authenticated users to read green_scholar_transactions" ON green_scholar_transactions
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow service role full access to green_scholar_fund_balance" ON green_scholar_fund_balance
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow authenticated users to read green_scholar_fund_balance" ON green_scholar_fund_balance
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Also ensure the service role can access collection_materials for PET detection
GRANT SELECT ON collection_materials TO service_role;
GRANT SELECT ON materials TO service_role;
GRANT SELECT ON unified_collections TO service_role;

-- Verify the policies are working
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual 
FROM pg_policies 
WHERE tablename IN ('green_scholar_transactions', 'green_scholar_fund_balance')
ORDER BY tablename, policyname;
