-- ============================================================================
-- GREEN SCHOLAR FUND FUNCTIONS
-- ============================================================================

-- Function to get monthly statistics for Green Scholar Fund
CREATE OR REPLACE FUNCTION get_green_scholar_monthly_stats()
RETURNS TABLE (
    month TEXT,
    pet_donations DECIMAL(10,2),
    direct_donations DECIMAL(10,2),
    expenses DECIMAL(10,2),
    net_balance DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COALESCE(SUM(CASE WHEN transaction_type = 'pet_donation' AND status = 'confirmed' THEN amount ELSE 0 END), 0) as pet_donations,
        COALESCE(SUM(CASE WHEN transaction_type = 'direct_donation' AND status = 'confirmed' THEN amount ELSE 0 END), 0) as direct_donations,
        COALESCE(SUM(CASE WHEN transaction_type = 'expense' AND status = 'confirmed' THEN amount ELSE 0 END), 0) as expenses,
        COALESCE(SUM(CASE WHEN status = 'confirmed' THEN 
            CASE 
                WHEN transaction_type = 'expense' THEN -amount 
                ELSE amount 
            END 
            ELSE 0 
        END), 0) as net_balance
    FROM green_scholar_transactions
    WHERE created_at >= NOW() - INTERVAL '12 months'
    GROUP BY TO_CHAR(created_at, 'YYYY-MM')
    ORDER BY month DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to process PET donations from collections
CREATE OR REPLACE FUNCTION process_pet_donation_from_collection(
    p_collection_id UUID,
    p_material_name TEXT,
    p_weight_kg DECIMAL(8,3),
    p_rate_per_kg DECIMAL(10,2),
    p_donor_name TEXT,
    p_donor_email TEXT
)
RETURNS UUID AS $$
DECLARE
    v_transaction_id UUID;
    v_total_value DECIMAL(10,2);
    v_green_scholar_amount DECIMAL(10,2);
    v_user_wallet_amount DECIMAL(10,2);
BEGIN
    -- Calculate values
    v_total_value := p_weight_kg * p_rate_per_kg;
    
    -- For PET materials, 100% goes to Green Scholar Fund
    -- For other materials, 70% Green Scholar, 30% user wallet
    IF p_material_name ILIKE '%PET%' OR p_material_name ILIKE '%plastic%' THEN
        v_green_scholar_amount := v_total_value;
        v_user_wallet_amount := 0;
    ELSE
        v_green_scholar_amount := v_total_value * 0.7;
        v_user_wallet_amount := v_total_value * 0.3;
    END IF;
    
    -- Create Green Scholar transaction
    INSERT INTO green_scholar_transactions (
        transaction_type,
        source_type,
        source_id,
        amount,
        description,
        donor_name,
        donor_email,
        beneficiary_type,
        status
    ) VALUES (
        'pet_donation',
        'collection',
        p_collection_id,
        v_green_scholar_amount,
        'PET donation from ' || p_material_name || ' collection (' || p_weight_kg || 'kg)',
        p_donor_name,
        p_donor_email,
        'general_fund',
        'confirmed'
    ) RETURNING id INTO v_transaction_id;
    
    -- Record the contribution breakdown
    INSERT INTO collection_green_scholar_contributions (
        collection_id,
        material_name,
        weight_kg,
        rate_per_kg,
        total_value,
        green_scholar_contribution,
        user_wallet_contribution
    ) VALUES (
        p_collection_id,
        p_material_name,
        p_weight_kg,
        p_rate_per_kg,
        v_total_value,
        v_green_scholar_amount,
        v_user_wallet_amount
    );
    
    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create a direct donation
CREATE OR REPLACE FUNCTION create_direct_donation(
    p_user_id UUID,
    p_amount DECIMAL(10,2),
    p_beneficiary_type TEXT,
    p_beneficiary_id UUID,
    p_donor_message TEXT DEFAULT NULL,
    p_is_anonymous BOOLEAN DEFAULT false
)
RETURNS UUID AS $$
DECLARE
    v_donation_id UUID;
    v_transaction_id UUID;
    v_donor_name TEXT;
    v_donor_email TEXT;
    v_beneficiary_name TEXT;
BEGIN
    -- Get donor information
    SELECT full_name, email INTO v_donor_name, v_donor_email
    FROM user_profiles 
    WHERE id = p_user_id;
    
    -- Get beneficiary name
    IF p_beneficiary_type = 'school' THEN
        SELECT name INTO v_beneficiary_name FROM schools WHERE id = p_beneficiary_id;
    ELSIF p_beneficiary_type = 'child_home' THEN
        SELECT name INTO v_beneficiary_name FROM child_headed_homes WHERE id = p_beneficiary_id;
    ELSE
        v_beneficiary_name := 'General Fund';
    END IF;
    
    -- Create user donation record
    INSERT INTO user_donations (
        user_id,
        amount,
        donation_type,
        beneficiary_type,
        beneficiary_id,
        donor_message,
        is_anonymous,
        status
    ) VALUES (
        p_user_id,
        p_amount,
        'monetary',
        p_beneficiary_type,
        p_beneficiary_id,
        p_donor_message,
        p_is_anonymous,
        'confirmed'
    ) RETURNING id INTO v_donation_id;
    
    -- Create Green Scholar transaction
    INSERT INTO green_scholar_transactions (
        transaction_type,
        source_type,
        source_id,
        amount,
        description,
        donor_name,
        donor_email,
        beneficiary_type,
        beneficiary_id,
        status
    ) VALUES (
        'direct_donation',
        'donation',
        v_donation_id,
        p_amount,
        'Direct donation' || CASE WHEN p_is_anonymous THEN ' (anonymous)' ELSE ' from ' || v_donor_name END,
        CASE WHEN p_is_anonymous THEN 'Anonymous' ELSE v_donor_name END,
        CASE WHEN p_is_anonymous THEN NULL ELSE v_donor_email END,
        p_beneficiary_type,
        p_beneficiary_id,
        'confirmed'
    ) RETURNING id INTO v_transaction_id;
    
    RETURN v_donation_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get fund allocation for a collection
CREATE OR REPLACE FUNCTION get_collection_fund_allocation(
    p_collection_id UUID
)
RETURNS TABLE (
    material_name TEXT,
    weight_kg DECIMAL(8,3),
    total_value DECIMAL(10,2),
    green_scholar_contribution DECIMAL(10,2),
    user_wallet_contribution DECIMAL(10,2),
    allocation_percentage DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cgc.material_name,
        cgc.weight_kg,
        cgc.total_value,
        cgc.green_scholar_contribution,
        cgc.user_wallet_contribution,
        CASE 
            WHEN cgc.total_value > 0 THEN 
                ROUND((cgc.green_scholar_contribution / cgc.total_value) * 100, 2)
            ELSE 0
        END as allocation_percentage
    FROM collection_green_scholar_contributions cgc
    WHERE cgc.collection_id = p_collection_id
    ORDER BY cgc.material_name;
END;
$$ LANGUAGE plpgsql;

-- Function to get beneficiary statistics
CREATE OR REPLACE FUNCTION get_beneficiary_stats()
RETURNS TABLE (
    beneficiary_type TEXT,
    beneficiary_name TEXT,
    total_received DECIMAL(10,2),
    transaction_count BIGINT,
    last_donation_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gst.beneficiary_type,
        COALESCE(s.name, ch.name, 'General Fund') as beneficiary_name,
        COALESCE(SUM(gst.amount), 0) as total_received,
        COUNT(*) as transaction_count,
        MAX(gst.created_at) as last_donation_date
    FROM green_scholar_transactions gst
    LEFT JOIN schools s ON gst.beneficiary_type = 'school' AND gst.beneficiary_id = s.id
    LEFT JOIN child_headed_homes ch ON gst.beneficiary_type = 'child_home' AND gst.beneficiary_id = ch.id
    WHERE gst.status = 'confirmed'
    AND gst.transaction_type IN ('pet_donation', 'direct_donation')
    GROUP BY gst.beneficiary_type, s.name, ch.name
    ORDER BY total_received DESC;
END;
$$ LANGUAGE plpgsql;
