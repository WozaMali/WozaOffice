-- ============================================================================
-- 08. VIEWS AND SEED DATA
-- ============================================================================
-- This file creates comprehensive views and seeds the database with initial data

-- ============================================================================
-- SEED MATERIAL RATES
-- ============================================================================
-- Seeding material rates and updating existing materials...

-- Update existing materials with correct rates
UPDATE materials SET 
  rate_per_kg = 1.50,
  description = 'Polyethylene terephthalate bottles and containers',
  category = 'Plastic'
WHERE name = 'PET';

UPDATE materials SET 
  rate_per_kg = 18.55,
  description = 'Aluminum beverage and food cans',
  category = 'Metal'
WHERE name = 'Aluminium Cans';

UPDATE materials SET 
  rate_per_kg = 2.00,
  description = 'High-density polyethylene containers',
  category = 'Plastic'
WHERE name = 'HDPE';

UPDATE materials SET 
  rate_per_kg = 1.20,
  description = 'Glass bottles and containers',
  category = 'Glass'
WHERE name = 'Glass';

UPDATE materials SET 
  rate_per_kg = 0.80,
  description = 'Mixed paper and cardboard',
  category = 'Paper'
WHERE name = 'Paper';

UPDATE materials SET 
  rate_per_kg = 0.60,
  description = 'Corrugated cardboard boxes',
  category = 'Paper'
WHERE name = 'Cardboard';

-- Insert additional materials if they don't exist
INSERT INTO materials (name, unit, rate_per_kg, is_active, description, category) VALUES
  ('Steel Cans', 'kg', 2.50, true, 'Steel food and beverage cans', 'Metal'),
  ('LDPE', 'kg', 1.80, true, 'Low-density polyethylene bags and films', 'Plastic'),
  ('PP', 'kg', 2.20, true, 'Polypropylene containers and packaging', 'Plastic'),
  ('Mixed Metals', 'kg', 5.00, true, 'Mixed metal scrap and items', 'Metal')
ON CONFLICT (name) DO NOTHING;

-- Material rates seeded

-- ============================================================================
-- IMPACT CALCULATION FUNCTIONS
-- ============================================================================
-- Creating impact calculation functions...

-- Function to calculate environmental impact for a given weight and material
CREATE OR REPLACE FUNCTION calculate_environmental_impact(
  material_name text,
  weight_kg numeric
) RETURNS json AS $$
DECLARE
  impact json;
BEGIN
  -- Environmental impact factors (kg CO2 saved per kg of material)
  -- These are approximate values based on recycling industry standards
  CASE material_name
    WHEN 'PET' THEN
      impact := json_build_object(
        'co2_saved', weight_kg * 2.5,  -- 2.5 kg CO2 saved per kg PET
        'water_saved', weight_kg * 25,  -- 25L water saved per kg PET
        'landfill_saved', weight_kg * 0.8,  -- 0.8 kg landfill saved per kg PET
        'trees_equivalent', round((weight_kg * 2.5) / 22.0, 2)  -- 22 kg CO2 = 1 tree
      );
    WHEN 'Aluminium Cans' THEN
      impact := json_build_object(
        'co2_saved', weight_kg * 8.0,  -- 8.0 kg CO2 saved per kg aluminum
        'water_saved', weight_kg * 40,  -- 40L water saved per kg aluminum
        'landfill_saved', weight_kg * 0.9,  -- 0.9 kg landfill saved per kg aluminum
        'trees_equivalent', round((weight_kg * 8.0) / 22.0, 2)
      );
    WHEN 'HDPE' THEN
      impact := json_build_object(
        'co2_saved', weight_kg * 2.0,  -- 2.0 kg CO2 saved per kg HDPE
        'water_saved', weight_kg * 20,  -- 20L water saved per kg HDPE
        'landfill_saved', weight_kg * 0.7,  -- 0.7 kg landfill saved per kg HDPE
        'trees_equivalent', round((weight_kg * 2.0) / 22.0, 2)
      );
    WHEN 'Glass' THEN
      impact := json_build_object(
        'co2_saved', weight_kg * 1.2,  -- 1.2 kg CO2 saved per kg glass
        'water_saved', weight_kg * 15,  -- 15L water saved per kg glass
        'landfill_saved', weight_kg * 0.6,  -- 0.6 kg landfill saved per kg glass
        'trees_equivalent', round((weight_kg * 1.2) / 22.0, 2)
      );
    WHEN 'Paper', 'Cardboard' THEN
      impact := json_build_object(
        'co2_saved', weight_kg * 1.8,  -- 1.8 kg CO2 saved per kg paper
        'water_saved', weight_kg * 30,  -- 30L water saved per kg paper
        'landfill_saved', weight_kg * 0.5,  -- 0.5 kg landfill saved per kg paper
        'trees_equivalent', round((weight_kg * 1.8) / 22.0, 2)
      );
    ELSE
      impact := json_build_object(
        'co2_saved', weight_kg * 1.5,  -- Default impact
        'water_saved', weight_kg * 20,
        'landfill_saved', weight_kg * 0.6,
        'trees_equivalent', round((weight_kg * 1.5) / 22.0, 2)
      );
  END CASE;
  
  RETURN impact;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate points for a given weight and material
