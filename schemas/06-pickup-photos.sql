-- ============================================================================
-- 06. PHOTO MANAGEMENT SCHEMA
-- ============================================================================
-- This file sets up the photo management system with GPS coordinates and categorization

-- ============================================================================
-- PICKUP_PHOTOS TABLE
-- ============================================================================
-- Photo management for pickups with GPS coordinates and categorization
CREATE TABLE pickup_photos (
  id uuid primary key default gen_random_uuid(),
  pickup_id uuid references pickups(id) on delete cascade,
  url text not null,
  taken_at timestamptz not null default now(),
  lat double precision,
  lng double precision,
  type text check (type in ('scale','bags','other')),
  description text,
  file_size integer,
  mime_type text,
  created_at timestamptz default now()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_pickup_photos_pickup_id ON pickup_photos(pickup_id);
CREATE INDEX idx_pickup_photos_type ON pickup_photos(type);
CREATE INDEX idx_pickup_photos_taken_at ON pickup_photos(taken_at);
CREATE INDEX idx_pickup_photos_location ON pickup_photos(lat, lng);

-- ============================================================================
-- CONSTRAINTS
-- ============================================================================
-- Ensure valid URL format (basic check)
ALTER TABLE pickup_photos ADD CONSTRAINT chk_pickup_photos_valid_url 
  CHECK (url ~ '^https?://');

-- Ensure positive file size
ALTER TABLE pickup_photos ADD CONSTRAINT chk_pickup_photos_file_size 
  CHECK (file_size > 0);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE pickup_photos ENABLE ROW LEVEL SECURITY;

-- Users can see photos for pickups they can access
CREATE POLICY "Users can view pickup photos" ON pickup_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pickups 
      WHERE pickups.id = pickup_photos.pickup_id
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

-- Collectors can add photos to their pickups
CREATE POLICY "Collectors can add photos" ON pickup_photos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM pickups 
      WHERE pickups.id = pickup_photos.pickup_id
      AND pickups.collector_id = auth.uid()
    )
  );

-- Additional collector photos insert policy
CREATE POLICY "collector_photos_insert" ON pickup_photos
  FOR INSERT WITH CHECK (
    auth_role() = 'collector' AND
    pickup_id IN (SELECT id FROM pickups WHERE collector_id = auth.uid())
  );

-- Additional admin photos policy
CREATE POLICY "admin_photos" ON pickup_photos
  FOR ALL USING (auth_role() = 'admin') WITH CHECK (auth_role() = 'admin');

-- ============================================================================
-- TRIGGERS FOR METADATA
-- ============================================================================
-- Function to set default mime type based on file extension
CREATE OR REPLACE FUNCTION set_default_mime_type()
RETURNS TRIGGER AS $$
BEGIN
    -- Set default mime type if not provided
    IF NEW.mime_type IS NULL THEN
        CASE 
            WHEN NEW.url LIKE '%.jpg' OR NEW.url LIKE '%.jpeg' THEN
                NEW.mime_type := 'image/jpeg';
            WHEN NEW.url LIKE '%.png' THEN
                NEW.mime_type := 'image/png';
            WHEN NEW.url LIKE '%.gif' THEN
                NEW.mime_type := 'image/gif';
            WHEN NEW.url LIKE '%.webp' THEN
                NEW.mime_type := 'image/webp';
            ELSE
                NEW.mime_type := 'image/jpeg'; -- Default fallback
        END CASE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set mime type before insert
CREATE TRIGGER trigger_set_mime_type
    BEFORE INSERT ON pickup_photos
    FOR EACH ROW
    EXECUTE FUNCTION set_default_mime_type();

-- ============================================================================
-- SAMPLE DATA (OPTIONAL - FOR TESTING)
-- ============================================================================
-- Uncomment these lines to insert test photos
/*
INSERT INTO pickup_photos (pickup_id, url, type, description, lat, lng) VALUES
  ((SELECT id FROM pickups LIMIT 1), 
   'https://example.com/photos/scale1.jpg', 
   'scale', 
   'Scale showing 15.5kg total weight', 
   -26.1087, 28.0567),
  ((SELECT id FROM pickups LIMIT 1), 
   'https://example.com/photos/bags1.jpg', 
   'bags', 
   'Recycling bags ready for collection', 
   -26.1087, 28.0567);
*/

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE pickup_photos IS 'Photo management for pickups with GPS coordinates and categorization';
COMMENT ON COLUMN pickup_photos.type IS 'Photo type: scale (weight verification), bags (collection), or other';
COMMENT ON COLUMN pickup_photos.lat IS 'Latitude coordinate where photo was taken';
COMMENT ON COLUMN pickup_photos.lng IS 'Longitude coordinate where photo was taken';
COMMENT ON COLUMN pickup_photos.url IS 'URL to the stored photo file';
COMMENT ON COLUMN pickup_photos.file_size IS 'File size in bytes for storage tracking';
COMMENT ON COLUMN pickup_photos.mime_type IS 'MIME type of the photo file';
