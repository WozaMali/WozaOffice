-- ============================================================================
-- LOGIN POPUP ADS UNIFIED TABLE
-- ============================================================================
-- This creates a dedicated table for login popup ads, replacing the app_settings approach
-- This allows for better management, multiple ads, scheduling, and easier querying

-- Create login_popup_ads table
CREATE TABLE IF NOT EXISTS public.login_popup_ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT 'Login Popup Ad',
    title TEXT,
    image_url TEXT NOT NULL,
    cta_url TEXT,
    enabled BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0, -- Higher priority ads shown first
    start_at TIMESTAMP WITH TIME ZONE,
    end_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_login_popup_ads_enabled ON public.login_popup_ads(enabled);
CREATE INDEX IF NOT EXISTS idx_login_popup_ads_priority ON public.login_popup_ads(priority DESC);
CREATE INDEX IF NOT EXISTS idx_login_popup_ads_dates ON public.login_popup_ads(start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_login_popup_ads_active ON public.login_popup_ads(enabled, start_at, end_at) WHERE enabled = true;

-- Enable RLS
ALTER TABLE public.login_popup_ads ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to read active ads (for display in apps)
CREATE POLICY "login_popup_ads_select_active" ON public.login_popup_ads
    FOR SELECT
    TO authenticated
    USING (enabled = true);

-- Policy: Allow anonymous users to read active ads (for public login pages)
CREATE POLICY "login_popup_ads_select_active_anon" ON public.login_popup_ads
    FOR SELECT
    TO anon
    USING (enabled = true);

-- Policy: Allow admins to read all ads (for management)
CREATE POLICY "login_popup_ads_select_admin" ON public.login_popup_ads
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND (
                r.name IN ('admin', 'super_admin', 'superadmin')
                OR u.email = 'superadmin@wozamali.co.za'
                OR u.email LIKE '%admin@wozamali%'
            )
        )
    );

-- Policy: Allow admins to insert ads
CREATE POLICY "login_popup_ads_insert_admin" ON public.login_popup_ads
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND (
                r.name IN ('admin', 'super_admin', 'superadmin')
                OR u.email = 'superadmin@wozamali.co.za'
                OR u.email LIKE '%admin@wozamali%'
            )
        )
    );

-- Policy: Allow admins to update ads
CREATE POLICY "login_popup_ads_update_admin" ON public.login_popup_ads
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND (
                r.name IN ('admin', 'super_admin', 'superadmin')
                OR u.email = 'superadmin@wozamali.co.za'
                OR u.email LIKE '%admin@wozamali%'
            )
        )
    );

-- Policy: Allow admins to delete ads
CREATE POLICY "login_popup_ads_delete_admin" ON public.login_popup_ads
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND (
                r.name IN ('admin', 'super_admin', 'superadmin')
                OR u.email = 'superadmin@wozamali.co.za'
                OR u.email LIKE '%admin@wozamali%'
            )
        )
    );

-- Grant table-level permissions
GRANT SELECT ON public.login_popup_ads TO authenticated;
GRANT SELECT ON public.login_popup_ads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.login_popup_ads TO service_role;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_login_popup_ads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_login_popup_ads_updated_at ON public.login_popup_ads;
CREATE TRIGGER trigger_update_login_popup_ads_updated_at
    BEFORE UPDATE ON public.login_popup_ads
    FOR EACH ROW
    EXECUTE FUNCTION public.update_login_popup_ads_updated_at();

-- Migrate existing data from app_settings if it exists
DO $$
DECLARE
    v_ad_data JSONB;
    v_table_exists BOOLEAN;
BEGIN
    -- Check if app_settings table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'app_settings'
    ) INTO v_table_exists;

    -- Only try to migrate if the table exists
    IF v_table_exists THEN
        -- Check if login_popup_ad exists in app_settings
        BEGIN
            SELECT setting_value INTO v_ad_data
            FROM app_settings
            WHERE setting_key = 'login_popup_ad'
            AND setting_type = 'json'
            LIMIT 1;

            -- If data exists, migrate it
            IF v_ad_data IS NOT NULL AND v_ad_data->>'imageUrl' IS NOT NULL THEN
                -- Insert migrated ad
                INSERT INTO public.login_popup_ads (
                    name,
                    title,
                    image_url,
                    cta_url,
                    enabled,
                    start_at,
                    end_at,
                    created_at,
                    updated_at
                )
                SELECT
                    'Migrated Login Popup Ad',
                    (v_ad_data->>'title')::TEXT,
                    (v_ad_data->>'imageUrl')::TEXT,
                    (v_ad_data->>'ctaUrl')::TEXT,
                    COALESCE((v_ad_data->>'enabled')::BOOLEAN, true),
                    CASE 
                        WHEN v_ad_data->>'startAt' IS NOT NULL AND v_ad_data->>'startAt' != '' 
                        THEN (v_ad_data->>'startAt')::TIMESTAMP WITH TIME ZONE 
                        ELSE NULL 
                    END,
                    CASE 
                        WHEN v_ad_data->>'endAt' IS NOT NULL AND v_ad_data->>'endAt' != '' 
                        THEN (v_ad_data->>'endAt')::TIMESTAMP WITH TIME ZONE 
                        ELSE NULL 
                    END,
                    CASE 
                        WHEN v_ad_data->>'updatedAt' IS NOT NULL AND v_ad_data->>'updatedAt' != '' 
                        THEN (v_ad_data->>'updatedAt')::TIMESTAMP WITH TIME ZONE 
                        ELSE NOW() 
                    END,
                    CASE 
                        WHEN v_ad_data->>'updatedAt' IS NOT NULL AND v_ad_data->>'updatedAt' != '' 
                        THEN (v_ad_data->>'updatedAt')::TIMESTAMP WITH TIME ZONE 
                        ELSE NOW() 
                    END
                WHERE NOT EXISTS (
                    SELECT 1 FROM public.login_popup_ads 
                    WHERE image_url = (v_ad_data->>'imageUrl')::TEXT
                );

                RAISE NOTICE 'Migrated login popup ad from app_settings to login_popup_ads table';
            ELSE
                RAISE NOTICE 'No existing login_popup_ad found in app_settings to migrate';
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Error checking app_settings table: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'app_settings table does not exist, skipping migration';
    END IF;
END $$;

-- Verify the table was created
SELECT 
    'login_popup_ads table created successfully' as status,
    COUNT(*) as existing_ads_count
FROM public.login_popup_ads;

SELECT 'Login popup ads table setup complete!' as message;

