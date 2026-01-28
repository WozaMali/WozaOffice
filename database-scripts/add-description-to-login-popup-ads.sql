-- ============================================================================
-- ADD DESCRIPTION FIELD TO LOGIN POPUP ADS
-- ============================================================================
-- Adds a description field (optional) after the title field

-- Add description column
ALTER TABLE public.login_popup_ads 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add comment
COMMENT ON COLUMN public.login_popup_ads.description IS 'Optional description text for the ad, displayed after the title';

