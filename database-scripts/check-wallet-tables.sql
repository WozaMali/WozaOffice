-- Check what wallet-related tables exist in the database

-- 1. List all tables that contain 'wallet' in the name
SELECT 'WALLET_TABLES' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%wallet%'
ORDER BY table_name;

-- 2. List all tables that contain 'queue' in the name
SELECT 'QUEUE_TABLES' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%queue%'
ORDER BY table_name;

-- 3. List all tables that contain 'update' in the name
SELECT 'UPDATE_TABLES' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%update%'
ORDER BY table_name;

-- 4. Check if wallet_update_queue exists specifically
SELECT 'WALLET_UPDATE_QUEUE_CHECK' as info;
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'wallet_update_queue'
) as wallet_update_queue_exists;

-- 5. List all tables in the public schema
SELECT 'ALL_PUBLIC_TABLES' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