CREATE OR REPLACE FUNCTION calculate_points(
  material_name text,
  weight_kg numeric
) RETURNS integer AS $$
DECLARE
  base_points integer;
BEGIN
  -- Base points per kg for different materials
  CASE material_name
    WHEN 'PET' THEN base_points := 15;
    WHEN 'Aluminium Cans' THEN base_points := 185;
    WHEN 'HDPE' THEN base_points := 20;
    WHEN 'Glass' THEN base_points := 12;
    WHEN 'Paper' THEN base_points := 8;
    WHEN 'Cardboard' THEN base_points := 6;
    ELSE base_points := 10;
  END CASE;
  
  RETURN round(weight_kg * base_points);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate fund allocation (Green Scholar Fund)
CREATE OR REPLACE FUNCTION calculate_fund_allocation(
  total_value numeric
) RETURNS json AS $$
DECLARE
  fund_allocation json;
BEGIN
  -- Allocate 70% to Green Scholar Fund, 30% to user wallet
  fund_allocation := json_build_object(
    'green_scholar_fund', round(total_value * 0.7, 2),
    'user_wallet', round(total_value * 0.3, 2),
    'total_value', total_value
  );
  
  RETURN fund_allocation;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Impact calculation functions created

-- ============================================================================
-- COMPREHENSIVE DASHBOARD VIEWS
-- ============================================================================
-- Creating comprehensive dashboard views...

-- ============================================================================
-- CUSTOMER DASHBOARD VIEW
-- ============================================================================
CREATE OR REPLACE VIEW public.customer_dashboard_view AS
SELECT
  p.id AS pickup_id,
  p.status,
  p.started_at,
  p.submitted_at,
  p.total_kg,
  p.total_value,
  -- Environmental impact
  (SELECT json_build_object(
    'co2_saved', SUM(calculate_environmental_impact(m.name, pi.kilograms)->>'co2_saved'),
    'water_saved', SUM(calculate_environmental_impact(m.name, pi.kilograms)->>'water_saved'),
    'landfill_saved', SUM(calculate_environmental_impact(m.name, pi.kilograms)->>'landfill_saved'),
    'trees_equivalent', SUM(calculate_environmental_impact(m.name, pi.kilograms)->>'trees_equivalent')
  ) FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id) AS environmental_impact,
  -- Fund allocation
  calculate_fund_allocation(p.total_value) AS fund_allocation,
  -- Total points earned
  (SELECT SUM(calculate_points(m.name, pi.kilograms)) FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id) AS total_points,
  -- Material breakdown
  (SELECT json_agg(json_build_object(
    'material_name', m.name,
    'weight_kg', pi.kilograms,
    'rate_per_kg', m.rate_per_kg,
    'value', pi.kilograms * m.rate_per_kg,
    'points', calculate_points(m.name, pi.kilograms),
    'impact', calculate_environmental_impact(m.name, pi.kilograms)
  )) FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id) AS materials_breakdown,
  -- Photo count
  (SELECT COUNT(*) FROM pickup_photos ph WHERE ph.pickup_id = p.id) AS photo_count,
  -- Collector info
  co.full_name AS collector_name,
  co.phone AS collector_phone,
  -- Address info
  a.line1, a.suburb, a.city, a.postal_code
FROM pickups p
LEFT JOIN profiles co ON co.id = p.collector_id
LEFT JOIN addresses a ON a.id = p.address_id
WHERE p.customer_id = auth.uid();

