-- ============================================================================
-- 02. ADDRESSES SCHEMA
-- ============================================================================
-- This file sets up the address management system with geolocation support

-- ============================================================================
-- ADDRESSES TABLE
-- ============================================================================
-- Address table supporting multiple addresses per profile with geolocation
CREATE TABLE addresses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  line1 text not null,
  suburb text not null,
  city text not null,
  postal_code text,
  lat double precision,
  lng double precision,
  is_primary boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_addresses_profile_id ON addresses(profile_id);
CREATE INDEX idx_addresses_city ON addresses(city);
CREATE INDEX idx_addresses_suburb ON addresses(suburb);
CREATE INDEX idx_addresses_primary ON addresses(is_primary);
CREATE INDEX idx_addresses_location ON addresses(lat, lng);

-- ============================================================================
-- CONSTRAINTS
-- ============================================================================
-- Ensure only one primary address per profile
CREATE UNIQUE INDEX idx_addresses_one_primary_per_profile 
  ON addresses(profile_id) 
  WHERE is_primary = true;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- Users can only see their own addresses
CREATE POLICY "Users can view own addresses" ON addresses
  FOR ALL USING (auth.uid() = profile_id);

-- Additional customer read policy
CREATE POLICY "customer_read_addresses" ON addresses
  FOR SELECT USING (profile_id = auth.uid());

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_addresses_updated_at 
  BEFORE UPDATE ON addresses 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- AUTOMATIC ADDRESS CREATION FROM AUTH
-- ============================================================================
-- Function to automatically create addresses when new users sign up
CREATE OR REPLACE FUNCTION public.handle_new_user_address()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.raw_user_meta_data ? 'street_address' THEN
    INSERT INTO public.addresses (
      profile_id,
      line1,
      suburb,
      city,
      postal_code,
      is_primary
    )
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'street_address',
      NEW.raw_user_meta_data->>'suburb',
      NEW.raw_user_meta_data->>'city',
      NEW.raw_user_meta_data->>'postal_code',
      true
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_address_created ON auth.users;

-- Create trigger to automatically create addresses for new users
CREATE TRIGGER on_auth_user_address_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_address();

-- ============================================================================
-- SAMPLE DATA (OPTIONAL - FOR TESTING)
-- ============================================================================
-- Uncomment these lines to insert test addresses
/*
INSERT INTO addresses (profile_id, line1, suburb, city, postal_code, lat, lng, is_primary) VALUES
  ('550e8400-e29b-41d4-a716-446655440003', '123 Main Street', 'Sandton', 'Johannesburg', '2196', -26.1087, 28.0567, true),
  ('550e8400-e29b-41d4-a716-446655440003', '456 Oak Avenue', 'Rosebank', 'Johannesburg', '2196', -26.1420, 28.0444, false),
  ('550e8400-e29b-41d4-a716-446655440002', '789 Collector Road', 'Midrand', 'Johannesburg', '1685', -25.9964, 28.1373, true);
*/

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE addresses IS 'Address table supporting multiple addresses per profile with geolocation';
COMMENT ON COLUMN addresses.lat IS 'Latitude coordinate for GPS location';
COMMENT ON COLUMN addresses.lng IS 'Longitude coordinate for GPS location';
COMMENT ON COLUMN addresses.is_primary IS 'Whether this is the primary address for the profile';
