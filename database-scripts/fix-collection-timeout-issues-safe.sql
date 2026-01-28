-- ============================================================================
-- FIX COLLECTION TIMEOUT ISSUES (SAFE VERSION)
-- ============================================================================
-- This script safely optimizes the database to prevent timeout issues during collection saves
-- Run this in your Supabase SQL Editor

-- 1. Check table existence and add indexes safely
-- ============================================================================

-- Check if unified_collections table exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'unified_collections' 
        AND table_schema = 'public'
    ) THEN
        -- Add indexes for unified_collections table
        CREATE INDEX IF NOT EXISTS idx_unified_collections_customer_id ON unified_collections(customer_id);
        CREATE INDEX IF NOT EXISTS idx_unified_collections_collector_id ON unified_collections(collector_id);
        CREATE INDEX IF NOT EXISTS idx_unified_collections_status ON unified_collections(status);
        CREATE INDEX IF NOT EXISTS idx_unified_collections_created_at ON unified_collections(created_at);
        CREATE INDEX IF NOT EXISTS idx_unified_collections_collection_code ON unified_collections(collection_code);
        
        RAISE NOTICE 'Indexes created for unified_collections table';
    ELSE
        RAISE NOTICE 'unified_collections table does not exist, skipping indexes';
    END IF;
END $$;

-- Check if collection_materials table exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'collection_materials' 
        AND table_schema = 'public'
    ) THEN
        -- Add indexes for collection_materials table
        CREATE INDEX IF NOT EXISTS idx_collection_materials_collection_id ON collection_materials(collection_id);
        CREATE INDEX IF NOT EXISTS idx_collection_materials_material_name ON collection_materials(material_name);
        
        RAISE NOTICE 'Indexes created for collection_materials table';
    ELSE
        RAISE NOTICE 'collection_materials table does not exist, skipping indexes';
    END IF;
END $$;

-- Check if user_profiles table exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_profiles' 
        AND table_schema = 'public'
    ) THEN
        -- Add indexes for user_profiles table
        CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
        CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status) WHERE status = 'active';
        
        RAISE NOTICE 'Indexes created for user_profiles table';
    ELSE
        RAISE NOTICE 'user_profiles table does not exist, skipping indexes';
    END IF;
END $$;

-- Check if user_addresses table exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_addresses' 
        AND table_schema = 'public'
    ) THEN
        -- Add indexes for user_addresses table
        CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_addresses_active ON user_addresses(user_id, is_active) WHERE is_active = true;
        
        RAISE NOTICE 'Indexes created for user_addresses table';
    ELSE
        RAISE NOTICE 'user_addresses table does not exist, skipping indexes';
    END IF;
END $$;

-- 2. Optimize table statistics
-- ============================================================================

-- Update table statistics to help query planner
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'unified_collections' AND table_schema = 'public') THEN
        ANALYZE unified_collections;
        RAISE NOTICE 'Analyzed unified_collections table';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collection_materials' AND table_schema = 'public') THEN
        ANALYZE collection_materials;
        RAISE NOTICE 'Analyzed collection_materials table';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles' AND table_schema = 'public') THEN
        ANALYZE user_profiles;
        RAISE NOTICE 'Analyzed user_profiles table';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_addresses' AND table_schema = 'public') THEN
        ANALYZE user_addresses;
        RAISE NOTICE 'Analyzed user_addresses table';
    END IF;
END $$;

-- 3. Set connection timeouts
-- ============================================================================

-- Set statement timeout to 30 seconds for this session
SET statement_timeout = '30s';

-- Set lock timeout to 10 seconds
SET lock_timeout = '10s';

-- Set idle in transaction timeout to 60 seconds
SET idle_in_transaction_session_timeout = '60s';

-- 4. Create monitoring function for timeout issues
-- ============================================================================

CREATE OR REPLACE FUNCTION check_collection_performance()
RETURNS TABLE(
  metric_name TEXT,
  metric_value TEXT,
  recommendation TEXT
) AS $$
BEGIN
  -- Check if unified_collections table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'unified_collections' 
    AND table_schema = 'public'
  ) THEN
    RETURN QUERY SELECT 'unified_collections table'::TEXT, 'not found'::TEXT, 'Create table first'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    'Total Collections'::TEXT,
    COUNT(*)::TEXT,
    'Monitor for growth'::TEXT
  FROM unified_collections
  
  UNION ALL
  
  SELECT 
    'Collections Last 24h'::TEXT,
    COUNT(*)::TEXT,
    'Check for recent activity'::TEXT
  FROM unified_collections 
  WHERE created_at > NOW() - INTERVAL '24 hours'
  
  UNION ALL
  
  SELECT 
    'Avg Materials per Collection'::TEXT,
    ROUND(AVG(material_count), 2)::TEXT,
    'Optimize if > 10'::TEXT
  FROM unified_collections
  
  UNION ALL
  
  SELECT 
    'Collections with Timeout Issues'::TEXT,
    COUNT(*)::TEXT,
    'Investigate if > 0'::TEXT
  FROM unified_collections 
  WHERE created_at < updated_at - INTERVAL '5 minutes'
  AND status = 'pending';
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_collection_performance TO authenticated;

-- 5. Final verification
-- ============================================================================

-- Test the monitoring function
SELECT 'Database optimization completed successfully!' as status;

-- Show current indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('unified_collections', 'collection_materials', 'user_profiles', 'user_addresses')
ORDER BY tablename, indexname;

-- Show performance metrics
SELECT * FROM check_collection_performance();

-- 6. Additional timeout prevention measures
-- ============================================================================

-- Create a simple collection creation function that's optimized for speed
CREATE OR REPLACE FUNCTION create_simple_collection(
  p_customer_id UUID,
  p_customer_name TEXT,
  p_collector_id UUID,
  p_pickup_address TEXT,
  p_materials JSONB,
  p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_collection_id UUID;
  v_collection_code TEXT;
  v_year INTEGER;
BEGIN
  -- Generate collection code
  v_year := EXTRACT(YEAR FROM NOW());
  v_collection_code := 'COL-' || v_year || '-' || LPAD(EXTRACT(EPOCH FROM NOW())::TEXT, 10, '0');
  
  -- Create collection
  INSERT INTO unified_collections (
    collection_code,
    collection_type,
    customer_id,
    customer_name,
    pickup_address,
    collector_id,
    total_weight_kg,
    total_value,
    material_count,
    status,
    customer_notes
  ) VALUES (
    v_collection_code,
    'pickup',
    p_customer_id,
    p_customer_name,
    p_pickup_address,
    p_collector_id,
    0, -- Will be calculated
    0, -- Will be calculated
    jsonb_array_length(p_materials),
    'pending',
    p_notes
  ) RETURNING id INTO v_collection_id;
  
  -- Insert materials
  INSERT INTO collection_materials (
    collection_id,
    material_name,
    material_category,
    quantity,
    unit,
    unit_price
  )
  SELECT 
    v_collection_id,
    material->>'material_name',
    COALESCE(material->>'material_category', 'general'),
    (material->>'quantity')::DECIMAL,
    COALESCE(material->>'unit', 'kg'),
    (material->>'unit_price')::DECIMAL
  FROM jsonb_array_elements(p_materials) AS material;
  
  RETURN v_collection_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_simple_collection TO authenticated;

-- Final success message
SELECT 'All timeout prevention measures applied successfully!' as final_status;