-- ============================================================================
-- COLLECTOR DASHBOARD VIEW
-- ============================================================================
CREATE OR REPLACE VIEW public.collector_dashboard_view AS
SELECT
  p.id AS pickup_id,
  p.status,
  p.started_at,
  p.submitted_at,
  p.total_kg,
  p.total_value,
  -- Customer info
  cu.full_name AS customer_name,
  cu.email AS customer_email,
  cu.phone AS customer_phone,
  -- Address info
  a.line1, a.suburb, a.city, a.postal_code,
  -- Environmental impact
  (SELECT json_build_object(
    'co2_saved', SUM(calculate_environmental_impact(m.name, pi.kilograms)->>'co2_saved'),
    'water_saved', SUM(calculate_environmental_impact(m.name, pi.kilograms)->>'water_saved'),
    'landfill_saved', SUM(calculate_environmental_impact(m.name, pi.kilograms)->>'landfill_saved'),
    'trees_equivalent', SUM(calculate_environmental_impact(m.name, pi.kilograms)->>'trees_equivalent')
  ) FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id) AS environmental_impact,
  -- Fund allocation
  calculate_fund_allocation(p.total_value) AS fund_allocation,
  -- Total points earned
  (SELECT SUM(calculate_points(m.name, pi.kilograms)) FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id) AS total_points,
  -- Material breakdown
  (SELECT json_agg(json_build_object(
    'material_name', m.name,
    'weight_kg', pi.kilograms,
    'rate_per_kg', m.rate_per_kg,
    'value', pi.kilograms * m.rate_per_kg,
    'points', calculate_points(m.name, pi.kilograms),
    'impact', calculate_environmental_impact(m.name, pi.kilograms)
  )) FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id) AS materials_breakdown,
  -- Photo count
  (SELECT COUNT(*) FROM pickup_photos ph WHERE ph.pickup_id = p.id) AS photo_count,
  -- Payment info
  pay.status AS payment_status,
  pay.amount AS payment_amount,
  pay.method AS payment_method
FROM pickups p
LEFT JOIN profiles cu ON cu.id = p.customer_id
LEFT JOIN addresses a ON a.id = p.address_id
LEFT JOIN payments pay ON pay.pickup_id = p.id
WHERE p.collector_id = auth.uid();

-- ============================================================================
-- ADMIN DASHBOARD VIEW (Enhanced)
-- ============================================================================
CREATE OR REPLACE VIEW public.admin_dashboard_view AS
SELECT
  p.id AS pickup_id,
  p.status,
  p.started_at,
  p.submitted_at,
  p.total_kg,
  p.total_value,
  -- Customer info
  cu.full_name AS customer_name,
  cu.email AS customer_email,
  cu.phone AS customer_phone,
  -- Collector info
  co.full_name AS collector_name,
  co.phone AS collector_phone,
  -- Address info
  a.line1, a.suburb, a.city, a.postal_code,
  -- Environmental impact
  (SELECT json_build_object(
    'co2_saved', SUM(calculate_environmental_impact(m.name, pi.kilograms)->>'co2_saved'),
    'water_saved', SUM(calculate_environmental_impact(m.name, pi.kilograms)->>'water_saved'),
    'landfill_saved', SUM(calculate_environmental_impact(m.name, pi.kilograms)->>'landfill_saved'),
    'trees_equivalent', SUM(calculate_environmental_impact(m.name, pi.kilograms)->>'trees_equivalent')
  ) FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id) AS environmental_impact,
  -- Fund allocation
  calculate_fund_allocation(p.total_value) AS fund_allocation,
  -- Total points earned
  (SELECT SUM(calculate_points(m.name, pi.kilograms)) FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id) AS total_points,
  -- Material breakdown
  (SELECT json_agg(json_build_object(
    'material_name', m.name,
    'weight_kg', pi.kilograms,
    'rate_per_kg', m.rate_per_kg,
    'value', pi.kilograms * m.rate_per_kg,
    'points', calculate_points(m.name, pi.kilograms),
    'impact', calculate_environmental_impact(m.name, pi.kilograms)
  )) FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id) AS materials_breakdown,
  -- Photo count
  (SELECT COUNT(*) FROM pickup_photos ph WHERE ph.pickup_id = p.id) AS photo_count,
  -- Payment info
  pay.status AS payment_status,
  pay.amount AS payment_amount,
  pay.method AS payment_method,
  pay.processed_at AS payment_processed_at,
  -- Approval info
  p.approval_note
FROM pickups p
LEFT JOIN profiles cu ON cu.id = p.customer_id
LEFT JOIN profiles co ON co.id = p.collector_id
LEFT JOIN addresses a ON a.id = p.address_id
LEFT JOIN payments pay ON pay.pickup_id = p.id;

