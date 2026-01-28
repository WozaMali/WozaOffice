-- ============================================================================
-- FIX WALLET BALANCE DISCREPANCY
-- ============================================================================
-- This script fixes the issue where customer dashboard shows R325 but office shows R0
-- The problem: Customer dashboard shows calculated wallet amounts (30% of pickup value)
-- Office dashboard shows actual stored wallet balances (which are 0)

-- ============================================================================
-- STEP 1: CREATE WALLET RECORDS FOR EXISTING CUSTOMERS
-- ============================================================================

-- Create wallet records for customers who don't have them
INSERT INTO public.wallets (user_id, balance, total_points, tier, created_at, updated_at)
SELECT 
  p.id as user_id,
  0.00 as balance, -- Start with 0 balance
  0 as total_points, -- Start with 0 points
  'Bronze Recycler' as tier,
  NOW() as created_at,
  NOW() as updated_at
FROM public.profiles p
WHERE p.role = 'CUSTOMER'
  AND NOT EXISTS (SELECT 1 FROM public.wallets w WHERE w.user_id = p.id);

-- ============================================================================
-- STEP 2: CREATE FUNCTION TO UPDATE WALLET BALANCES
-- ============================================================================

-- Function to update wallet balance when pickup is approved
CREATE OR REPLACE FUNCTION public.update_wallet_on_pickup_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_wallet_id UUID;
  v_wallet_amount DECIMAL(10,2);
  v_pickup_total DECIMAL(10,2);
BEGIN
  -- Only proceed if pickup status changed to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    
    -- Calculate pickup total from pickup_items
    SELECT COALESCE(SUM(kilograms * m.rate_per_kg), 0)
    INTO v_pickup_total
    FROM public.pickup_items pi
    JOIN public.materials m ON pi.material_id = m.id
    WHERE pi.pickup_id = NEW.id;
    
    -- Calculate wallet amount (30% of pickup total)
    v_wallet_amount := ROUND(v_pickup_total * 0.3, 2);
    
    -- Get or create wallet for the customer
    SELECT w.id INTO v_wallet_id
    FROM public.wallets w
    WHERE w.user_id = NEW.user_id;
    
    -- If wallet doesn't exist, create it
    IF v_wallet_id IS NULL THEN
      INSERT INTO public.wallets (user_id, balance, total_points, tier, created_at, updated_at)
      VALUES (NEW.user_id, v_wallet_amount, 0, 'Bronze Recycler', NOW(), NOW())
      RETURNING id INTO v_wallet_id;
    ELSE
      -- Update existing wallet balance
      UPDATE public.wallets
      SET 
        balance = balance + v_wallet_amount,
        updated_at = NOW()
      WHERE id = v_wallet_id;
    END IF;
    
    -- Log the wallet update
    INSERT INTO public.user_activity_log (
      user_id,
      activity_type,
      description,
      metadata
    ) VALUES (
      NEW.user_id,
      'wallet_credit',
      'Wallet credited from approved pickup',
      jsonb_build_object(
        'pickup_id', NEW.id,
        'amount_credited', v_wallet_amount,
        'pickup_total', v_pickup_total,
        'wallet_id', v_wallet_id
      )
    );
    
    RAISE NOTICE 'Wallet updated for user %: +R% (pickup total: R%)', 
      NEW.user_id, v_wallet_amount, v_pickup_total;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 3: CREATE TRIGGER TO AUTO-UPDATE WALLETS
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_wallet_on_pickup_approval ON public.pickups;

-- Create trigger to automatically update wallet when pickup is approved
CREATE TRIGGER trigger_update_wallet_on_pickup_approval
  AFTER UPDATE ON public.pickups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_wallet_on_pickup_approval();

-- ============================================================================
-- STEP 4: BACKFILL WALLET BALANCES FOR EXISTING APPROVED PICKUPS
-- ============================================================================

-- Function to backfill wallet balances for existing approved pickups
CREATE OR REPLACE FUNCTION public.backfill_wallet_balances()
RETURNS TABLE (
  user_id UUID,
  customer_name TEXT,
  total_approved_value DECIMAL(10,2),
  wallet_amount DECIMAL(10,2),
  wallet_updated BOOLEAN
) AS $$
DECLARE
  v_customer RECORD;
  v_pickup_total DECIMAL(10,2);
  v_wallet_amount DECIMAL(10,2);
  v_wallet_id UUID;
