-- ============================================================================
-- GREEN SCHOLAR FUND COMPLETE SETUP
-- ============================================================================
-- This script sets up the complete Green Scholar Fund system
-- Run this script to enable PET donations and educational funding

-- First, run the schema creation
\i green-scholar-fund-schema.sql

-- Then run the functions
\i green-scholar-functions.sql

-- Finally, update the collection approval process
\i update-collection-approval-for-pet.sql

-- Verify the setup
SELECT 'Green Scholar Fund Setup Complete!' as status;

-- Show initial data
SELECT 'Schools registered:' as info, COUNT(*) as count FROM schools;
SELECT 'Child-headed homes registered:' as info, COUNT(*) as count FROM child_headed_homes;
SELECT 'Initial fund balance:' as info, total_balance FROM green_scholar_fund_balance;
