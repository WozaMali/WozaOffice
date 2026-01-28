-- ============================================================================
-- TEST DIRECT DELETION - VERIFY RLS POLICIES ARE WORKING
-- ============================================================================
-- Run this in Supabase SQL Editor to test if deletion actually works

-- Step 1: Check if RLS policies exist
SELECT '=== CHECKING RLS POLICIES ===' as step;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'wallet_transactions' 
AND schemaname = 'public'
ORDER BY policyname;

-- Step 2: Check table permissions
SELECT '=== CHECKING TABLE PERMISSIONS ===' as step;
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'wallet_transactions' 
AND table_schema = 'public'
ORDER BY grantee, privilege_type;

-- Step 3: Check current transactions
SELECT '=== CURRENT TRANSACTIONS ===' as step;
SELECT 
    id, 
    user_id, 
    amount, 
    points, 
    source_id, 
    created_at
FROM wallet_transactions 
ORDER BY created_at DESC 
LIMIT 5;

-- Step 4: Test deletion (replace with actual transaction ID)
-- WARNING: This will actually delete a transaction!
-- SELECT '=== TESTING DELETION ===' as step;
-- DELETE FROM wallet_transactions 
-- WHERE id = 'REPLACE_WITH_ACTUAL_TRANSACTION_ID'
-- RETURNING id, transaction_type, amount;

-- Step 5: Check if RLS is enabled
SELECT '=== CHECKING RLS STATUS ===' as step;
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    hasrls
FROM pg_tables 
WHERE tablename = 'wallet_transactions' 
AND schemaname = 'public';

-- Step 6: Check current user context
SELECT '=== CURRENT USER CONTEXT ===' as step;
SELECT 
    current_user as current_user,
    session_user as session_user,
    current_setting('role') as current_role;
