-- Section 2: Collections Management Schema
-- Clean version without any formatting issues

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create materials table
CREATE TABLE IF NOT EXISTS public.materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    unit_price DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create collections table
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
    contributes_to_green_scholar_fund BOOLEAN DEFAULT false,
    green_scholar_fund_amount DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_collections_resident ON public.collections(resident_id);
CREATE INDEX IF NOT EXISTS idx_collections_collector ON public.collections(collector_id);
CREATE INDEX IF NOT EXISTS idx_collections_area ON public.collections(area_id);
CREATE INDEX IF NOT EXISTS idx_collections_material ON public.collections(material_id);
CREATE INDEX IF NOT EXISTS idx_collections_status ON public.collections(status);
CREATE INDEX IF NOT EXISTS idx_materials_active ON public.materials(is_active);

-- Enable RLS
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Materials are viewable by all authenticated users" ON public.materials
    FOR SELECT USING (auth.role() = 'authenticated');

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

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_materials_updated_at 
    BEFORE UPDATE ON public.materials 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_collections_updated_at 
    BEFORE UPDATE ON public.collections 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create Green Scholar Fund calculation function
CREATE OR REPLACE FUNCTION public.calculate_green_scholar_fund()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.materials 
        WHERE id = NEW.material_id 
        AND name = 'PET Bottles'
    ) THEN
        NEW.contributes_to_green_scholar_fund := true;
        NEW.green_scholar_fund_amount := NEW.weight_kg * 1.50;
    ELSE
        NEW.contributes_to_green_scholar_fund := false;
        NEW.green_scholar_fund_amount := 0.00;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create Green Scholar Fund trigger
CREATE TRIGGER calculate_green_scholar_fund_trigger
    BEFORE INSERT OR UPDATE ON public.collections
    FOR EACH ROW EXECUTE FUNCTION public.calculate_green_scholar_fund();

-- Insert materials data
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

-- Grant permissions
GRANT SELECT ON public.materials TO authenticated;
GRANT SELECT ON public.collections TO authenticated;
GRANT INSERT ON public.collections TO authenticated;
GRANT UPDATE ON public.collections TO authenticated;
