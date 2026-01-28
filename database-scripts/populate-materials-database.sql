-- ============================================================================
-- POPULATE MATERIALS DATABASE
-- ============================================================================
-- This script populates the materials table with the proper materials for the collector app

-- 1. Create materials table if it doesn't exist
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  rate_per_kg DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create material categories table if it doesn't exist
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.material_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT DEFAULT '#3B82F6',
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Insert material categories
-- ============================================================================

INSERT INTO public.material_categories (name, description, icon, color, sort_order) VALUES
  ('Metals', 'Aluminium, steel, and other metal materials', '🔩', '#FF6B6B', 1),
  ('Plastics', 'PET, HDPE, and other plastic materials', '♻️', '#4ECDC4', 2),
  ('Glass', 'Glass bottles and containers', '🍾', '#45B7D1', 3),
  ('Paper', 'Paper and cardboard materials', '📄', '#96CEB4', 4),
  ('Electronics', 'Electronic waste and components', '📱', '#FFEAA7', 5),
  ('Textiles', 'Clothing and fabric materials', '👕', '#DDA0DD', 6)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  sort_order = EXCLUDED.sort_order;

-- 4. Insert materials with proper pricing using category IDs
-- ============================================================================

-- Insert materials with proper category references
DO $$
DECLARE
  metals_id UUID;
  plastics_id UUID;
  glass_id UUID;
  paper_id UUID;
  electronics_id UUID;
  textiles_id UUID;
BEGIN
  -- Get category IDs
  SELECT id INTO metals_id FROM public.material_categories WHERE name = 'Metals';
  SELECT id INTO plastics_id FROM public.material_categories WHERE name = 'Plastics';
  SELECT id INTO glass_id FROM public.material_categories WHERE name = 'Glass';
  SELECT id INTO paper_id FROM public.material_categories WHERE name = 'Paper';
  SELECT id INTO electronics_id FROM public.material_categories WHERE name = 'Electronics';
  SELECT id INTO textiles_id FROM public.material_categories WHERE name = 'Textiles';

  -- Insert materials with category IDs
  INSERT INTO public.materials (name, unit, rate_per_kg, is_active, description, category_id) VALUES
    -- Metals
    ('Aluminium Cans', 'kg', 18.55, true, 'Clean aluminium beverage cans', metals_id),
    ('Aluminium Foil', 'kg', 15.00, true, 'Clean aluminium foil and trays', metals_id),
    ('Steel Cans', 'kg', 8.50, true, 'Clean steel food and beverage cans', metals_id),
    ('Copper Wire', 'kg', 45.00, true, 'Clean copper electrical wire', metals_id),
    ('Brass', 'kg', 25.00, true, 'Clean brass fittings and components', metals_id),
    
    -- Plastics
    ('PET Bottles', 'kg', 1.50, true, 'Clear PET plastic bottles (water, soft drinks)', plastics_id),
    ('HDPE Bottles', 'kg', 2.20, true, 'HDPE plastic bottles (milk, detergent)', plastics_id),
    ('PVC Pipes', 'kg', 1.80, true, 'Clean PVC pipes and fittings', plastics_id),
    ('Plastic Bags', 'kg', 0.80, true, 'Clean plastic shopping bags', plastics_id),
    ('Mixed Plastics', 'kg', 1.20, true, 'Mixed plastic materials', plastics_id),
    
    -- Glass
    ('Clear Glass', 'kg', 2.00, true, 'Clear glass bottles and jars', glass_id),
    ('Green Glass', 'kg', 1.80, true, 'Green glass bottles', glass_id),
    ('Brown Glass', 'kg', 1.90, true, 'Brown glass bottles', glass_id),
    ('Mixed Glass', 'kg', 1.70, true, 'Mixed colored glass', glass_id),
    
    -- Paper
    ('White Paper', 'kg', 1.20, true, 'Clean white office paper', paper_id),
    ('Newspaper', 'kg', 0.80, true, 'Clean newspapers', paper_id),
    ('Cardboard', 'kg', 1.00, true, 'Clean cardboard boxes', paper_id),
    ('Magazines', 'kg', 0.90, true, 'Clean magazines and catalogs', paper_id),
    ('Mixed Paper', 'kg', 0.85, true, 'Mixed paper materials', paper_id),
    
    -- Electronics
    ('Mobile Phones', 'piece', 5.00, true, 'Working or broken mobile phones', electronics_id),
    ('Laptops', 'piece', 25.00, true, 'Working or broken laptops', electronics_id),
    ('Tablets', 'piece', 15.00, true, 'Working or broken tablets', electronics_id),
    ('Cables', 'kg', 8.00, true, 'Electrical cables and wires', electronics_id),
    ('Batteries', 'kg', 12.00, true, 'Rechargeable and non-rechargeable batteries', electronics_id),
    
    -- Textiles
    ('Cotton Clothing', 'kg', 3.50, true, 'Clean cotton clothing', textiles_id),
    ('Denim', 'kg', 2.80, true, 'Clean denim clothing', textiles_id),
    ('Wool', 'kg', 4.20, true, 'Clean wool clothing', textiles_id),
    ('Mixed Textiles', 'kg', 2.00, true, 'Mixed textile materials', textiles_id)
  ON CONFLICT (name) DO UPDATE SET
    rate_per_kg = EXCLUDED.rate_per_kg,
    description = EXCLUDED.description,
    category_id = EXCLUDED.category_id,
    updated_at = NOW();
END $$;

-- 5. Add indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_materials_name ON public.materials(name);
CREATE INDEX IF NOT EXISTS idx_materials_active ON public.materials(is_active);
CREATE INDEX IF NOT EXISTS idx_materials_category ON public.materials(category);
CREATE INDEX IF NOT EXISTS idx_materials_rate ON public.materials(rate_per_kg);

-- 6. Grant permissions
-- ============================================================================

GRANT ALL ON public.materials TO authenticated;
GRANT ALL ON public.material_categories TO authenticated;

-- 7. Verify the data
-- ============================================================================

SELECT 
  'Materials populated successfully!' as status,
  COUNT(*) as total_materials
FROM public.materials
WHERE is_active = true;

-- 8. Show sample materials
-- ============================================================================

SELECT 
  name,
  category,
  rate_per_kg,
  unit
FROM public.materials
WHERE is_active = true
ORDER BY category, name
LIMIT 10;
