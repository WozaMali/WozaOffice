-- ============================================================================
-- WOZA MALI RECYCLING MANAGEMENT SYSTEM
-- ENHANCED FUNCTIONS UPDATE
-- ============================================================================
-- This file adds enhanced functions to your existing database schema
-- Run this file in your Supabase SQL editor to add the new functions
-- 
-- Prerequisites: Your base schema must already be installed
-- Run this AFTER running the main 00-install-all.sql file
-- 
-- IMPORTANT: For best results, also run 10-materials-impact-wallet-update.sql
-- to get full environmental impact and points calculations

-- ============================================================================
-- ENHANCED FUNCTIONS FOR PICKUP MANAGEMENT
-- ============================================================================
-- Additional functions for improved pickup workflow and calculations

-- Helper: compute totals for a pickup from its items and materials
-- This version works with basic materials table (no impact columns yet)
CREATE OR REPLACE FUNCTION public.compute_pickup_totals(p_pickup_id uuid)
RETURNS TABLE (
  total_kg numeric,
  total_value_zar numeric,
  total_points numeric,
  total_co2_kg numeric,
  total_water_l numeric,
  total_landfill_l numeric
) AS $$
  SELECT
    COALESCE(SUM(pi.kilograms), 0)                                        AS total_kg,
    COALESCE(SUM(pi.kilograms * m.rate_per_kg), 0)                        AS total_value_zar,
    COALESCE(SUM(pi.kilograms * m.rate_per_kg * 1), 0)                   AS total_points,
    COALESCE(SUM(pi.kilograms * 0), 0)                                   AS total_co2_kg,
    COALESCE(SUM(pi.kilograms * 0), 0)                                   AS total_water_l,
    COALESCE(SUM(pi.kilograms * 0), 0)                                   AS total_landfill_l
  FROM pickup_items pi
  JOIN materials m ON m.id = pi.material_id
  WHERE pi.pickup_id = p_pickup_id;
$$ LANGUAGE sql STABLE;

-- Collector: finalize (locks) a pickup after photos/items are in
CREATE OR REPLACE FUNCTION public.finalize_pickup(p_pickup_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_collector uuid;
  v_photo_count int;
BEGIN
  SELECT collector_id INTO v_collector FROM pickups WHERE id = p_pickup_id;
  IF v_collector IS NULL OR v_collector <> auth.uid() THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  SELECT COUNT(*) INTO v_photo_count FROM pickup_photos WHERE pickup_id = p_pickup_id;
  IF v_photo_count < 2 THEN
    RAISE EXCEPTION 'At least 2 photos required';
  END IF;

  UPDATE pickups
    SET submitted_at = COALESCE(submitted_at, now()),
        status = 'submitted'
  WHERE id = p_pickup_id;

  RETURN p_pickup_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_pickup(uuid) TO authenticated;

-- Admin: approve and write payments + wallet + impact
CREATE OR REPLACE FUNCTION public.approve_pickup(p_pickup_id uuid, p_admin_id uuid)
RETURNS TABLE (
  pickup_id uuid,
  total_value_zar numeric,
  total_points numeric,
  total_co2_kg numeric,
  total_water_l numeric,
  total_landfill_l numeric
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_customer uuid;
  v_value numeric;
  v_points numeric;
  v_co2 numeric;
  v_water numeric;
  v_landfill numeric;
BEGIN
  -- Verify admin
  SELECT role = 'admin' INTO v_is_admin FROM profiles WHERE id = p_admin_id;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admin can approve';
  END IF;

  -- Compute totals
  SELECT t.total_value_zar, t.total_points, t.total_co2_kg, t.total_water_l, t.total_landfill_l
  INTO v_value, v_points, v_co2, v_water, v_landfill
  FROM compute_pickup_totals(p_pickup_id) t;

  -- Update pickup status
  UPDATE pickups
    SET status = 'approved',
        submitted_at = COALESCE(submitted_at, now())
  WHERE id = p_pickup_id;

  -- Find customer
  SELECT customer_id INTO v_customer FROM pickups WHERE id = p_pickup_id;

  -- Record payment row (for audit; adjust if you pay users directly)
  INSERT INTO payments (pickup_id, amount, currency, status, processed_at, method)
  VALUES (p_pickup_id, COALESCE(v_value, 0), 'ZAR', 'approved', now(), 'internal')
  ON CONFLICT (pickup_id) DO UPDATE
    SET amount = EXCLUDED.amount, status = 'approved', processed_at = now();

  -- Credit wallet with points; allocate fund to Green Scholar (v_value)
  INSERT INTO wallet_ledger (user_id, pickup_id, points, zar_amount, fund_allocation, description)
  VALUES (v_customer, p_pickup_id, COALESCE(v_points,0), 0, COALESCE(v_value,0), 'Pickup approved');

  RETURN QUERY
    SELECT p_pickup_id, v_value, v_points, v_co2, v_water, v_landfill;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_pickup(uuid, uuid) TO authenticated;

-- ============================================================================
-- UPDATE COMPLETE
-- ============================================================================
-- Enhanced functions have been added to your database!

-- New functions available:
-- ✅ compute_pickup_totals() - Calculate totals for a pickup
-- ✅ finalize_pickup() - Allow collectors to finalize pickups
-- ✅ approve_pickup() - Allow admins to approve and process payments

-- Note: These functions reference the wallet_ledger table which may not exist yet.
-- If you get an error about wallet_ledger, you can either:
-- 1. Create the wallet_ledger table, or
-- 2. Comment out the wallet_ledger INSERT line in the approve_pickup function
--
-- UPGRADE PATH: After running 10-materials-impact-wallet-update.sql, you can
-- upgrade this function to use real environmental data by running:
-- 
-- CREATE OR REPLACE FUNCTION public.compute_pickup_totals(p_pickup_id uuid)
-- RETURNS TABLE (
--   total_kg numeric,
--   total_value_zar numeric,
--   total_points numeric,
--   total_co2_kg numeric,
--   total_water_l numeric,
--   total_landfill_l numeric
-- ) AS $$
--   SELECT
--     COALESCE(SUM(pi.kilograms), 0)                                        AS total_kg,
--     COALESCE(SUM(pi.kilograms * m.rate_per_kg), 0)                        AS total_value_zar,
--     COALESCE(SUM(pi.kilograms * m.rate_per_kg * m.points_per_rand), 0)    AS total_points,
--     COALESCE(SUM(pi.kilograms * m.co2_per_kg), 0)                         AS total_co2_kg,
--     COALESCE(SUM(pi.kilograms * m.water_l_per_kg), 0)                     AS total_water_l,
--     COALESCE(SUM(pi.kilograms * m.landfill_l_per_kg), 0)                  AS total_landfill_l
--   FROM pickup_items pi
--   JOIN materials m ON m.id = pi.material_id
--   WHERE pi.pickup_id = p_pickup_id;
-- $$ LANGUAGE sql STABLE;

-- For detailed setup instructions, see SUPABASE_SETUP.md
