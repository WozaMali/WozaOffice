-- ============================================================================
-- CHECK WALLET_TRANSACTIONS TABLE STRUCTURE
-- ============================================================================
-- This script checks the actual structure of the wallet_transactions table

-- Step 1: Check if table exists
SELECT '=== TABLE EXISTS CHECK ===' as step;
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wallet_transactions' AND table_schema = 'public')
        THEN 'wallet_transactions table EXISTS'
        ELSE 'wallet_transactions table DOES NOT EXIST'
    END as table_status;

-- Step 2: Get actual column structure
SELECT '=== ACTUAL COLUMN STRUCTURE ===' as step;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'wallet_transactions' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 3: Check RLS status
SELECT '=== RLS STATUS ===' as step;
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    hasrules as has_rules
FROM pg_tables 
WHERE tablename = 'wallet_transactions' 
AND schemaname = 'public';

-- Step 4: Check existing policies
SELECT '=== EXISTING POLICIES ===' as step;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'wallet_transactions' 
AND schemaname = 'public'
ORDER BY policyname;

-- Step 5: Sample data (if any exists)
SELECT '=== SAMPLE DATA ===' as step;
SELECT 
    id, 
    user_id, 
    amount, 
    points, 
    source_id, 
    created_at
FROM wallet_transactions 
ORDER BY created_at DESC 
LIMIT 3;

-- Step 6: Check permissions
SELECT '=== TABLE PERMISSIONS ===' as step;
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'wallet_transactions' 
AND table_schema = 'public'
ORDER BY grantee, privilege_type;
