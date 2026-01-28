-- ============================================================================
-- 03. MATERIALS & PRICING SCHEMA
-- ============================================================================
-- This file sets up the materials management system with dynamic pricing

-- ============================================================================
-- MATERIALS TABLE
-- ============================================================================
-- Materials table with pricing and unit information
CREATE TABLE materials (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  unit text not null default 'kg',
  rate_per_kg numeric(10,2) not null default 0,
  is_active boolean not null default true,
  description text,
  category text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_materials_name ON materials(name);
CREATE INDEX idx_materials_active ON materials(is_active);
CREATE INDEX idx_materials_category ON materials(category);
CREATE INDEX idx_materials_rate ON materials(rate_per_kg);

-- ============================================================================
-- CONSTRAINTS
-- ============================================================================
-- Ensure positive pricing
ALTER TABLE materials ADD CONSTRAINT chk_materials_rate_positive 
  CHECK (rate_per_kg >= 0);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- Everyone can view active materials
CREATE POLICY "Anyone can view active materials" ON materials
  FOR SELECT USING (is_active = true);

-- Only admins can modify materials
CREATE POLICY "Only admins can modify materials" ON materials
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
CREATE TRIGGER update_materials_updated_at 
  BEFORE UPDATE ON materials 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SAMPLE DATA (RECOMMENDED - FOR IMMEDIATE USE)
-- ============================================================================
-- Insert essential materials for the recycling system
INSERT INTO materials (name, unit, rate_per_kg, is_active, description, category) VALUES
  ('PET', 'kg', 1.50, true, 'Polyethylene terephthalate bottles and containers', 'Plastic'),
  ('Aluminium Cans', 'kg', 18.55, true, 'Aluminum beverage and food cans', 'Metal'),
  ('HDPE', 'kg', 2.00, true, 'High-density polyethylene containers', 'Plastic'),
  ('Glass', 'kg', 1.20, true, 'Glass bottles and containers', 'Glass'),
  ('Paper', 'kg', 0.80, true, 'Mixed paper and cardboard', 'Paper'),
  ('Cardboard', 'kg', 0.60, true, 'Corrugated cardboard boxes', 'Paper');

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE materials IS 'Materials table with pricing and unit information for recycling';
COMMENT ON COLUMN materials.rate_per_kg IS 'Price per kilogram in ZAR (South African Rand)';
COMMENT ON COLUMN materials.unit IS 'Unit of measurement (default: kg)';
COMMENT ON COLUMN materials.category IS 'Material category for grouping and reporting';
