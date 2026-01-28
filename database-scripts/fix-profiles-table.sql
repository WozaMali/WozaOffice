-- ============================================================================
-- FIX PROFILES TABLE AND INSERT REAL COLLECTOR DATA
-- ============================================================================
-- Run this script to fix the profiles table and add your real collector

-- First, let's check if the profiles table exists and has the right structure
DO $$
BEGIN
    -- Check if profiles table exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
        -- Create the profiles table if it doesn't exist
        CREATE TABLE profiles (
            id uuid primary key default uuid_generate_v4(),
            email text unique not null,
            full_name text,
            phone text unique,
            role text not null check (role in ('customer','collector','admin')),
            is_active boolean not null default true,
            created_at timestamptz default now()
        );
        
        -- Create indexes
        CREATE INDEX idx_profiles_email ON profiles(email);
        CREATE INDEX idx_profiles_role ON profiles(role);
        CREATE INDEX idx_profiles_active ON profiles(is_active);
        
        RAISE NOTICE 'Profiles table created successfully';
    ELSE
        RAISE NOTICE 'Profiles table already exists';
        
        -- Ensure unique constraints exist
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_email_key') THEN
            ALTER TABLE profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
            RAISE NOTICE 'Added unique constraint on email';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_phone_key') THEN
            ALTER TABLE profiles ADD CONSTRAINT profiles_phone_key UNIQUE (phone);
            RAISE NOTICE 'Added unique constraint on phone';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- INSERT YOUR REAL COLLECTOR DATA
-- ============================================================================

-- Option 1: Insert with explicit UUID (recommended)
INSERT INTO profiles (id, email, full_name, phone, role, is_active) VALUES
  (uuid_generate_v4(), 'dumisani@wozamali.co.za', 'Dumisani Dlamini', '+27722126004', 'collector', true)
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- Option 2: If you want to use a specific UUID (uncomment and modify)
/*
INSERT INTO profiles (id, email, full_name, phone, role, is_active) VALUES
  ('123e4567-e89b-12d3-a456-426614174000', 'dumisani@wozamali.co.za', 'Dumisani Dlamini', '+27722126004', 'collector', true)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;
*/

-- ============================================================================
-- VERIFY THE INSERTION
-- ============================================================================

-- Check if your collector was inserted
SELECT 
  id,
  email,
  full_name,
  phone,
  role,
  is_active,
  created_at
FROM profiles 
WHERE email = 'dumisani@wozamali.co.za';

-- ============================================================================
-- UPDATE YOUR APPLICATION CONFIGURATION
-- ============================================================================

-- After running this script, update your collector-config.ts file:
-- 1. Change ACTIVE_CONFIG from DEMO_CONFIG to REAL_COLLECTOR_CONFIG
-- 2. Set the email to 'dumisani@wozamali.co.za'
-- 3. Or copy the UUID from the SELECT query above and set it as the id

-- Example configuration:
/*
export const REAL_COLLECTOR_CONFIG: CollectorConfig = {
  useDemoData: false,
  demoCollectorId: '',
  realCollector: {
    email: 'dumisani@wozamali.co.za'
    // id: '123e4567-e89b-12d3-a456-426614174000' // optional - use the UUID from above
  }
};

export const ACTIVE_CONFIG = REAL_COLLECTOR_CONFIG;
*/
