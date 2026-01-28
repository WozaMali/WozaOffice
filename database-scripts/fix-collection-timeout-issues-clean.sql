-- ============================================================================
-- FIX COLLECTION TIMEOUT ISSUES
-- ============================================================================
-- This script optimizes the database to prevent timeout issues during collection saves
-- Run this in your Supabase SQL Editor

-- 1. Add indexes to improve query performance
-- ============================================================================

-- Index for unified_collections table
CREATE INDEX IF NOT EXISTS idx_unified_collections_customer_id ON unified_collections(customer_id);
CREATE INDEX IF NOT EXISTS idx_unified_collections_collector_id ON unified_collections(collector_id);
CREATE INDEX IF NOT EXISTS idx_unified_collections_status ON unified_collections(status);
CREATE INDEX IF NOT EXISTS idx_unified_collections_created_at ON unified_collections(created_at);
CREATE INDEX IF NOT EXISTS idx_unified_collections_collection_code ON unified_collections(collection_code);

-- Index for collection_materials table
CREATE INDEX IF NOT EXISTS idx_collection_materials_collection_id ON collection_materials(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_materials_material_name ON collection_materials(material_name);

-- Index for user_profiles table (if not exists)
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status) WHERE status = 'active';

-- Index for user_addresses table (if not exists)
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_active ON user_addresses(user_id, is_active) WHERE is_active = true;

-- 2. Optimize table statistics
-- ============================================================================

-- Update table statistics to help query planner
ANALYZE unified_collections;
ANALYZE collection_materials;
ANALYZE user_profiles;
ANALYZE user_addresses;

-- 3. Create optimized function for collection creation
-- ============================================================================

CREATE OR REPLACE FUNCTION create_collection_with_materials(
  p_customer_id UUID,
  p_customer_name TEXT,
  p_customer_phone TEXT DEFAULT NULL,
  p_customer_email TEXT DEFAULT NULL,
  p_pickup_address_id UUID DEFAULT NULL,
  p_pickup_address TEXT,
  p_pickup_coordinates TEXT DEFAULT NULL,
  p_collector_id UUID DEFAULT NULL,
  p_collector_name TEXT DEFAULT NULL,
  p_collector_phone TEXT DEFAULT NULL,
  p_materials JSONB,
  p_customer_notes TEXT DEFAULT NULL,
  p_collector_notes TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'pending',
  p_priority TEXT DEFAULT 'normal',
  p_created_by UUID DEFAULT NULL,
  p_updated_by UUID DEFAULT NULL
) RETURNS TABLE(
  collection_id UUID,
  collection_code TEXT,
  total_weight_kg DECIMAL(10,2),
  total_value DECIMAL(12,2),
  material_count INTEGER
) AS $$
DECLARE
  v_collection_id UUID;
  v_collection_code TEXT;
  v_total_weight DECIMAL(10,2) := 0;
  v_total_value DECIMAL(12,2) := 0;
  v_material_count INTEGER;
  v_material JSONB;
  v_year INTEGER;
