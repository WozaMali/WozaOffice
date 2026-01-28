-- ============================================================================
-- SIMPLE INSERT COLLECTOR DATA
-- ============================================================================
-- Use this script if you're having constraint issues

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Simple insert - just add the collector
INSERT INTO profiles (id, email, full_name, phone, role, is_active) VALUES
  (uuid_generate_v4(), 'dumisani@wozamali.co.za', 'Dumisani Dlamini', '+27722126004', 'collector', true);

-- Verify the insertion
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
-- ALTERNATIVE: INSERT WITHOUT ID (let database generate it)
-- ============================================================================
-- If the above doesn't work, try this simpler version:

/*
INSERT INTO profiles (email, full_name, phone, role, is_active) VALUES
  ('dumisani@wozamani.co.za', 'Dumisani Dlamini', '+27722126004', 'collector', true);
*/
