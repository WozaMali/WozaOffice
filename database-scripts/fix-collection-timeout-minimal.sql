-- ============================================================================
-- MINIMAL COLLECTION TIMEOUT FIX
-- ============================================================================
-- This script adds only the essential indexes to prevent timeout issues
-- Run this in your Supabase SQL Editor

-- Add essential indexes for performance
CREATE INDEX IF NOT EXISTS idx_unified_collections_customer_id ON unified_collections(customer_id);
CREATE INDEX IF NOT EXISTS idx_unified_collections_collector_id ON unified_collections(collector_id);
CREATE INDEX IF NOT EXISTS idx_unified_collections_status ON unified_collections(status);
CREATE INDEX IF NOT EXISTS idx_unified_collections_created_at ON unified_collections(created_at);

CREATE INDEX IF NOT EXISTS idx_collection_materials_collection_id ON collection_materials(collection_id);

CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);

CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);

-- Update table statistics
ANALYZE unified_collections;
ANALYZE collection_materials;
ANALYZE user_profiles;
ANALYZE user_addresses;

-- Set timeout settings
SET statement_timeout = '30s';
SET lock_timeout = '10s';

-- Success message
SELECT 'Essential indexes created successfully!' as status;
