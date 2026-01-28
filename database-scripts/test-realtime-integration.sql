-- ============================================================================
-- SIMPLE REAL-TIME SETUP FOR SUPABASE
-- ============================================================================
-- These are simple queries that work in any Supabase instance

-- ============================================================================
-- STEP 1: Enable Real-Time on Pickups Table
-- ============================================================================
-- Enable real-time subscriptions on the pickups table
ALTER PUBLICATION supabase_realtime ADD TABLE pickups;

-- ============================================================================
-- STEP 2: Check What Tables Exist
-- ============================================================================
-- Simple check to see what tables you have
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('pickups', 'pickup_items', 'profiles')
ORDER BY table_name;

-- ============================================================================
-- STEP 3: Check RLS Policies
-- ============================================================================
-- Verify RLS policies on pickups table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'pickups';

-- ============================================================================
-- STEP 4: Test Basic Access
-- ============================================================================
-- Simple test to see if you can query pickups
SELECT COUNT(*) as total_pickups FROM pickups;

-- ============================================================================
-- STEP 5: Check Publication Status
-- ============================================================================
-- Verify which tables are in the real-time publication
SELECT 
  pubname,
  tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- ============================================================================
-- STEP 6: Create Missing RLS Policy (if needed)
-- ============================================================================
-- Uncomment and run this if customers can't read their own pickups
/*
CREATE POLICY "Customers can view own pickups" ON pickups
FOR SELECT USING (
  customer_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);
*/

-- ============================================================================
-- STEP 7: Test Customer Access (replace UUID)
-- ============================================================================
-- Test if a customer can see their pickups (replace with actual customer UUID)
-- Uncomment and modify this line:
/*
SELECT 
  p.id,
  p.status,
  p.total_kg,
  p.total_value,
  p.created_at
FROM pickups p
WHERE p.customer_id = 'YOUR_CUSTOMER_UUID_HERE'
LIMIT 5;
*/

-- ============================================================================
-- STEP 8: Check Current Pickups
-- ============================================================================
-- See what pickups currently exist
SELECT 
  p.id,
  p.status,
  p.total_kg,
  p.total_value,
  p.created_at,
  c.full_name as customer_name
FROM pickups p
LEFT JOIN profiles c ON p.customer_id = c.id
ORDER BY p.created_at DESC
LIMIT 5;
