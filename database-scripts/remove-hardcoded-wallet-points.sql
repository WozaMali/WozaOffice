-- Remove hardcoded sample wallet data with 3315 points
-- This script will set all wallet points to 0 if they appear to be test/sample data

-- Option 1: Set specific user's wallet to 0
UPDATE public.user_wallets
SET 
    current_points = 0,
    total_points_earned = 0,
    total_points_spent = 0,
    updated_at = NOW()
WHERE user_id = '97dbcdc2-0909-4c2c-84c4-359d8085f23b'
  AND current_points = 3315;

-- Option 2: Set all wallets with 3315 points to 0 (in case there are multiple)
UPDATE public.user_wallets
SET 
    current_points = 0,
    total_points_earned = 0,
    total_points_spent = 0,
    updated_at = NOW()
WHERE current_points = 3315;

-- Also check and update legacy wallets table if it exists
UPDATE public.wallets
SET 
    balance = 0,
    total_points = 0,
    updated_at = NOW()
WHERE user_id = '97dbcdc2-0909-4c2c-84c4-359d8085f23b'
  AND (balance = 3315 OR total_points = 3315);

-- Update all wallets with 3315 balance/points in legacy table
UPDATE public.wallets
SET 
    balance = 0,
    total_points = 0,
    updated_at = NOW()
WHERE balance = 3315 OR total_points = 3315;

-- Verify the changes
SELECT 
    'user_wallets' as table_name,
    user_id,
    current_points,
    total_points_earned,
    total_points_spent
FROM public.user_wallets
WHERE user_id = '97dbcdc2-0909-4c2c-84c4-359d8085f23b'
UNION ALL
SELECT 
    'wallets' as table_name,
    user_id::text,
    balance::numeric as current_points,
    0 as total_points_earned,
    0 as total_points_spent
FROM public.wallets
WHERE user_id = '97dbcdc2-0909-4c2c-84c4-359d8085f23b';

