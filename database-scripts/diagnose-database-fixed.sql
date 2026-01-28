-- ============================================================================
-- DATABASE DIAGNOSTIC SCRIPT (FIXED VERSION)
-- ============================================================================
-- Run this in your Supabase SQL Editor to diagnose the current state

-- Check if tables exist and their structure
SELECT 
  table_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name) 
    THEN 'EXISTS' 
    ELSE 'MISSING' 
  END as table_status
FROM (VALUES 
  ('profiles'),
  ('materials'),
  ('addresses'),
  ('pickups'),
  ('pickup_items'),
  ('pickup_photos'),
  ('wallets'),
  ('payments'),
  ('withdrawals'),
  ('collector_assignments'),
  ('collector_schedules'),
  ('notifications'),
  ('user_activity_log'),
  ('system_logs'),
  ('app_settings'),
  ('email_templates')
) AS t(table_name);

-- Check profiles table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Check pickups table structure (if it exists)
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'pickups'
ORDER BY ordinal_position;

-- Check if any policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check if any triggers exist
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgfname as function_name
FROM pg_trigger 
WHERE tgrelid::regnamespace::name = 'public'
ORDER BY table_name, trigger_name;

-- Check if any functions exist
SELECT 
  proname as function_name,
  prosrc as source_code
FROM pg_proc 
WHERE pronamespace::regnamespace::name = 'public'
ORDER BY proname;

-- Check current user and permissions
SELECT current_user, current_database();

-- Check if RLS is enabled on tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
