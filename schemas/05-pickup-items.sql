-- ============================================================================
-- 05. PICKUP ITEMS & MATERIALS SCHEMA
-- ============================================================================
-- This file sets up the pickup items system with material details and contamination tracking

-- ============================================================================
-- PICKUP_ITEMS TABLE
-- ============================================================================
-- Individual material items within each pickup with contamination tracking
CREATE TABLE pickup_items (
  id uuid primary key default gen_random_uuid(),
  pickup_id uuid references pickups(id) on delete cascade,
  material_id uuid references materials(id),
  kilograms numeric(10,3) check (kilograms >= 0),
  contamination_pct numeric(5,2) check (contamination_pct between 0 and 100),
  notes text,
  created_at timestamptz default now()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_pickup_items_pickup_id ON pickup_items(pickup_id);
CREATE INDEX idx_pickup_items_material_id ON pickup_items(material_id);
CREATE INDEX idx_pickup_items_kilograms ON pickup_items(kilograms);

-- ============================================================================
-- CONSTRAINTS
-- ============================================================================
-- Ensure positive weight
ALTER TABLE pickup_items ADD CONSTRAINT chk_pickup_items_positive_weight 
  CHECK (kilograms > 0);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE pickup_items ENABLE ROW LEVEL SECURITY;

-- Users can see items for pickups they can access
CREATE POLICY "Users can view pickup items" ON pickup_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pickups 
      WHERE pickups.id = pickup_items.pickup_id
      AND (
        pickups.customer_id = auth.uid() OR 
        pickups.collector_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role = 'admin'
        )
      )
    )
  );

-- Collectors can add items to their pickups
CREATE POLICY "Collectors can add items" ON pickup_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM pickups 
      WHERE pickups.id = pickup_items.pickup_id
      AND pickups.collector_id = auth.uid()
    )
  );

-- Additional collector items insert policy
CREATE POLICY "collector_items_insert" ON pickup_items
  FOR INSERT WITH CHECK (
    auth_role() = 'collector' AND
    pickup_id IN (SELECT id FROM pickups WHERE collector_id = auth.uid())
  );

-- Additional admin items policy
CREATE POLICY "admin_items" ON pickup_items
  FOR ALL USING (auth_role() = 'admin') WITH CHECK (auth_role() = 'admin');

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC CALCULATIONS
-- ============================================================================
-- Function to update pickup totals when items are added/modified
CREATE OR REPLACE FUNCTION update_pickup_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Update pickup totals
    UPDATE pickups 
    SET 
        total_kg = (
            SELECT COALESCE(SUM(kilograms), 0) 
            FROM pickup_items 
            WHERE pickup_id = COALESCE(NEW.pickup_id, OLD.pickup_id)
        ),
        total_value = (
            SELECT COALESCE(SUM(pi.kilograms * m.rate_per_kg), 0)
            FROM pickup_items pi
            JOIN materials m ON pi.material_id = m.id
            WHERE pi.pickup_id = COALESCE(NEW.pickup_id, OLD.pickup_id)
        )
    WHERE id = COALESCE(NEW.pickup_id, OLD.pickup_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update totals when items are inserted
CREATE TRIGGER trigger_update_pickup_totals_insert
    AFTER INSERT ON pickup_items
    FOR EACH ROW
    EXECUTE FUNCTION update_pickup_totals();

-- Trigger to update totals when items are updated
CREATE TRIGGER trigger_update_pickup_totals_update
    AFTER UPDATE ON pickup_items
    FOR EACH ROW
    EXECUTE FUNCTION update_pickup_totals();

-- Trigger to update totals when items are deleted
CREATE TRIGGER trigger_update_pickup_totals_delete
    AFTER DELETE ON pickup_items
    FOR EACH ROW
    EXECUTE FUNCTION update_pickup_totals();

-- ============================================================================
-- SAMPLE DATA (OPTIONAL - FOR TESTING)
-- ============================================================================
-- Uncomment these lines to insert test pickup items
/*
INSERT INTO pickup_items (pickup_id, material_id, kilograms, contamination_pct, notes) VALUES
  ((SELECT id FROM pickups LIMIT 1), 
   (SELECT id FROM materials WHERE name = 'PET Bottles'), 
   8.5, 2.5, 'Clean bottles, minimal contamination'),
  ((SELECT id FROM pickups LIMIT 1), 
   (SELECT id FROM materials WHERE name = 'Aluminum Cans'), 
   7.0, 1.0, 'Crushed cans, very clean');
*/

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE pickup_items IS 'Individual material items within each pickup with contamination tracking';
COMMENT ON COLUMN pickup_items.contamination_pct IS 'Percentage of contamination (0-100) affecting quality and pricing';
COMMENT ON COLUMN pickup_items.kilograms IS 'Weight of the material in kilograms';
COMMENT ON COLUMN pickup_items.notes IS 'Additional notes about the material quality or collection';
