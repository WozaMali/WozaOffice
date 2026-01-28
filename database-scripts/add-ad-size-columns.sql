-- ============================================================================
-- ADD SIZE COLUMNS TO LOGIN POPUP ADS
-- ============================================================================
-- This adds width and height columns to control ad display size

-- Add width and height columns (in pixels, nullable for auto-sizing)
ALTER TABLE public.login_popup_ads
ADD COLUMN IF NOT EXISTS width INTEGER,
ADD COLUMN IF NOT EXISTS height INTEGER;

-- Add a comment to explain the columns
COMMENT ON COLUMN public.login_popup_ads.width IS 'Ad width in pixels (null = auto)';
COMMENT ON COLUMN public.login_popup_ads.height IS 'Ad height in pixels (null = auto)';

-- Verify the columns were added
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'login_popup_ads'
AND column_name IN ('width', 'height');

SELECT 'Size columns added successfully!' as message;

