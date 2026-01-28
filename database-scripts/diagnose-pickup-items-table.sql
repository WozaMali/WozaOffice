-- ============================================================================
-- DIAGNOSE PICKUP_ITEMS TABLE STRUCTURE
-- ============================================================================
-- Run this in your Supabase SQL Editor to see what's actually in your database

-- Check if the table exists
SELECT 'CHECKING IF PICKUP_ITEMS TABLE EXISTS' as check_type;
SELECT 
    table_name,
    table_schema
FROM information_schema.tables 
WHERE table_name = 'pickup_items';

-- Check the actual table structure
SELECT 'PICKUP_ITEMS TABLE STRUCTURE' as check_type;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'pickup_items'
ORDER BY ordinal_position;

-- Check if there are any constraints
SELECT 'PICKUP_ITEMS CONSTRAINTS' as check_type;
SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_schema = 'public' AND table_name = 'pickup_items';

-- Check RLS policies
SELECT 'PICKUP_ITEMS RLS POLICIES' as check_type;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'pickup_items';

-- Check if there are any existing records
SELECT 'EXISTING PICKUP_ITEMS RECORDS' as check_type;
SELECT COUNT(*) as total_records FROM pickup_items;

-- Check sample data if any exists
SELECT 'SAMPLE PICKUP_ITEMS DATA' as check_type;
SELECT * FROM pickup_items LIMIT 3;

-- Check if the referenced tables exist
SELECT 'REFERENCED TABLES CHECK' as check_type;
SELECT 
    'pickups' as table_name,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'pickups') as exists
UNION ALL
SELECT 
    'materials' as table_name,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'materials') as exists;

-- Check if there are any pickups to reference
SELECT 'EXISTING PICKUPS' as check_type;
SELECT COUNT(*) as total_pickups FROM pickups;

-- Check if there are any materials to reference
SELECT 'EXISTING MATERIALS' as check_type;
SELECT COUNT(*) as total_materials FROM materials;
