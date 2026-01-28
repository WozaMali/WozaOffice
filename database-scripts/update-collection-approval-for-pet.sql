-- ============================================================================
-- UPDATE COLLECTION APPROVAL TO PROCESS PET DONATIONS
-- ============================================================================
-- This script updates the collection approval process to automatically
-- process PET donations to the Green Scholar Fund

-- Update the update_wallet_simple function to also process PET donations
CREATE OR REPLACE FUNCTION update_wallet_simple(
    p_collection_id UUID,
    p_amount DECIMAL(10,2),
    p_description TEXT,
    p_points INTEGER,
    p_transaction_type TEXT,
    p_user_id UUID
) RETURNS JSON AS $$
DECLARE
    v_wallet_id UUID;
    v_new_balance DECIMAL(10,2);
    v_transaction_id UUID;
    v_collection_data RECORD;
    v_material_data RECORD;
    v_green_scholar_amount DECIMAL(10,2) := 0;
    v_user_wallet_amount DECIMAL(10,2) := 0;
    v_result JSON;
BEGIN
    -- Get collection details
    SELECT 
        uc.id,
        uc.customer_id,
        up.full_name as customer_name,
        up.email as customer_email
    INTO v_collection_data
    FROM unified_collections uc
    JOIN user_profiles up ON uc.customer_id = up.id
    WHERE uc.id = p_collection_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Collection not found');
    END IF;

    -- Get or create wallet
    SELECT id INTO v_wallet_id
    FROM user_wallets
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        INSERT INTO user_wallets (user_id, current_points, total_points_earned)
        VALUES (p_user_id, 0, 0)
        RETURNING id INTO v_wallet_id;
    END IF;

    -- Process each material in the collection for Green Scholar Fund
    FOR v_material_data IN
        SELECT 
            cm.material_name,
            cm.quantity as weight_kg,
            cm.price_per_kg as rate_per_kg,
            cm.total_price as total_value
        FROM collection_materials cm
        WHERE cm.collection_id = p_collection_id
    LOOP
        -- Calculate Green Scholar Fund allocation
        -- PET materials: 100% to Green Scholar Fund
        -- Other materials: 70% Green Scholar, 30% user wallet
        IF v_material_data.material_name ILIKE '%PET%' OR v_material_data.material_name ILIKE '%plastic%' THEN
            v_green_scholar_amount := v_green_scholar_amount + v_material_data.total_value;
        ELSE
            v_green_scholar_amount := v_green_scholar_amount + (v_material_data.total_value * 0.7);
            v_user_wallet_amount := v_user_wallet_amount + (v_material_data.total_value * 0.3);
        END IF;

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
            v_material_data.material_name,
            v_material_data.weight_kg,
            v_material_data.rate_per_kg,
            v_material_data.total_value,
            CASE 
                WHEN v_material_data.material_name ILIKE '%PET%' OR v_material_data.material_name ILIKE '%plastic%' 
                THEN v_material_data.total_value
                ELSE v_material_data.total_value * 0.7
            END,
            CASE 
                WHEN v_material_data.material_name ILIKE '%PET%' OR v_material_data.material_name ILIKE '%plastic%' 
                THEN 0
                ELSE v_material_data.total_value * 0.3
            END
        );
    END LOOP;

    -- Create Green Scholar Fund transaction for PET donations
    IF v_green_scholar_amount > 0 THEN
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
            'PET donation from collection ' || p_collection_id,
            v_collection_data.customer_name,
            v_collection_data.customer_email,
            'general_fund',
            'confirmed'
        );
    END IF;

    -- Update user wallet with their portion
    IF v_user_wallet_amount > 0 THEN
        -- Update wallet balance
        UPDATE user_wallets
        SET 
            current_points = current_points + p_points,
            total_points_earned = total_points_earned + p_points,
            last_updated = NOW()
        WHERE id = v_wallet_id
        RETURNING current_points INTO v_new_balance;

        -- Create points transaction
        INSERT INTO points_transactions (
            wallet_id,
            transaction_type,
            points,
            balance_after,
            source,
            reference_id,
            description
        ) VALUES (
            v_wallet_id,
            p_transaction_type,
            p_points,
            v_new_balance,
            'collection_approval',
            p_collection_id,
            p_description
        ) RETURNING id INTO v_transaction_id;
    END IF;

    -- Return success result
    v_result := json_build_object(
        'success', true,
        'wallet_id', v_wallet_id,
        'new_balance', v_new_balance,
        'transaction_id', v_transaction_id,
        'green_scholar_amount', v_green_scholar_amount,
        'user_wallet_amount', v_user_wallet_amount
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_wallet_simple(UUID, DECIMAL, TEXT, INTEGER, TEXT, UUID) TO authenticated;

-- Create a view to show collection fund allocations
CREATE OR REPLACE VIEW collection_fund_allocations AS
SELECT 
    uc.id as collection_id,
    uc.collection_code,
    uc.customer_name,
    uc.total_value,
    uc.total_weight_kg,
    COALESCE(SUM(cgc.green_scholar_contribution), 0) as green_scholar_total,
    COALESCE(SUM(cgc.user_wallet_contribution), 0) as user_wallet_total,
    ROUND(
        CASE 
            WHEN uc.total_value > 0 THEN 
                (COALESCE(SUM(cgc.green_scholar_contribution), 0) / uc.total_value) * 100
            ELSE 0
        END, 2
    ) as green_scholar_percentage
FROM unified_collections uc
LEFT JOIN collection_green_scholar_contributions cgc ON uc.id = cgc.collection_id
GROUP BY uc.id, uc.collection_code, uc.customer_name, uc.total_value, uc.total_weight_kg
ORDER BY uc.created_at DESC;

-- Grant select permission on the view
GRANT SELECT ON collection_fund_allocations TO authenticated;
GRANT SELECT ON collection_fund_allocations TO service_role;
