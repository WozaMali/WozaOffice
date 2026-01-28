-- ============================================================================
-- SETUP FRONTEND DATABASE UNIFICATION
-- ============================================================================
-- This script prepares the database for unified frontend access
-- Ensures RLS policies are in place and data is accessible

-- ============================================================================
-- STEP 1: ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on pickups table
ALTER TABLE public.pickups ENABLE ROW LEVEL SECURITY;

-- Enable RLS on pickup_items table
ALTER TABLE public.pickup_items ENABLE ROW LEVEL SECURITY;

-- Enable RLS on wallets table
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Enable RLS on materials table
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- Enable RLS on addresses table
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: CREATE RLS POLICIES FOR PROFILES TABLE
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('ADMIN', 'admin')
    )
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ============================================================================
-- STEP 3: CREATE RLS POLICIES FOR PICKUPS TABLE
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Customers can view own pickups" ON public.pickups;
DROP POLICY IF EXISTS "Collectors can view assigned pickups" ON public.pickups;
DROP POLICY IF EXISTS "Admins can view all pickups" ON public.pickups;
DROP POLICY IF EXISTS "Admins can update all pickups" ON public.pickups;

-- Customers can view their own pickups
CREATE POLICY "Customers can view own pickups" ON public.pickups
  FOR SELECT USING (auth.uid() = user_id);

-- Collectors can view assigned pickups
CREATE POLICY "Collectors can view assigned pickups" ON public.pickups
  FOR SELECT USING (auth.uid() = collector_id);

-- Admins can view all pickups
CREATE POLICY "Admins can view all pickups" ON public.pickups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('ADMIN', 'admin')
    )
  );

-- Admins can update all pickups
CREATE POLICY "Admins can update all pickups" ON public.pickups
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('ADMIN', 'admin')
    )
  );

-- ============================================================================
-- STEP 4: CREATE RLS POLICIES FOR PICKUP_ITEMS TABLE
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view pickup items" ON public.pickup_items;
DROP POLICY IF EXISTS "Admins can view all pickup items" ON public.pickup_items;
DROP POLICY IF EXISTS "Admins can update pickup items" ON public.pickup_items;

-- Users can view pickup items for their own pickups
CREATE POLICY "Users can view pickup items" ON public.pickup_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pickups p
      JOIN public.profiles pr ON p.user_id = pr.id
      WHERE p.id = pickup_id AND pr.id = auth.uid()
    )
  );

-- Admins can view all pickup items
CREATE POLICY "Admins can view all pickup items" ON public.pickup_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('ADMIN', 'admin')
    )
  );

-- Admins can update pickup items
CREATE POLICY "Admins can update pickup items" ON public.pickup_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('ADMIN', 'admin')
    )
  );

-- ============================================================================
-- STEP 5: CREATE RLS POLICIES FOR WALLETS TABLE
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Admins can view all wallets" ON public.wallets;
DROP POLICY IF EXISTS "Admins can update wallets" ON public.wallets;

-- Users can only see their own wallet
CREATE POLICY "Users can view own wallet" ON public.wallets
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can see all wallets
CREATE POLICY "Admins can view all wallets" ON public.wallets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('ADMIN', 'admin')
    )
  );

-- Admins can update wallets
CREATE POLICY "Admins can update wallets" ON public.wallets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('ADMIN', 'admin')
    )
  );

-- ============================================================================
-- STEP 6: CREATE RLS POLICIES FOR MATERIALS TABLE
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Everyone can view materials" ON public.materials;
DROP POLICY IF EXISTS "Admins can update materials" ON public.materials;

-- Everyone can view materials (read-only for customers)
CREATE POLICY "Everyone can view materials" ON public.materials
  FOR SELECT USING (true);

-- Admins can update materials
CREATE POLICY "Admins can update materials" ON public.materials
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('ADMIN', 'admin')
    )
  );

-- ============================================================================
-- STEP 7: CREATE RLS POLICIES FOR ADDRESSES TABLE
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Admins can view all addresses" ON public.addresses;

-- Users can view their own addresses
CREATE POLICY "Users can view own addresses" ON public.addresses
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all addresses
CREATE POLICY "Admins can view all addresses" ON public.addresses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('ADMIN', 'admin')
    )
  );

-- ============================================================================
-- STEP 8: VERIFICATION QUERIES
-- ============================================================================

-- Check RLS status on all tables
SELECT 'RLS STATUS CHECK' as check_type,
       schemaname,
       tablename,
       rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'pickups', 'pickup_items', 'wallets', 'materials', 'addresses')
ORDER BY tablename;

-- Check RLS policies
SELECT 'RLS POLICIES CHECK' as check_type,
       schemaname,
       tablename,
       policyname,
       permissive,
       roles,
       cmd,
       qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'pickups', 'pickup_items', 'wallets', 'materials', 'addresses')
ORDER BY tablename, policyname;

-- ============================================================================
-- STEP 9: TEST DATA ACCESS (ADMIN PERSPECTIVE)
-- ============================================================================

-- Test admin access to all tables
SELECT 'ADMIN ACCESS TEST' as test_type,
       'profiles' as table_name,
       COUNT(*) as record_count
FROM public.profiles
UNION ALL
SELECT 'ADMIN ACCESS TEST', 'pickups', COUNT(*)
FROM public.pickups
UNION ALL
SELECT 'ADMIN ACCESS TEST', 'pickup_items', COUNT(*)
FROM public.pickup_items
UNION ALL
SELECT 'ADMIN ACCESS TEST', 'wallets', COUNT(*)
FROM public.wallets
UNION ALL
SELECT 'ADMIN ACCESS TEST', 'materials', COUNT(*)
FROM public.materials
UNION ALL
SELECT 'ADMIN ACCESS TEST', 'addresses', COUNT(*)
FROM public.addresses;

-- ============================================================================
-- STEP 10: FINAL CONFIRMATION
-- ============================================================================

SELECT 'FRONTEND UNIFICATION READY' as status,
       'Database is now configured for unified frontend access' as message,
       NOW() as setup_timestamp;

-- Show summary of what was configured
SELECT 'SETUP SUMMARY' as summary_type,
       'Tables with RLS enabled' as metric,
       COUNT(*) as count
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true
  AND tablename IN ('profiles', 'pickups', 'pickup_items', 'wallets', 'materials', 'addresses')
UNION ALL
SELECT 'SETUP SUMMARY', 'RLS policies created', COUNT(*)
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'pickups', 'pickup_items', 'wallets', 'materials', 'addresses');
