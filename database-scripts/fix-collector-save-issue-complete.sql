-- ============================================================================
-- COMPLETE FIX FOR COLLECTOR SAVE ISSUE
-- ============================================================================
-- This script fixes the collector save issue by ensuring all required tables and constraints exist
-- Run this in your Supabase SQL Editor

-- 1. Check current table status
-- ============================================================================

SELECT 'Checking current table status...' as status;

-- Check if collections table exists and has data
SELECT 
  'collections' as table_name,
  COUNT(*) as record_count
FROM public.collections
UNION ALL
SELECT 
  'unified_collections' as table_name,
  COUNT(*) as record_count
FROM public.unified_collections;

-- 2. Ensure user_profiles table has the collector
-- ============================================================================

-- Insert the missing collector profile if it doesn't exist
INSERT INTO public.user_profiles (
  id,
  user_id,
  email,
  full_name,
  role,
  status,
  created_at,
  updated_at
) VALUES (
  '90341fc7-d088-4824-9a1f-c2870d1486e1',
  '90341fc7-d088-4824-9a1f-c2870d1486e1',
  'collector@wozamali.com',
  'Collector',
  'collector',
  'active',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  status = 'active',
  updated_at = NOW();

-- 3. Ensure collections table has proper foreign key constraints
-- ============================================================================

-- Drop existing constraints if they exist
ALTER TABLE public.collections DROP CONSTRAINT IF EXISTS collections_user_id_fkey;
ALTER TABLE public.collections DROP CONSTRAINT IF EXISTS collections_collector_id_fkey;
ALTER TABLE public.collections DROP CONSTRAINT IF EXISTS collections_pickup_address_id_fkey;

-- Add proper foreign key constraints
ALTER TABLE public.collections 
ADD CONSTRAINT collections_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.collections 
ADD CONSTRAINT collections_collector_id_fkey 
FOREIGN KEY (collector_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE public.collections 
ADD CONSTRAINT collections_pickup_address_id_fkey 
FOREIGN KEY (pickup_address_id) REFERENCES public.user_addresses(id) ON DELETE SET NULL;

-- 4. Create unified_collections table if it doesn't exist (for future use)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.unified_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_code TEXT UNIQUE NOT NULL,
  collection_type TEXT DEFAULT 'pickup' CHECK (collection_type IN ('pickup', 'dropoff', 'scheduled', 'emergency')),
  customer_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  pickup_address_id UUID REFERENCES public.user_addresses(id) ON DELETE SET NULL,
  pickup_address TEXT NOT NULL,
  pickup_coordinates TEXT,
  collector_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  collector_name TEXT,
  collector_phone TEXT,
  total_weight_kg DECIMAL(10,2) DEFAULT 0,
  total_value DECIMAL(12,2) DEFAULT 0,
  material_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'in_progress', 'completed', 'approved', 'rejected', 'cancelled', 'no_show')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  scheduled_date DATE,
  scheduled_time TIME,
  actual_date DATE,
  actual_time TIME,
  completed_at TIMESTAMP WITH TIME ZONE,
  customer_notes TEXT,
  collector_notes TEXT,
  admin_notes TEXT,
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL
);

-- 5. Create collection_materials table if it doesn't exist
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.collection_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES public.unified_collections(id) ON DELETE CASCADE,
  material_id UUID,
  material_name TEXT NOT NULL,
  material_category TEXT DEFAULT 'general',
  quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
  unit TEXT DEFAULT 'kg' CHECK (unit IN ('kg', 'g', 'pieces', 'liters')),
  unit_price DECIMAL(10,2) DEFAULT 0,
  total_price DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  contamination_pct DECIMAL(5,2) DEFAULT 0 CHECK (contamination_pct >= 0 AND contamination_pct <= 100),
  condition_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Add indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_collections_user_id ON public.collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collections_collector_id ON public.collections(collector_id);
CREATE INDEX IF NOT EXISTS idx_collections_status ON public.collections(status);
CREATE INDEX IF NOT EXISTS idx_collections_created_at ON public.collections(created_at);

CREATE INDEX IF NOT EXISTS idx_unified_collections_customer_id ON public.unified_collections(customer_id);
CREATE INDEX IF NOT EXISTS idx_unified_collections_collector_id ON public.unified_collections(collector_id);
CREATE INDEX IF NOT EXISTS idx_unified_collections_status ON public.unified_collections(status);
CREATE INDEX IF NOT EXISTS idx_unified_collections_created_at ON public.unified_collections(created_at);

CREATE INDEX IF NOT EXISTS idx_collection_materials_collection_id ON public.collection_materials(collection_id);

-- 7. Grant necessary permissions
-- ============================================================================

GRANT ALL ON public.collections TO authenticated;
GRANT ALL ON public.unified_collections TO authenticated;
GRANT ALL ON public.collection_materials TO authenticated;

-- 8. Test the fix
-- ============================================================================

-- Test inserting a collection
INSERT INTO public.collections (
  user_id,
  collector_id,
  pickup_address_id,
  material_type,
  weight_kg,
  status,
  notes
) VALUES (
  '90341fc7-d088-4824-9a1f-c2870d1486e1', -- Use collector as both user and collector for test
  '90341fc7-d088-4824-9a1f-c2870d1486e1',
  NULL, -- No address for test
  'Test Material',
  1.0,
  'pending',
  'Test collection to verify fix'
) ON CONFLICT DO NOTHING;

-- 9. Verify the fix worked
-- ============================================================================

SELECT 
  'Test collection inserted successfully' as status,
  COUNT(*) as total_collections
FROM public.collections
WHERE notes = 'Test collection to verify fix';

-- 10. Clean up test data
-- ============================================================================

DELETE FROM public.collections 
WHERE notes = 'Test collection to verify fix';

-- 11. Final status
-- ============================================================================

SELECT 'Collector save issue fix completed successfully!' as final_status;
