-- ============================================================================
-- SECTION 2: COLLECTIONS MANAGEMENT SCHEMA
-- ============================================================================
-- This script creates the materials and collections tables for the unified system
-- Supports Main App, Collector App, and Office App

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. MATERIALS TABLE
-- ============================================================================

-- Create materials table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    unit_price DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. COLLECTIONS TABLE
-- ============================================================================

-- Create collections table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    collector_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE RESTRICT,
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
    weight_kg NUMERIC(10,2) NOT NULL CHECK (weight_kg > 0),
    photo_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    notes TEXT,
    collection_date DATE DEFAULT CURRENT_DATE,
    -- Green Scholar Fund tracking
    contributes_to_green_scholar_fund BOOLEAN DEFAULT false,
    green_scholar_fund_amount DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Collections table indexes
CREATE INDEX IF NOT EXISTS idx_collections_resident ON public.collections(resident_id);
CREATE INDEX IF NOT EXISTS idx_collections_collector ON public.collections(collector_id);
CREATE INDEX IF NOT EXISTS idx_collections_area ON public.collections(area_id);
CREATE INDEX IF NOT EXISTS idx_collections_material ON public.collections(material_id);
CREATE INDEX IF NOT EXISTS idx_collections_status ON public.collections(status);
CREATE INDEX IF NOT EXISTS idx_collections_date ON public.collections(collection_date);
CREATE INDEX IF NOT EXISTS idx_collections_created_at ON public.collections(created_at);

-- Materials table indexes
CREATE INDEX IF NOT EXISTS idx_materials_active ON public.materials(is_active);
CREATE INDEX IF NOT EXISTS idx_materials_name ON public.materials(name);

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on both tables
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- Materials policies (read-only for all authenticated users)
CREATE POLICY "Materials are viewable by all authenticated users" ON public.materials
    FOR SELECT USING (auth.role() = 'authenticated');

-- Collections policies
CREATE POLICY "Users can view their own collections" ON public.collections
    FOR SELECT USING (
        auth.uid() = resident_id OR 
        auth.uid() = collector_id OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role_id IN (
                SELECT id FROM public.roles 
                WHERE name IN ('admin', 'office', 'collector')
            )
        )
    );

CREATE POLICY "Collectors can create collections" ON public.collections
    FOR INSERT WITH CHECK (
        auth.uid() = collector_id AND
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role_id IN (
                SELECT id FROM public.roles 
                WHERE name = 'collector'
            )
        )
    );

CREATE POLICY "Office users can update collection status" ON public.collections
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role_id IN (
                SELECT id FROM public.roles 
                WHERE name IN ('admin', 'office')
            )
        )
    );

-- ============================================================================
-- 5. TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_materials_updated_at 
    BEFORE UPDATE ON public.materials 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_collections_updated_at 
    BEFORE UPDATE ON public.collections 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate Green Scholar Fund contribution
CREATE OR REPLACE FUNCTION public.calculate_green_scholar_fund()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the material is PET Bottles (contributes to Green Scholar Fund)
    IF EXISTS (
        SELECT 1 FROM public.materials 
        WHERE id = NEW.material_id 
        AND name = 'PET Bottles'
    ) THEN
        NEW.contributes_to_green_scholar_fund := true;
        NEW.green_scholar_fund_amount := NEW.weight_kg * 1.50; -- R1.50 per kg for PET bottles
    ELSE
        NEW.contributes_to_green_scholar_fund := false;
        NEW.green_scholar_fund_amount := 0.00;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically calculate Green Scholar Fund contribution
CREATE TRIGGER calculate_green_scholar_fund_trigger
    BEFORE INSERT OR UPDATE ON public.collections
    FOR EACH ROW EXECUTE FUNCTION public.calculate_green_scholar_fund();

-- ============================================================================
-- 6. SEED DATA
-- ============================================================================

-- Insert default materials with correct pricing
INSERT INTO public.materials (name, description, unit_price) VALUES
('PET Bottles', 'Plastic bottles (PET) - funds go to Green Scholar Fund', 1.50),
('Aluminium Cans', 'Aluminium and tin cans', 18.55),
('Glass Bottles', 'Glass bottles and jars', 1.80),
('Paper & Cardboard', 'Newspapers, cardboard, and office paper', 1.20),
('Steel Cans', 'Steel food and beverage cans', 2.00),
('Electronic Waste', 'Small electronic devices and components', 5.00),
('Textiles', 'Clothing and fabric materials', 1.50),
('Organic Waste', 'Compostable organic materials', 0.50)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 7. USEFUL VIEWS
-- ============================================================================

-- View for collection details with user and material info
CREATE OR REPLACE VIEW public.collection_details AS
SELECT 
    c.id,
    c.weight_kg,
    c.photo_url,
    c.status,
    c.notes,
    c.collection_date,
    c.created_at,
    c.updated_at,
    -- Resident info
    CONCAT(u1.first_name, ' ', u1.last_name) as resident_name,
    u1.phone as resident_phone,
    u1.email as resident_email,
    -- Collector info
    CONCAT(u2.first_name, ' ', u2.last_name) as collector_name,
    u2.phone as collector_phone,
    u2.email as collector_email,
    -- Area info
    a.name as area_name,
    -- Material info
    m.name as material_name,
    m.description as material_description,
    m.unit_price,
    -- Calculated fields
    (c.weight_kg * m.unit_price) as estimated_value
FROM public.collections c
JOIN public.users u1 ON c.resident_id = u1.id
JOIN public.users u2 ON c.collector_id = u2.id
JOIN public.areas a ON c.area_id = a.id
JOIN public.materials m ON c.material_id = m.id;

-- View for collector statistics
CREATE OR REPLACE VIEW public.collector_stats AS
SELECT 
    collector_id,
    CONCAT(u.first_name, ' ', u.last_name) as collector_name,
    COUNT(*) as total_collections,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_collections,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_collections,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_collections,
    SUM(weight_kg) as total_weight_kg,
    SUM(weight_kg * m.unit_price) as total_estimated_value,
    AVG(weight_kg) as avg_weight_per_collection,
    MAX(collection_date) as last_collection_date
FROM public.collections c
JOIN public.users u ON c.collector_id = u.id
JOIN public.materials m ON c.material_id = m.id
GROUP BY collector_id, u.first_name, u.last_name;

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions
GRANT SELECT ON public.materials TO authenticated;
GRANT SELECT ON public.collections TO authenticated;
GRANT INSERT ON public.collections TO authenticated;
GRANT UPDATE ON public.collections TO authenticated;
GRANT SELECT ON public.collection_details TO authenticated;
GRANT SELECT ON public.collector_stats TO authenticated;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Section 2: Collections Management Schema created successfully!';
    RAISE NOTICE '📊 Tables created: materials, collections';
    RAISE NOTICE '🔒 RLS policies enabled for security';
    RAISE NOTICE '📈 Indexes created for performance';
    RAISE NOTICE '🌱 Seed data inserted for materials';
    RAISE NOTICE '👁️ Views created: collection_details, collector_stats';
END $$;
