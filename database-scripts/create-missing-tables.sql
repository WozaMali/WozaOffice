-- Create missing tables for Green Scholar Fund
-- This will fix the 404 errors in the office app

-- 1. Create schools table
CREATE TABLE IF NOT EXISTS schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    school_code TEXT UNIQUE,
    address TEXT,
    city TEXT,
    province TEXT,
    contact_person TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    school_type TEXT CHECK (school_type IN ('primary', 'secondary', 'combined', 'special_needs')),
    student_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create child_headed_homes table
CREATE TABLE IF NOT EXISTS child_headed_homes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    home_code TEXT UNIQUE,
    address TEXT,
    city TEXT,
    province TEXT,
    contact_person TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    children_count INTEGER DEFAULT 0,
    age_range TEXT, -- e.g., "5-18 years"
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create green_scholar_applications table
CREATE TABLE IF NOT EXISTS green_scholar_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    
    full_name TEXT NOT NULL,
    date_of_birth DATE,
    phone_number TEXT,
    email TEXT,
    id_number TEXT,
    
    school_name TEXT,
    grade TEXT,
    student_number TEXT,
    academic_performance TEXT,
    
    household_income TEXT,
    household_size TEXT,
    employment_status TEXT,
    other_income_sources TEXT,
    
    support_type TEXT[],
    urgent_needs TEXT,
    previous_support TEXT,
    
    has_id_document BOOLEAN DEFAULT false,
    has_school_report BOOLEAN DEFAULT false,
    has_income_proof BOOLEAN DEFAULT false,
    has_bank_statement BOOLEAN DEFAULT false,
    
    special_circumstances TEXT,
    community_involvement TEXT,
    references_info TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_schools_name ON schools(name);
CREATE INDEX IF NOT EXISTS idx_schools_active ON schools(is_active);
CREATE INDEX IF NOT EXISTS idx_child_homes_name ON child_headed_homes(name);
CREATE INDEX IF NOT EXISTS idx_child_homes_active ON child_headed_homes(is_active);
CREATE INDEX IF NOT EXISTS idx_gsa_status ON green_scholar_applications(status);
CREATE INDEX IF NOT EXISTS idx_gsa_created_at ON green_scholar_applications(created_at DESC);

-- 5. Enable RLS
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_headed_homes ENABLE ROW LEVEL SECURITY;
ALTER TABLE green_scholar_applications ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies
-- Schools - public read, admin write
CREATE POLICY "Schools are viewable by everyone" ON schools 
    FOR SELECT USING (true);

CREATE POLICY "Only admins can modify schools" ON schools 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Child homes - public read, admin write
CREATE POLICY "Child homes are viewable by everyone" ON child_headed_homes 
    FOR SELECT USING (true);

CREATE POLICY "Only admins can modify child homes" ON child_headed_homes 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Applications - users can create and read their own, admins can read all
CREATE POLICY "Users can create applications" ON green_scholar_applications 
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can read their own applications" ON green_scholar_applications 
    FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Admins can read all applications" ON green_scholar_applications 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 7. Grant permissions
GRANT SELECT ON schools TO authenticated;
GRANT SELECT ON schools TO service_role;
GRANT SELECT ON child_headed_homes TO authenticated;
GRANT SELECT ON child_headed_homes TO service_role;
GRANT SELECT, INSERT ON green_scholar_applications TO authenticated;
GRANT SELECT ON green_scholar_applications TO service_role;

-- 8. Insert some sample data
INSERT INTO schools (name, school_code, city, province, school_type, student_count, is_active) VALUES
('Sample Primary School', 'SPS001', 'Cape Town', 'Western Cape', 'primary', 500, true),
('Sample High School', 'SHS001', 'Cape Town', 'Western Cape', 'secondary', 800, true)
ON CONFLICT (school_code) DO NOTHING;

INSERT INTO child_headed_homes (name, home_code, city, province, children_count, age_range, is_active) VALUES
('Sample Children''s Home', 'SCH001', 'Cape Town', 'Western Cape', 25, '5-18 years', true),
('Hope House', 'HH001', 'Cape Town', 'Western Cape', 15, '8-16 years', true)
ON CONFLICT (home_code) DO NOTHING;

-- 9. Verify tables were created
SELECT 
    table_name, 
    table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('schools', 'child_headed_homes', 'green_scholar_applications')
ORDER BY table_name;
