-- ============================================================================
-- OPTIMIZE COLLECTIONS QUERY PERFORMANCE
-- ============================================================================
-- This script optimizes the database to prevent query timeout issues
-- Run this in your Supabase SQL Editor

-- Step 1: Create comprehensive indexes for unified_collections
-- ============================================================================

-- Primary index for ordering by created_at (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_unified_collections_created_at_desc 
ON unified_collections(created_at DESC NULLS LAST);

-- Composite index for status filtering with date ordering
CREATE INDEX IF NOT EXISTS idx_unified_collections_status_created_at 
ON unified_collections(status, created_at DESC);

-- Index for customer lookups
CREATE INDEX IF NOT EXISTS idx_unified_collections_customer_id 
ON unified_collections(customer_id) 
WHERE customer_id IS NOT NULL;

-- Index for collector lookups
CREATE INDEX IF NOT EXISTS idx_unified_collections_collector_id 
ON unified_collections(collector_id) 
WHERE collector_id IS NOT NULL;

-- Index for collection_code lookups (if used for filtering)
CREATE INDEX IF NOT EXISTS idx_unified_collections_collection_code 
ON unified_collections(collection_code) 
WHERE collection_code IS NOT NULL;

-- Index for pickup_address_id
CREATE INDEX IF NOT EXISTS idx_unified_collections_pickup_address_id 
ON unified_collections(pickup_address_id) 
WHERE pickup_address_id IS NOT NULL;

-- Step 2: Analyze tables to update query planner statistics
-- ============================================================================
ANALYZE unified_collections;

-- Step 3: Check for missing indexes and report
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'unified_collections'
  AND schemaname = 'public'
ORDER BY indexname;

-- Step 4: Verify index usage (run after some queries)
-- ============================================================================
-- This query shows which indexes are being used
-- Run this periodically to ensure indexes are effective
SELECT 
  schemaname,
  relname as tablename,
  indexrelname as indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE relname = 'unified_collections'
ORDER BY idx_scan DESC;

-- Step 5: Set query timeout (optional - helps prevent runaway queries)
-- ============================================================================
-- Note: This affects the current session only
-- For permanent changes, update postgresql.conf or use ALTER DATABASE
SET statement_timeout = '60s';

-- Success message
SELECT '✅ Collections query performance optimization completed!' as status;
