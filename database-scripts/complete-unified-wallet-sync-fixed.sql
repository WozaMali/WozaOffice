-- ============================================================================
-- COMPLETE UNIFIED WALLET SYNC SETUP (CORRECTED)
-- ============================================================================
-- This script creates the missing wallet tables and RPC function
-- to complete the unified wallet sync across all apps

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. CREATE WALLET TABLES
-- ============================================================================

-- Create wallets table (Main App schema)
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_points INTEGER NOT NULL DEFAULT 0,
    tier VARCHAR(50) DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_wallets table (Office App schema)
CREATE TABLE IF NOT EXISTS public.user_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    points INTEGER NOT NULL DEFAULT 0,
    total_points_earned INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON public.user_wallets(user_id);

-- ============================================================================
-- 3. CREATE RPC FUNCTION FOR WALLET UPDATES
-- ============================================================================

-- Create or replace the update_wallet_simple function
CREATE OR REPLACE FUNCTION public.update_wallet_simple(
    p_user_id UUID,
    p_amount DECIMAL(10,2),
    p_points INTEGER
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wallet_id UUID;
    v_new_balance DECIMAL(10,2);
    v_new_points INTEGER;
    v_result JSON;
BEGIN
    -- Validate inputs
    IF p_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'User ID is required');
    END IF;
    
    IF p_amount IS NULL THEN
        p_amount := 0;
    END IF;
    
    IF p_points IS NULL THEN
        p_points := 0;
    END IF;

    -- Try to get existing wallet from wallets table first
    SELECT id INTO v_wallet_id
    FROM public.wallets
    WHERE user_id = p_user_id;

    IF FOUND THEN
        -- Update existing wallet
        UPDATE public.wallets
        SET 
            balance = balance + p_amount,
            total_points = total_points + p_points,
            updated_at = NOW()
        WHERE user_id = p_user_id
        RETURNING balance, total_points INTO v_new_balance, v_new_points;
        
        v_result := json_build_object(
            'success', true,
            'wallet_id', v_wallet_id,
            'new_balance', v_new_balance,
            'new_points', v_new_points,
            'table', 'wallets'
        );
    ELSE
        -- Try to get existing wallet from user_wallets table
        SELECT id INTO v_wallet_id
        FROM public.user_wallets
        WHERE user_id = p_user_id;

        IF FOUND THEN
            -- Update existing user_wallet
            UPDATE public.user_wallets
            SET 
                balance = balance + p_amount,
                points = points + p_points,
                total_points_earned = total_points_earned + p_points,
                updated_at = NOW()
            WHERE user_id = p_user_id
            RETURNING balance, points INTO v_new_balance, v_new_points;
            
            v_result := json_build_object(
                'success', true,
                'wallet_id', v_wallet_id,
                'new_balance', v_new_balance,
                'new_points', v_new_points,
                'table', 'user_wallets'
            );
        ELSE
            -- Create new wallet in wallets table
            INSERT INTO public.wallets (user_id, balance, total_points)
            VALUES (p_user_id, p_amount, p_points)
            RETURNING id, balance, total_points INTO v_wallet_id, v_new_balance, v_new_points;
            
            v_result := json_build_object(
                'success', true,
                'wallet_id', v_wallet_id,
                'new_balance', v_new_balance,
                'new_points', v_new_points,
                'table', 'wallets',
                'created', true
            );
        END IF;
    END IF;

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'sqlstate', SQLSTATE
        );
END;
$$;

-- ============================================================================
-- 4. CREATE RLS POLICIES
-- ============================================================================

-- Enable RLS on wallet tables
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

-- Create policies for wallets table
CREATE POLICY "Users can view their own wallet" ON public.wallets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet" ON public.wallets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all wallets" ON public.wallets
    FOR ALL USING (auth.role() = 'service_role');

-- Create policies for user_wallets table
CREATE POLICY "Users can view their own user_wallet" ON public.user_wallets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own user_wallet" ON public.user_wallets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all user_wallets" ON public.user_wallets
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- 5. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to get wallet balance for a user
CREATE OR REPLACE FUNCTION public.get_user_wallet_balance(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wallet_data RECORD;
    v_result JSON;
BEGIN
    -- Try wallets table first
    SELECT balance, total_points, tier INTO v_wallet_data
    FROM public.wallets
    WHERE user_id = p_user_id;

    IF FOUND THEN
        v_result := json_build_object(
            'success', true,
            'balance', v_wallet_data.balance,
            'points', v_wallet_data.total_points,
            'tier', v_wallet_data.tier,
            'table', 'wallets'
        );
    ELSE
        -- Try user_wallets table
        SELECT balance, points INTO v_wallet_data
        FROM public.user_wallets
        WHERE user_id = p_user_id;

        IF FOUND THEN
            v_result := json_build_object(
                'success', true,
                'balance', v_wallet_data.balance,
                'points', v_wallet_data.points,
                'tier', 'bronze', -- Default tier
                'table', 'user_wallets'
            );
        ELSE
            v_result := json_build_object(
                'success', false,
                'error', 'No wallet found for user',
                'balance', 0,
                'points', 0,
                'tier', 'bronze'
            );
        END IF;
    END IF;

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'balance', 0,
            'points', 0,
            'tier', 'bronze'
        );
END;
$$;

-- ============================================================================
-- 6. INSERT SAMPLE MATERIALS (USING CORRECT COLUMN NAME)
-- ============================================================================

-- Insert some sample materials if they don't exist (using unit_price column)
INSERT INTO public.materials (name, unit_price, description, is_active) VALUES
    ('Aluminum Cans', 15.50, 'Clean aluminum beverage cans', true),
    ('Plastic Bottles', 8.75, 'PET plastic bottles', true),
    ('Cardboard', 3.25, 'Clean cardboard boxes', true),
    ('Glass Bottles', 2.50, 'Clear glass bottles', true),
    ('Mixed Materials', 5.00, 'Mixed recyclable materials', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 7. VERIFICATION QUERIES
-- ============================================================================

-- Test the RPC function
-- SELECT public.update_wallet_simple('00000000-0000-0000-0000-000000000000', 10.00, 5);

-- Test the wallet balance function
-- SELECT public.get_user_wallet_balance('00000000-0000-0000-0000-000000000000');

-- Check if tables exist
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('wallets', 'user_wallets');

-- Check if functions exist
-- SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name IN ('update_wallet_simple', 'get_user_wallet_balance');