BEGIN
  -- Generate collection code
  v_year := EXTRACT(YEAR FROM NOW());
  v_collection_code := 'COL-' || v_year || '-' || LPAD(EXTRACT(EPOCH FROM NOW())::TEXT, 10, '0');
  
  -- Calculate totals from materials
  v_material_count := jsonb_array_length(p_materials);
  FOR v_material IN SELECT * FROM jsonb_array_elements(p_materials)
  LOOP
    v_total_weight := v_total_weight + COALESCE((v_material->>'quantity')::DECIMAL, 0);
    v_total_value := v_total_value + COALESCE((v_material->>'quantity')::DECIMAL * (v_material->>'unit_price')::DECIMAL, 0);
  END LOOP;
  
  -- Create collection
  INSERT INTO unified_collections (
    collection_code,
    collection_type,
    customer_id,
    customer_name,
    customer_phone,
    customer_email,
    pickup_address_id,
    pickup_address,
    pickup_coordinates,
    collector_id,
    collector_name,
    collector_phone,
    total_weight_kg,
    total_value,
    material_count,
    status,
    priority,
    customer_notes,
    collector_notes,
    created_by,
    updated_by
  ) VALUES (
    v_collection_code,
    'pickup',
    p_customer_id,
    p_customer_name,
    p_customer_phone,
    p_customer_email,
    p_pickup_address_id,
    p_pickup_address,
    p_pickup_coordinates,
    p_collector_id,
    p_collector_name,
    p_collector_phone,
    v_total_weight,
    v_total_value,
    v_material_count,
    p_status,
    p_priority,
    p_customer_notes,
    p_collector_notes,
    p_created_by,
    p_updated_by
  ) RETURNING id INTO v_collection_id;
  
  -- Insert materials in batch
  INSERT INTO collection_materials (
    collection_id,
    material_name,
    material_category,
    quantity,
    unit,
    unit_price,
    quality_rating,
    contamination_pct,
    condition_notes
  )
  SELECT 
    v_collection_id,
    material->>'material_name',
    COALESCE(material->>'material_category', 'general'),
    (material->>'quantity')::DECIMAL,
    COALESCE(material->>'unit', 'kg'),
    (material->>'unit_price')::DECIMAL,
    (material->>'quality_rating')::INTEGER,
    COALESCE((material->>'contamination_pct')::DECIMAL, 0),
    material->>'condition_notes'
  FROM jsonb_array_elements(p_materials) AS material;
  
  -- Return results
  RETURN QUERY SELECT 
    v_collection_id,
    v_collection_code,
    v_total_weight,
    v_total_value,
    v_material_count;
END;
$$ LANGUAGE plpgsql;

-- 4. Grant necessary permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION create_collection_with_materials TO authenticated;
GRANT EXECUTE ON FUNCTION create_collection_with_materials TO anon;

-- 5. Create optimized view for collection performance
-- ============================================================================

CREATE OR REPLACE VIEW collection_performance_view AS
SELECT 
  uc.id,
  uc.collection_code,
  uc.customer_id,
  uc.customer_name,
  uc.collector_id,
  uc.collector_name,
  uc.total_weight_kg,
  uc.total_value,
  uc.material_count,
  uc.status,
  uc.priority,
  uc.created_at,
  uc.updated_at,
  COUNT(cm.id) as actual_material_count,
  COALESCE(SUM(cm.quantity), 0) as actual_total_weight,
  COALESCE(SUM(cm.quantity * cm.unit_price), 0) as actual_total_value
FROM unified_collections uc
LEFT JOIN collection_materials cm ON uc.id = cm.collection_id
GROUP BY uc.id, uc.collection_code, uc.customer_id, uc.customer_name, 
         uc.collector_id, uc.collector_name, uc.total_weight_kg, uc.total_value, 
         uc.material_count, uc.status, uc.priority, uc.created_at, uc.updated_at;

-- Grant permissions on the view
GRANT SELECT ON collection_performance_view TO authenticated;
GRANT SELECT ON collection_performance_view TO anon;

-- 6. Optimize connection settings (if possible)
-- ============================================================================

-- Note: These settings may need to be applied at the database level
-- and might require superuser privileges

-- Set statement timeout to 30 seconds for this session
SET statement_timeout = '30s';

-- Set lock timeout to 10 seconds
SET lock_timeout = '10s';

-- Set idle in transaction timeout to 60 seconds
SET idle_in_transaction_session_timeout = '60s';

-- 7. Create monitoring query for timeout issues
-- ============================================================================

CREATE OR REPLACE FUNCTION check_collection_performance()
RETURNS TABLE(
  metric_name TEXT,
  metric_value TEXT,
  recommendation TEXT
) AS $$
BEGIN
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

-- 8. Final verification
-- ============================================================================

-- Test the optimized function
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
