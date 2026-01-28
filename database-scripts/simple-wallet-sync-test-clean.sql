-- Simple Wallet Sync Test - Clean Version
-- This script creates minimal test data to verify wallet sync functionality

-- 1. Create test roles if they don't exist
INSERT INTO public.roles (
    id,
    name,
    description
) VALUES 
    ('660e8400-e29b-41d4-a716-446655440010', 'resident', 'Regular user/resident'),
    ('660e8400-e29b-41d4-a716-446655440011', 'collector', 'Collection staff'),
    ('660e8400-e29b-41d4-a716-446655440012', 'admin', 'Administrator')
ON CONFLICT (id) DO NOTHING;

-- 2. Create test area if it doesn't exist
INSERT INTO public.areas (
    id,
    name,
    description,
    is_active
) VALUES 
    ('00000000-0000-0000-0000-000000000003', 'Test Area', 'Test area for unified wallet sync', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Create test materials if they don't exist
INSERT INTO public.materials (
    id,
    name,
    description,
    unit_price,
    is_active
) VALUES 
    ('660e8400-e29b-41d4-a716-446655440001', 'Aluminum Cans', 'Recyclable aluminum cans', 15.50, true),
    ('660e8400-e29b-41d4-a716-446655440002', 'Plastic Bottles', 'Recyclable plastic bottles', 8.75, true),
    ('660e8400-e29b-41d4-a716-446655440003', 'Cardboard', 'Recyclable cardboard', 3.25, true),
    ('660e8400-e29b-41d4-a716-446655440004', 'Glass Bottles', 'Recyclable glass bottles', 2.50, true)
ON CONFLICT (id) DO NOTHING;

-- 4. Grant necessary permissions
GRANT ALL ON public.wallets TO authenticated;
GRANT ALL ON public.user_wallets TO authenticated;
GRANT ALL ON public.collections TO authenticated;
GRANT ALL ON public.materials TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.roles TO authenticated;
GRANT ALL ON public.areas TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 5. Test the RPC functions
SELECT public.get_user_wallet_balance('00000000-0000-0000-0000-000000000000') as test_balance;

-- 6. Check what we have
SELECT COUNT(*) as material_count FROM public.materials;
SELECT COUNT(*) as role_count FROM public.roles;
SELECT COUNT(*) as area_count FROM public.areas;
SELECT COUNT(*) as wallet_count FROM public.wallets;
SELECT COUNT(*) as collection_count FROM public.collections;
