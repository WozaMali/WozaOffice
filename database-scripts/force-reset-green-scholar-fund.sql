-- ============================================================================
-- FORCE RESET GREEN SCHOLAR FUND TO ZERO
-- ============================================================================
-- This script aggressively resets the Green Scholar Fund to zero
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- STEP 1: CLEAR ALL TRANSACTION DATA
-- ============================================================================

-- Clear all Green Scholar transactions
DELETE FROM green_scholar_transactions;

-- Clear all user donations
DELETE FROM user_donations;

-- Clear any collection contributions (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'collection_green_scholar_contributions') THEN
        DELETE FROM collection_green_scholar_contributions;
        RAISE NOTICE 'Cleared collection_green_scholar_contributions';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: FORCE RESET THE FUND BALANCE
-- ============================================================================

-- Try to reset the fund balance directly (if it's a table)
DO $$
BEGIN
    -- Check if it's a table we can update
    IF EXISTS (
        SELECT FROM information_schema.tables t 
        WHERE t.table_name = 'green_scholar_fund_balance' 
        AND t.table_type = 'BASE TABLE'
    ) THEN
        -- Delete all records
        DELETE FROM green_scholar_fund_balance;
        
        -- Insert zero record
        INSERT INTO green_scholar_fund_balance (
            total_balance,
            pet_donations_total,
            direct_donations_total,
            expenses_total,
            last_updated
        ) VALUES (
            0.00,
            0.00,
            0.00,
            0.00,
            NOW()
        );
        
        RAISE NOTICE 'Force reset green_scholar_fund_balance table to zero';
    ELSE
        RAISE NOTICE 'green_scholar_fund_balance is a view - balance should be zero after clearing transactions';
    END IF;
END $$;

-- ============================================================================
-- STEP 3: CHECK FOR OTHER POTENTIAL SOURCES
-- ============================================================================

-- Check if there are any other tables that might have fund data
DO $$
DECLARE
    table_name TEXT;
    query_text TEXT;
BEGIN
    -- Look for any tables with fund-related columns
    FOR table_name IN 
        SELECT DISTINCT t.table_name
        FROM information_schema.tables t
        JOIN information_schema.columns c ON t.table_name = c.table_name
        WHERE c.column_name LIKE '%green%' 
           OR c.column_name LIKE '%scholar%' 
           OR c.column_name LIKE '%fund%'
           OR c.column_name LIKE '%donation%'
        AND t.table_type = 'BASE TABLE'
    LOOP
        RAISE NOTICE 'Found potential fund table: %', table_name;
    END LOOP;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show final state
SELECT 'Final Fund Balance:' as info;
SELECT 
    total_balance,
    pet_donations_total,
    direct_donations_total,
    expenses_total,
    last_updated
FROM green_scholar_fund_balance;

-- Show transaction counts
SELECT 'Transaction Counts:' as info;
SELECT 
    'Green Scholar Transactions:' as table_name,
    COUNT(*) as count
FROM green_scholar_transactions
UNION ALL
SELECT 
    'User Donations:' as table_name,
    COUNT(*) as count
FROM user_donations;
