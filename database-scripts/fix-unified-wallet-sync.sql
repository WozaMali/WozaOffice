-- ============================================================================
-- COMPLETE UNIFIED WALLET SYNC FIX
-- ============================================================================
-- This script fixes all remaining issues to complete the unified wallet sync

-- 1. Ensure collections table has the correct structure
-- ============================================================================

-- Add material_type column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'collections' 
        AND column_name = 'material_type'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.collections ADD COLUMN material_type VARCHAR(100);
    END IF;
END $$;

-- Add weight_kg column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'collections' 
        AND column_name = 'weight_kg'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.collections ADD COLUMN weight_kg DECIMAL(10,2) DEFAULT 0;
    END IF;
END $$;

-- Add total_value column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'collections' 
        AND column_name = 'total_value'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.collections ADD COLUMN total_value DECIMAL(10,2) DEFAULT 0;
    END IF;
END $$;

-- 2. Fix RLS permissions for wallet tables
-- ============================================================================

-- Grant necessary permissions
GRANT ALL ON public.wallets TO authenticated;
GRANT ALL ON public.user_wallets TO authenticated;
GRANT ALL ON public.collections TO authenticated;
GRANT ALL ON public.materials TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 3. Create a test collection to verify the setup
-- ============================================================================

-- Insert a test collection if none exist
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
    '660e8400-e29b-41d4-a716-446655440001', -- Aluminum Cans material ID
    2.5,
    'approved',
    'Test collection for unified wallet sync'
) ON CONFLICT DO NOTHING;

-- 4. Create a test wallet entry
-- ============================================================================

-- Insert a test wallet if none exist
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

-- 5. Verify the setup
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