BEGIN
  -- Loop through all customers with approved pickups
  FOR v_customer IN 
    SELECT DISTINCT p.user_id, pr.full_name
    FROM public.pickups p
    JOIN public.profiles pr ON p.user_id = pr.id
    WHERE p.status = 'approved'
      AND p.user_id IS NOT NULL
  LOOP
    -- Calculate total value from approved pickups for this customer
    SELECT COALESCE(SUM(kilograms * m.rate_per_kg), 0)
    INTO v_pickup_total
    FROM public.pickups pk
    JOIN public.pickup_items pi ON pk.id = pi.pickup_id
    JOIN public.materials m ON pi.material_id = m.id
    WHERE pk.user_id = v_customer.user_id
      AND pk.status = 'approved';
    
    -- Calculate wallet amount (30% of total approved value)
    v_wallet_amount := ROUND(v_pickup_total * 0.3, 2);
    
    -- Get or create wallet
    SELECT id INTO v_wallet_id
    FROM public.wallets
    WHERE user_id = v_customer.user_id;
    
    -- If wallet doesn't exist, create it
    IF v_wallet_id IS NULL THEN
      INSERT INTO public.wallets (user_id, balance, total_points, tier, created_at, updated_at)
      VALUES (v_customer.user_id, v_wallet_amount, 0, 'Bronze Recycler', NOW(), NOW())
      RETURNING id INTO v_wallet_id;
    ELSE
      -- Update existing wallet balance
      UPDATE public.wallets
      SET 
        balance = v_wallet_amount, -- Set to calculated amount, not add
        updated_at = NOW()
      WHERE id = v_wallet_id;
    END IF;
    
    -- Log the backfill
    INSERT INTO public.user_activity_log (
      user_id,
      activity_type,
      description,
      metadata
    ) VALUES (
      v_customer.user_id,
      'wallet_backfill',
      'Wallet balance backfilled from existing approved pickups',
      jsonb_build_object(
        'total_approved_value', v_pickup_total,
        'wallet_amount', v_wallet_amount,
        'wallet_id', v_wallet_id
      )
    );
    
    -- Return result
    user_id := v_customer.user_id;
    customer_name := v_customer.full_name;
    total_approved_value := v_pickup_total;
    wallet_amount := v_wallet_amount;
    wallet_updated := TRUE;
    
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 5: EXECUTE BACKFILL
-- ============================================================================

-- Run the backfill function to update existing wallets
SELECT * FROM public.backfill_wallet_balances();

-- ============================================================================
-- STEP 6: VERIFICATION QUERIES
-- ============================================================================

-- Check wallet balances after fix
SELECT 'WALLET BALANCES AFTER FIX' as check_type,
       COUNT(*) as total_wallets,
       COUNT(CASE WHEN balance > 0 THEN 1 END) as wallets_with_balance,
       SUM(balance) as total_balance,
       AVG(balance) as average_balance
FROM public.wallets;

-- Compare calculated vs actual wallet balances
SELECT 'WALLET BALANCE COMPARISON' as check_type,
       p.full_name,
       -- What customer dashboard shows (calculated)
       ROUND(SUM(COALESCE(pi.total_value, 0)) * 0.3, 2) as calculated_wallet_balance,
       -- What office dashboard shows (actual stored)
       COALESCE(w.balance, 0) as actual_wallet_balance,
       -- Difference
       ABS(ROUND(SUM(COALESCE(pi.total_value, 0)) * 0.3, 2) - COALESCE(w.balance, 0)) as difference
FROM public.profiles p
LEFT JOIN public.pickups pk ON p.id = pk.user_id
LEFT JOIN (
  SELECT 
    pickup_id,
    SUM(kilograms * m.rate_per_kg) as total_value
  FROM public.pickup_items pi
  JOIN public.materials m ON pi.material_id = m.id
  GROUP BY pickup_id
) pi ON pk.id = pi.pickup_id
LEFT JOIN public.wallets w ON p.id = w.user_id
WHERE p.role = 'CUSTOMER'
GROUP BY p.id, p.full_name, w.balance
ORDER BY calculated_wallet_balance DESC;