-- ============================================================================
-- ANALYTICS VIEWS FOR DASHBOARDS
-- ============================================================================
-- Creating analytics views...

-- Overall system impact view
CREATE OR REPLACE VIEW public.system_impact_view AS
SELECT
  COUNT(DISTINCT p.id) AS total_pickups,
  COUNT(DISTINCT p.customer_id) AS unique_customers,
  COUNT(DISTINCT p.collector_id) AS unique_collectors,
  SUM(p.total_kg) AS total_kg_collected,
  SUM(p.total_value) AS total_value_generated,
  -- Environmental impact totals
  SUM((SELECT calculate_environmental_impact(m.name, pi.kilograms)->>'co2_saved' FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id)) AS total_co2_saved,
  SUM((SELECT calculate_environmental_impact(m.name, pi.kilograms)->>'water_saved' FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id)) AS total_water_saved,
  SUM((SELECT calculate_environmental_impact(m.name, pi.kilograms)->>'landfill_saved' FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id)) AS total_landfill_saved,
  SUM((SELECT calculate_environmental_impact(m.name, pi.kilograms)->>'trees_equivalent' FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id)) AS total_trees_equivalent,
  -- Fund allocation totals
  SUM(calculate_fund_allocation(p.total_value)->>'green_scholar_fund') AS total_green_scholar_fund,
  SUM(calculate_fund_allocation(p.total_value)->>'user_wallet') AS total_user_wallet_fund,
  -- Points totals
  SUM((SELECT SUM(calculate_points(m.name, pi.kilograms)) FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id)) AS total_points_generated,
  -- Status breakdown
  COUNT(CASE WHEN p.status = 'submitted' THEN 1 END) AS pending_pickups,
  COUNT(CASE WHEN p.status = 'approved' THEN 1 END) AS approved_pickups,
  COUNT(CASE WHEN p.status = 'rejected' THEN 1 END) AS rejected_pickups
FROM pickups p;

-- Material performance view
CREATE OR REPLACE VIEW public.material_performance_view AS
SELECT
  m.name AS material_name,
  m.category,
  m.rate_per_kg,
  COUNT(DISTINCT pi.pickup_id) AS pickup_count,
  SUM(pi.kilograms) AS total_kg_collected,
  SUM(pi.kilograms * m.rate_per_kg) AS total_value_generated,
  AVG(pi.kilograms) AS avg_kg_per_pickup,
  -- Environmental impact
  SUM(calculate_environmental_impact(m.name, pi.kilograms)->>'co2_saved') AS total_co2_saved,
  SUM(calculate_environmental_impact(m.name, pi.kilograms)->>'water_saved') AS total_water_saved,
  SUM(calculate_environmental_impact(m.name, pi.kilograms)->>'landfill_saved') AS total_landfill_saved,
  -- Points generated
  SUM(calculate_points(m.name, pi.kilograms)) AS total_points_generated
FROM materials m
LEFT JOIN pickup_items pi ON pi.material_id = m.id
LEFT JOIN pickups p ON p.id = pi.pickup_id
WHERE m.is_active = true
GROUP BY m.id, m.name, m.category, m.rate_per_kg
ORDER BY total_kg_collected DESC;

-- Collector performance view
CREATE OR REPLACE VIEW public.collector_performance_view AS
SELECT
  co.id AS collector_id,
  co.full_name AS collector_name,
  co.email AS collector_email,
  co.phone AS collector_phone,
  COUNT(DISTINCT p.id) AS total_pickups,
  SUM(p.total_kg) AS total_kg_collected,
  SUM(p.total_value) AS total_value_generated,
  -- Environmental impact
  SUM((SELECT calculate_environmental_impact(m.name, pi.kilograms)->>'co2_saved' FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id)) AS total_co2_saved,
  SUM((SELECT calculate_environmental_impact(m.name, pi.kilograms)->>'water_saved' FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id)) AS total_water_saved,
  -- Points generated
  SUM((SELECT SUM(calculate_points(m.name, pi.kilograms)) FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id)) AS total_points_generated,
  -- Status breakdown
  COUNT(CASE WHEN p.status = 'submitted' THEN 1 END) AS pending_pickups,
  COUNT(CASE WHEN p.status = 'approved' THEN 1 END) AS approved_pickups,
  COUNT(CASE WHEN p.status = 'rejected' THEN 1 END) AS rejected_pickups,
  -- Recent activity
  MAX(p.submitted_at) AS last_pickup_date
