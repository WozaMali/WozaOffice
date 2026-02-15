-- ============================================================================
-- ADD APPROVAL_STATUS COLUMN TO VIDEO_WATCHES TABLE
-- ============================================================================
-- This script adds the approval_status column to the video_watches table
-- to support admin approval/rejection of watch ad earnings.
-- Run this in your Supabase SQL Editor

-- Step 1: Add the approval_status column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'video_watches' 
        AND column_name = 'approval_status'
    ) THEN
        ALTER TABLE public.video_watches
        ADD COLUMN approval_status VARCHAR(20) DEFAULT NULL
        CHECK (approval_status IN ('pending', 'approved', 'rejected') OR approval_status IS NULL);
        
        RAISE NOTICE '✅ Added approval_status column to video_watches table';
    ELSE
        RAISE NOTICE '⚠️ approval_status column already exists in video_watches table';
    END IF;
END $$;

-- Step 1b: Add the deleted_at column for soft delete support (optional)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'video_watches' 
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE public.video_watches
        ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
        
        RAISE NOTICE '✅ Added deleted_at column to video_watches table';
    ELSE
        RAISE NOTICE '⚠️ deleted_at column already exists in video_watches table';
    END IF;
END $$;

-- Step 2: Add a comment to document the column
COMMENT ON COLUMN public.video_watches.approval_status IS 
'Status of admin approval for this watch ad earning. Values: pending, approved, rejected. NULL means not yet reviewed.';

-- Step 3: Create an index for better query performance on approval_status
CREATE INDEX IF NOT EXISTS idx_video_watches_approval_status 
ON public.video_watches(approval_status);

-- Step 4: Verify the column was added
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'video_watches'
AND column_name = 'approval_status';

-- Step 5: Show current approval status distribution (if any data exists)
SELECT 
    approval_status,
    COUNT(*) as count
FROM public.video_watches
GROUP BY approval_status
ORDER BY approval_status NULLS LAST;

SELECT '✅ approval_status column added successfully to video_watches table!' as status;
