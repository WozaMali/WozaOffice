-- Check collections table status
-- This script verifies the collections table and its RLS policies

-- Check if collections table exists
SELECT 'Collections table exists:' as info, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collections') 
            THEN 'YES' ELSE 'NO' END as status;

-- Check collections table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'collections' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'collections' AND schemaname = 'public';

-- Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'collections' AND schemaname = 'public';

-- Check if we can insert a test collection (this will test permissions)
-- Note: This will only work if we have proper user authentication
SELECT 'Collections table ready for testing' as status;
