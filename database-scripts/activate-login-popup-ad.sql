-- ============================================================================
-- ACTIVATE LOGIN POPUP AD
-- ============================================================================
-- This script ensures there's an active login popup ad
-- If no ads exist, it creates a default placeholder ad
-- If ads exist but none are active, it activates the most recent one

DO $$
DECLARE
    v_ad_count INTEGER;
    v_active_count INTEGER;
    v_latest_ad_id UUID;
BEGIN
    -- Check if any ads exist
    SELECT COUNT(*) INTO v_ad_count FROM public.login_popup_ads;
    
    -- Check if any active ads exist
    SELECT COUNT(*) INTO v_active_count 
    FROM public.login_popup_ads 
    WHERE enabled = true;
    
    IF v_ad_count = 0 THEN
        -- No ads exist, create a default placeholder ad
        INSERT INTO public.login_popup_ads (
            name,
            title,
            image_url,
            cta_url,
            enabled,
            priority,
            created_at,
            updated_at
        ) VALUES (
            'Default Login Popup Ad',
            'Welcome to WozaMali',
            'https://via.placeholder.com/800x600/0066CC/FFFFFF?text=Login+Popup+Ad',
            NULL,
            true,
            0,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Created default active login popup ad (placeholder image)';
    ELSIF v_active_count = 0 THEN
        -- Ads exist but none are active, activate the most recent one
        SELECT id INTO v_latest_ad_id
        FROM public.login_popup_ads
        ORDER BY created_at DESC
        LIMIT 1;
        
        IF v_latest_ad_id IS NOT NULL THEN
            UPDATE public.login_popup_ads
            SET enabled = true,
                updated_at = NOW()
            WHERE id = v_latest_ad_id;
            
            RAISE NOTICE 'Activated most recent login popup ad (ID: %)', v_latest_ad_id;
        END IF;
    ELSE
        -- At least one ad is already active
        RAISE NOTICE 'Login popup ad is already active. Active ads count: %', v_active_count;
    END IF;
END $$;

-- Verify the active ad
SELECT 
    id,
    name,
    title,
    enabled,
    priority,
    image_url,
    cta_url,
    start_at,
    end_at,
    created_at,
    updated_at
FROM public.login_popup_ads
WHERE enabled = true
ORDER BY priority DESC, created_at DESC
LIMIT 1;

SELECT 'Login popup ad activation complete!' as message;

