-- ============================================================================
-- 04. PICKUP MANAGEMENT SCHEMA
-- ============================================================================
-- This file sets up the pickup management system with workflow tracking

-- ============================================================================
-- PICKUPS TABLE
-- ============================================================================
-- Main pickup table tracking the collection workflow
CREATE TABLE pickups (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references profiles(id),
  collector_id uuid references profiles(id),
  address_id uuid references addresses(id),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  lat double precision,
  lng double precision,
  status text not null default 'submitted' check (status in ('submitted','approved','rejected')),
  approval_note text,
  total_kg numeric(10,3) default 0,
  total_value numeric(10,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_pickups_customer_id ON pickups(customer_id);
CREATE INDEX idx_pickups_collector_id ON pickups(collector_id);
CREATE INDEX idx_pickups_address_id ON pickups(address_id);
CREATE INDEX idx_pickups_status ON pickups(status);
CREATE INDEX idx_pickups_started_at ON pickups(started_at);
CREATE INDEX idx_pickups_submitted_at ON pickups(submitted_at);
CREATE INDEX idx_pickups_location ON pickups(lat, lng);

-- ============================================================================
-- CONSTRAINTS
-- ============================================================================
-- Ensure positive values
ALTER TABLE pickups ADD CONSTRAINT chk_pickups_positive_values 
  CHECK (total_kg >= 0 AND total_value >= 0);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE pickups ENABLE ROW LEVEL SECURITY;

-- Users can see pickups they're involved in
CREATE POLICY "Users can view related pickups" ON pickups
  FOR SELECT USING (
    auth.uid() = customer_id OR 
    auth.uid() = collector_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Collectors can create and update pickups
CREATE POLICY "Collectors can manage pickups" ON pickups
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'collector'
    )
  );

CREATE POLICY "Collectors can update pickups" ON pickups
  FOR UPDATE USING (
    auth.uid() = collector_id
  );

-- Admins can approve/reject pickups
CREATE POLICY "Admins can approve pickups" ON pickups
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Additional customer read policy
CREATE POLICY "customer_read_pickups" ON pickups
  FOR SELECT USING (customer_id = auth.uid());

-- Additional collector policies
CREATE POLICY "collector_insert_pickups" ON pickups
  FOR INSERT WITH CHECK (auth_role() = 'admin' AND collector_id = auth.uid());

CREATE POLICY "collector_read_own_pickups" ON pickups
  FOR SELECT USING (collector_id = auth.uid());

-- Additional admin pickups policy
CREATE POLICY "admin_pickups" ON pickups
  FOR ALL USING (auth_role() = 'admin') WITH CHECK (auth_role() = 'admin');

-- ============================================================================
-- ADMIN VIEWS
-- ============================================================================
-- Comprehensive admin view for pickup management
CREATE OR REPLACE VIEW public.pickup_admin_view AS
SELECT
  p.id AS pickup_id,
  cu.full_name AS customer_name,
  cu.email AS customer_email,
  co.full_name AS collector_name,
  p.status,
  p.started_at,
  p.submitted_at,
  SUM(pi.kilograms) AS total_kg,
  SUM(pi.kilograms * m.rate_per_kg) AS total_value,
  COUNT(DISTINCT ph.id) AS photo_count
FROM pickups p
LEFT JOIN profiles cu ON cu.id = p.customer_id
LEFT JOIN profiles co ON co.id = p.collector_id
LEFT JOIN pickup_items pi ON pi.pickup_id = p.id
LEFT JOIN materials m ON m.id = pi.material_id
LEFT JOIN pickup_photos ph ON ph.pickup_id = p.id
GROUP BY p.id, cu.full_name, cu.email, co.full_name;

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
CREATE TRIGGER update_pickups_updated_at 
  BEFORE UPDATE ON pickups 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SAMPLE DATA (OPTIONAL - FOR TESTING)
-- ============================================================================
-- Uncomment these lines to insert test pickups
/*
INSERT INTO pickups (customer_id, collector_id, address_id, status, total_kg, total_value) VALUES
  ('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 
   (SELECT id FROM addresses WHERE profile_id = '550e8400-e29b-41d4-a716-446655440003' LIMIT 1), 
   'submitted', 15.5, 38.75);
*/

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE pickups IS 'Main pickup table tracking the collection workflow';
COMMENT ON COLUMN pickups.status IS 'Pickup status: submitted, approved, or rejected';
COMMENT ON COLUMN pickups.total_kg IS 'Total weight collected in kilograms';
COMMENT ON COLUMN pickups.total_value IS 'Total monetary value of the collection';
COMMENT ON COLUMN pickups.approval_note IS 'Admin notes for approval or rejection';
