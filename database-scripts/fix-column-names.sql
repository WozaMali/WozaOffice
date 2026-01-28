-- ============================================================================
-- FIX COLUMN NAMES IN PICKUPS TABLE
-- ============================================================================
-- This script identifies and fixes column name issues

-- Step 1: Show the actual pickups table structure
SELECT 'ACTUAL PICKUPS TABLE STRUCTURE' as check_type;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'pickups'
ORDER BY ordinal_position;

-- Step 2: Look for customer/user related columns
SELECT 'CUSTOMER/USER COLUMNS FOUND' as check_type;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'pickups'
AND (
    column_name ILIKE '%user%' OR 
    column_name ILIKE '%customer%' OR 
    column_name ILIKE '%member%' OR
    column_name ILIKE '%client%'
)
ORDER BY column_name;

-- Step 3: Look for collector related columns
SELECT 'COLLECTOR COLUMNS FOUND' as check_type;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'pickups'
AND (
    column_name ILIKE '%collector%' OR 
    column_name ILIKE '%driver%' OR
    column_name ILIKE '%staff%'
)
ORDER BY column_name;

-- Step 4: Show sample data to understand the structure
SELECT 'SAMPLE PICKUP DATA' as check_type;
SELECT * FROM pickups LIMIT 1;

-- Step 5: Check if we need to add missing columns
SELECT 'CHECKING FOR MISSING COLUMNS' as check_type;
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'pickups' 
            AND column_name = 'user_id'
        ) THEN 'user_id column exists'
        ELSE 'user_id column missing - need to add'
    END as user_id_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'pickups' 
            AND column_name = 'customer_id'
        ) THEN 'customer_id column exists'
        ELSE 'customer_id column missing - need to add'
    END as customer_id_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'pickups' 
            AND column_name = 'member_id'
        ) THEN 'member_id column exists'
        ELSE 'member_id column missing - need to add'
    END as member_id_status;

-- Step 6: Add missing columns if needed
DO $$
BEGIN
    -- Add user_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'pickups' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE pickups ADD COLUMN user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added user_id column';
    ELSE
        RAISE NOTICE 'user_id column already exists';
    END IF;

    -- Add collector_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'pickups' 
        AND column_name = 'collector_id'
    ) THEN
        ALTER TABLE pickups ADD COLUMN collector_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added collector_id column';
    ELSE
        RAISE NOTICE 'collector_id column already exists';
    END IF;

    -- Add address_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'pickups' 
        AND column_name = 'address_id'
    ) THEN
        ALTER TABLE pickups ADD COLUMN address_id UUID REFERENCES addresses(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added address_id column';
    ELSE
        RAISE NOTICE 'address_id column already exists';
    END IF;

    -- Add status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'pickups' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE pickups ADD COLUMN status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected', 'completed', 'cancelled'));
        RAISE NOTICE 'Added status column';
    ELSE
        RAISE NOTICE 'status column already exists';
    END IF;

    -- Add total_kg column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'pickups' 
        AND column_name = 'total_kg'
    ) THEN
        ALTER TABLE pickups ADD COLUMN total_kg NUMERIC(10,2) DEFAULT 0;
        RAISE NOTICE 'Added total_kg column';
    ELSE
        RAISE NOTICE 'total_kg column already exists';
    END IF;

    -- Add total_value column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'pickups' 
        AND column_name = 'total_value'
    ) THEN
        ALTER TABLE pickups ADD COLUMN total_value NUMERIC(10,2) DEFAULT 0;
        RAISE NOTICE 'Added total_value column';
    ELSE
        RAISE NOTICE 'total_value column already exists';
    END IF;
END $$;

-- Step 7: Final structure check
SELECT 'FINAL PICKUPS TABLE STRUCTURE' as check_type;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'pickups'
ORDER BY ordinal_position;