FROM profiles co
LEFT JOIN pickups p ON p.collector_id = co.id
WHERE co.role = 'collector'
GROUP BY co.id, co.full_name, co.email, co.phone
ORDER BY total_kg_collected DESC;

-- Customer performance view
CREATE OR REPLACE VIEW public.customer_performance_view AS
SELECT
  cu.id AS customer_id,
  cu.full_name AS customer_name,
  cu.email AS customer_email,
  cu.phone AS customer_phone,
  COUNT(DISTINCT p.id) AS total_pickups,
  SUM(p.total_kg) AS total_kg_recycled,
  SUM(p.total_value) AS total_value_earned,
  -- Environmental impact
  SUM((SELECT calculate_environmental_impact(m.name, pi.kilograms)->>'co2_saved' FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id)) AS total_co2_saved,
  SUM((SELECT calculate_environmental_impact(m.name, pi.kilograms)->>'water_saved' FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id)) AS total_water_saved,
  -- Points earned
  SUM((SELECT SUM(calculate_points(m.name, pi.kilograms)) FROM pickup_items pi JOIN materials m ON pi.material_id = m.id WHERE pi.pickup_id = p.id)) AS total_points_earned,
  -- Fund allocation
  SUM(calculate_fund_allocation(p.total_value)->>'green_scholar_fund') AS total_green_scholar_contribution,
  SUM(calculate_fund_allocation(p.total_value)->>'user_wallet') AS total_wallet_balance,
  -- Recent activity
  MAX(p.submitted_at) AS last_recycling_date
FROM profiles cu
LEFT JOIN pickups p ON p.customer_id = cu.id
WHERE cu.role = 'customer'
GROUP BY cu.id, cu.full_name, cu.email, cu.phone
ORDER BY total_kg_recycled DESC;

-- Analytics views created

-- ============================================================================
-- RLS POLICIES FOR VIEWS
-- ============================================================================
-- Setting up RLS policies for views...

-- Customer dashboard view - customers can only see their own data
CREATE POLICY "customer_dashboard_view_policy" ON customer_dashboard_view
  FOR SELECT USING (true); -- The view already filters by auth.uid()

-- Collector dashboard view - collectors can only see their own pickups
CREATE POLICY "collector_dashboard_view_policy" ON collector_dashboard_view
  FOR SELECT USING (true); -- The view already filters by auth.uid()

-- Admin dashboard view - admins can see all data
CREATE POLICY "admin_dashboard_view_policy" ON admin_dashboard_view
  FOR SELECT USING (auth_role() = 'admin');

-- System impact view - admins only
CREATE POLICY "system_impact_view_policy" ON system_impact_view
  FOR SELECT USING (auth_role() = 'admin');

-- Material performance view - admins only
CREATE POLICY "material_performance_view_policy" ON material_performance_view
  FOR SELECT USING (auth_role() = 'admin');

-- Collector performance view - admins only
CREATE POLICY "collector_performance_view_policy" ON collector_performance_view
  FOR SELECT USING (auth_role() = 'admin');

-- Customer performance view - admins only
CREATE POLICY "customer_performance_view_policy" ON customer_performance_view
  FOR SELECT USING (auth_role() = 'admin');

-- RLS policies for views created

-- ============================================================================
-- INSTALLATION COMPLETE
-- ============================================================================
-- VIEWS AND SEED DATA INSTALLATION COMPLETE!

-- Your recycling management system now includes:
-- ✅ Updated material rates (PET = R1.50, Cans = R18.55, etc.)
-- ✅ Environmental impact calculation functions
-- ✅ Points calculation system
-- ✅ Fund allocation functions (70% Green Scholar, 30% Wallet)
-- ✅ Customer dashboard view with full impact data
-- ✅ Collector dashboard view with performance metrics
-- ✅ Admin dashboard view with comprehensive analytics
-- ✅ System-wide impact analytics
-- ✅ Material performance tracking
-- ✅ Collector performance metrics
-- ✅ Customer performance tracking

-- Next steps:
-- 1. Test the views in your Supabase dashboard
-- 2. Integrate these views into your React components
-- 3. Build beautiful dashboards with real-time data!

-- Example usage:
-- SELECT * FROM customer_dashboard_view;
-- SELECT * FROM collector_dashboard_view;
-- SELECT * FROM admin_dashboard_view;
-- SELECT * FROM system_impact_view;
