-- Check the structure of unified_collections table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'unified_collections' 
ORDER BY column_name;

-- Check if there are any existing records
SELECT COUNT(*) as record_count FROM unified_collections;
