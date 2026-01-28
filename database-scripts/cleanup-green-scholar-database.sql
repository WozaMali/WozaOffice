-- ============================================================================
-- CLEANUP GREEN SCHOLAR FUND DATABASE TABLES
-- ============================================================================
-- This script removes all Green Scholar Fund related database objects

-- ============================================================================
-- 1. DROP GREEN SCHOLAR FUND TABLES (SAFE - CHECK EXISTENCE FIRST)
-- ============================================================================

-- Drop tables only if they exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'collection_green_scholar_contributions') THEN
        DROP TABLE collection_green_scholar_contributions CASCADE;
        RAISE NOTICE 'Dropped table: collection_green_scholar_contributions';
    ELSE
        RAISE NOTICE 'Table collection_green_scholar_contributions does not exist, skipping';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_donations') THEN
        DROP TABLE user_donations CASCADE;
        RAISE NOTICE 'Dropped table: user_donations';
    ELSE
        RAISE NOTICE 'Table user_donations does not exist, skipping';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'green_scholar_transactions') THEN
        DROP TABLE green_scholar_transactions CASCADE;
        RAISE NOTICE 'Dropped table: green_scholar_transactions';
    ELSE
        RAISE NOTICE 'Table green_scholar_transactions does not exist, skipping';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'child_headed_homes') THEN
        DROP TABLE child_headed_homes CASCADE;
        RAISE NOTICE 'Dropped table: child_headed_homes';
    ELSE
        RAISE NOTICE 'Table child_headed_homes does not exist, skipping';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'schools') THEN
        DROP TABLE schools CASCADE;
        RAISE NOTICE 'Dropped table: schools';
    ELSE
        RAISE NOTICE 'Table schools does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- 2. DROP GREEN SCHOLAR FUND VIEWS (SAFE - CHECK EXISTENCE FIRST)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.views WHERE table_name = 'green_scholar_fund_balance') THEN
        DROP VIEW green_scholar_fund_balance CASCADE;
        RAISE NOTICE 'Dropped view: green_scholar_fund_balance';
    ELSE
        RAISE NOTICE 'View green_scholar_fund_balance does not exist, skipping';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.views WHERE table_name = 'green_scholar_fund_summary') THEN
        DROP VIEW green_scholar_fund_summary CASCADE;
        RAISE NOTICE 'Dropped view: green_scholar_fund_summary';
    ELSE
        RAISE NOTICE 'View green_scholar_fund_summary does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- 3. DROP GREEN SCHOLAR FUND FUNCTIONS (SAFE - CHECK EXISTENCE FIRST)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.routines WHERE routine_name = 'update_green_scholar_balance') THEN
        DROP FUNCTION update_green_scholar_balance() CASCADE;
        RAISE NOTICE 'Dropped function: update_green_scholar_balance';
    ELSE
        RAISE NOTICE 'Function update_green_scholar_balance does not exist, skipping';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.routines WHERE routine_name = 'get_green_scholar_monthly_stats') THEN
        DROP FUNCTION get_green_scholar_monthly_stats() CASCADE;
        RAISE NOTICE 'Dropped function: get_green_scholar_monthly_stats';
    ELSE
        RAISE NOTICE 'Function get_green_scholar_monthly_stats does not exist, skipping';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.routines WHERE routine_name = 'create_direct_donation') THEN
        DROP FUNCTION create_direct_donation(UUID, DECIMAL, TEXT, UUID, TEXT, BOOLEAN) CASCADE;
        RAISE NOTICE 'Dropped function: create_direct_donation';
    ELSE
        RAISE NOTICE 'Function create_direct_donation does not exist, skipping';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.routines WHERE routine_name = 'get_beneficiary_stats') THEN
        DROP FUNCTION get_beneficiary_stats() CASCADE;
        RAISE NOTICE 'Dropped function: get_beneficiary_stats';
    ELSE
        RAISE NOTICE 'Function get_beneficiary_stats does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- 4. DROP GREEN SCHOLAR FUND TRIGGERS (SAFE - CHECK EXISTENCE FIRST)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.triggers WHERE trigger_name = 'trigger_update_green_scholar_balance') THEN
        DROP TRIGGER trigger_update_green_scholar_balance ON green_scholar_transactions CASCADE;
        RAISE NOTICE 'Dropped trigger: trigger_update_green_scholar_balance';
    ELSE
        RAISE NOTICE 'Trigger trigger_update_green_scholar_balance does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- 5. VERIFY CLEANUP
-- ============================================================================

SELECT '=== GREEN SCHOLAR FUND CLEANUP COMPLETE ===' as status;

-- Check if any Green Scholar Fund tables still exist
SELECT 
    'Remaining Green Scholar Fund tables:' as info,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name ILIKE '%green%' 
   OR table_name ILIKE '%scholar%'
   OR table_name = 'schools'
   OR table_name = 'child_headed_homes'
   OR table_name = 'user_donations'
ORDER BY table_name;

-- Check if any Green Scholar Fund functions still exist
SELECT 
    'Remaining Green Scholar Fund functions:' as info,
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name ILIKE '%green%' 
   OR routine_name ILIKE '%scholar%'
ORDER BY routine_name;

-- ============================================================================
-- 6. FINAL SUMMARY
-- ============================================================================

SELECT '=== FINAL SUMMARY ===' as status;
SELECT 
    'Green Scholar Fund database cleanup completed' as status,
    'All tables, views, functions, and triggers removed' as note,
    'Office App Green Scholar Fund functionality completely removed' as result;
