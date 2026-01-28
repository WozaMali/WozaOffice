-- ============================================================================
-- FINAL UNIFIED WALLET SYNC FIX
-- ============================================================================
-- This script fixes all remaining RLS and permission issues

-- 1. Create test user profiles if they don't exist
-- ============================================================================

-- Insert test users
INSERT INTO public.user_profiles (
    id,
    email,
    first_name,
    last_name,
    full_name,
    phone,
    role,
    is_active
) VALUES 
    ('00000000-0000-0000-0000-000000000000', 'test.user@wozamali.com', 'Test', 'User', 'Test User', '+27123456789', 'resident', true),
    ('00000000-0000-0000-0000-000000000001', 'test.collector@wozamali.com', 'Test', 'Collector', 'Test Collector', '+27123456790', 'collector', true),
    ('00000000-0000-0000-0000-000000000002', 'test.admin@wozamali.com', 'Test', 'Admin', 'Test Admin', '+27123456791', 'admin', true)
ON CONFLICT (id) DO NOTHING;

-- Insert test area
INSERT INTO public.areas (
    id,
    name,
    description,
    is_active
) VALUES 
    ('00000000-0000-0000-0000-000000000003', 'Test Area', 'Test area for unified wallet sync', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Fix RLS policies for wallet tables
-- ============================================================================

-- Drop existing RLS policies if they exist
DROP POLICY IF EXISTS "Users can view own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Users can update own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Users can insert own wallet" ON public.wallets;

-- Create new RLS policies for wallets
CREATE POLICY "Users can view own wallet" ON public.wallets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own wallet" ON public.wallets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallet" ON public.wallets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Drop existing RLS policies for user_wallets if they exist
DROP POLICY IF EXISTS "Users can view own user_wallets" ON public.user_wallets;
DROP POLICY IF EXISTS "Users can update own user_wallets" ON public.user_wallets;
DROP POLICY IF EXISTS "Users can insert own user_wallets" ON public.user_wallets;

-- Create new RLS policies for user_wallets
CREATE POLICY "Users can view own user_wallets" ON public.user_wallets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own user_wallets" ON public.user_wallets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own user_wallets" ON public.user_wallets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Fix RLS policies for collections table
-- ============================================================================

-- Drop existing RLS policies if they exist
DROP POLICY IF EXISTS "Users can view collections" ON public.collections;
DROP POLICY IF EXISTS "Users can insert collections" ON public.collections;
DROP POLICY IF EXISTS "Users can update collections" ON public.collections;

-- Create new RLS policies for collections
CREATE POLICY "Users can view collections" ON public.collections
    FOR SELECT USING (
        auth.uid() = resident_id OR 
        auth.uid() = collector_id OR
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'collector')
        )
    );

CREATE POLICY "Users can insert collections" ON public.collections
    FOR INSERT WITH CHECK (
        auth.uid() = resident_id OR
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'collector')
        )
    );

CREATE POLICY "Users can update collections" ON public.collections
    FOR UPDATE USING (
        auth.uid() = resident_id OR 
        auth.uid() = collector_id OR
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'collector')
        )
    );

-- 4. Grant necessary permissions
-- ============================================================================

-- Grant permissions to authenticated users
GRANT ALL ON public.wallets TO authenticated;
GRANT ALL ON public.user_wallets TO authenticated;
GRANT ALL ON public.collections TO authenticated;
GRANT ALL ON public.materials TO authenticated;
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.areas TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 5. Create test data
-- ============================================================================

-- Insert a test collection
INSERT INTO public.collections (
    resident_id,
    collector_id,
    area_id,
    material_id,
    weight_kg,
    status,
    notes
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000003',
    '660e8400-e29b-41d4-a716-446655440001',
    2.5,
    'approved',
    'Test collection for unified wallet sync'
) ON CONFLICT DO NOTHING;

-- Insert a test wallet
INSERT INTO public.wallets (
    user_id,
    balance,
    total_points,
    tier
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    38.75,
    2,
    'bronze'
) ON CONFLICT (user_id) DO NOTHING;

-- 6. Verify the setup
-- ============================================================================

-- Test the RPC function
SELECT public.update_wallet_simple('00000000-0000-0000-0000-000000000000', 10.00, 5);

-- Test the wallet balance function
SELECT public.get_user_wallet_balance('00000000-0000-0000-0000-000000000000');

-- Check collections
SELECT COUNT(*) as collection_count FROM public.collections;

-- Check materials
SELECT COUNT(*) as material_count FROM public.materials;

-- Check wallets
SELECT COUNT(*) as wallet_count FROM public.wallets;

-- Check user profiles
SELECT COUNT(*) as user_count FROM public.user_profiles;
