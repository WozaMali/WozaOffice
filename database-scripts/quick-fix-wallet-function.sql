-- ============================================================================
-- QUICK FIX: DROP AND RECREATE WALLET FUNCTION
-- ============================================================================
-- This is a simplified version that just fixes the function

-- Drop existing function
DROP FUNCTION IF EXISTS public.update_wallet_simple(uuid,numeric,text,numeric,text,uuid);

-- Create new function with correct return type
CREATE OR REPLACE FUNCTION public.update_wallet_simple(
  p_user_id UUID,
  p_amount DECIMAL(10,2),
  p_transaction_type TEXT,
  p_weight_kg DECIMAL(8,3) DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_wallet_id UUID;
  v_points_earned INTEGER;
  v_current_points INTEGER;
  v_transaction_id UUID;
  v_result JSONB;
BEGIN
  -- Calculate points (1 point per kg)
  v_points_earned := COALESCE(FLOOR(p_weight_kg), 0);
  
  -- Get or create wallet
  SELECT id INTO v_wallet_id 
  FROM public.user_wallets 
  WHERE user_id = p_user_id;
  
  IF v_wallet_id IS NULL THEN
    -- Create new wallet
    INSERT INTO public.user_wallets (user_id, current_points, total_points_earned, total_points_spent)
    VALUES (p_user_id, 0, 0, 0)
    RETURNING id INTO v_wallet_id;
  END IF;
  
  -- Get current points
  SELECT current_points INTO v_current_points
  FROM public.user_wallets 
  WHERE id = v_wallet_id;
  
  -- Update wallet with new points
  UPDATE public.user_wallets 
  SET 
    current_points = current_points + v_points_earned,
    total_points_earned = total_points_earned + v_points_earned,
    last_updated = NOW()
  WHERE id = v_wallet_id;
  
  -- Create points transaction record
  INSERT INTO public.points_transactions (
    wallet_id,
    transaction_type,
    points,
    balance_after,
    source,
    reference_id,
    description
  ) VALUES (
    v_wallet_id,
    p_transaction_type,
    v_points_earned,
    v_current_points + v_points_earned,
    'collection_approval',
    p_reference_id,
    COALESCE(p_description, 'Collection approved - ' || v_points_earned || ' points earned')
  ) RETURNING id INTO v_transaction_id;
  
  -- Return success result
  v_result := jsonb_build_object(
    'success', true,
    'wallet_id', v_wallet_id,
    'transaction_id', v_transaction_id,
    'points_earned', v_points_earned,
    'cash_amount', p_amount,
    'new_balance', v_current_points + v_points_earned,
    'message', 'Wallet updated successfully'
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return error result
    v_result := jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to update wallet'
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.update_wallet_simple TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_wallet_simple TO service_role;

SELECT 'SUCCESS: Function updated successfully!' as result;
