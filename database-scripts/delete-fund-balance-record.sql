-- ============================================================================
-- DELETE FUND BALANCE RECORD AND RESET TO ZERO
-- ============================================================================
-- This script deletes the existing fund balance record and creates a new one with zero values

-- ============================================================================
-- 1. SHOW CURRENT RECORD BEFORE DELETION
-- ============================================================================

SELECT '=== CURRENT FUND BALANCE RECORD ===' as section;
SELECT * FROM green_scholar_fund_balance;

-- ============================================================================
-- 2. DELETE THE EXISTING RECORD
-- ============================================================================

DELETE FROM green_scholar_fund_balance;

-- ============================================================================
-- 3. INSERT NEW RECORD WITH ZERO VALUES
-- ============================================================================

INSERT INTO green_scholar_fund_balance (
    total_balance,
    pet_donations_total,
    direct_donations_total,
    expenses_total,
    last_updated
) VALUES (
    0.00,  -- Total balance reset to 0
    0.00,  -- PET donations reset to 0
    0.00,  -- Direct donations reset to 0
    0.00,  -- Expenses reset to 0
    NOW()
);

-- ============================================================================
-- 4. VERIFY THE RESET
-- ============================================================================

SELECT '=== RESET FUND BALANCE RECORD ===' as section;
SELECT * FROM green_scholar_fund_balance;

-- ============================================================================
-- 5. FINAL VERIFICATION
-- ============================================================================

SELECT '=== FINAL VERIFICATION ===' as section;
SELECT 
    'green_scholar_fund_balance' as table_name,
    COUNT(*) as record_count
FROM green_scholar_fund_balance;
