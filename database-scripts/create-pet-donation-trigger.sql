-- Create a trigger function to automatically process PET donations when collections are approved
CREATE OR REPLACE FUNCTION process_pet_donation_on_approval()
RETURNS TRIGGER AS $$
DECLARE
    material_record RECORD;
    green_scholar_amount NUMERIC := 0;
    user_wallet_amount NUMERIC := 0;
    total_green_scholar NUMERIC := 0;
BEGIN
    -- Only process when status changes to 'approved'
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        
        -- Process each material in the collection
        FOR material_record IN 
            SELECT 
                cm.material_name,
                cm.quantity,
                cm.total_price
            FROM collection_materials cm
            WHERE cm.collection_id = NEW.id
        LOOP
            -- Check if it's PET material
            IF LOWER(material_record.material_name) LIKE '%plastic%' 
               OR LOWER(material_record.material_name) LIKE '%pet%' THEN
                
                -- 100% of PET goes to Green Scholar Fund
                green_scholar_amount := material_record.total_price;
                user_wallet_amount := 0;
            ELSE
                -- 100% of other materials go to user wallet
                green_scholar_amount := 0;
                user_wallet_amount := material_record.total_price;
            END IF;
            
            -- Add to running total
            total_green_scholar := total_green_scholar + green_scholar_amount;
            
            -- Insert Green Scholar transaction if there's a contribution
            IF green_scholar_amount > 0 THEN
                INSERT INTO green_scholar_transactions (
                    transaction_type,
                    source_type,
                    amount,
                    description,
                    donor_name,
                    donor_email,
                    beneficiary_type,
                    beneficiary_id,
                    status
                ) VALUES (
                    'pet_donation',
                    'collection',
                    green_scholar_amount,
                    'PET material donation from ' || NEW.collection_code || ' - ' || material_record.material_name,
                    NEW.customer_name,
                    NEW.customer_email,
                    'general',
                    NULL,
                    'completed'
                );
            END IF;
        END LOOP;
        
        -- Update the fund balance if there were PET contributions
        IF total_green_scholar > 0 THEN
            UPDATE green_scholar_fund_balance 
            SET 
                total_balance = total_balance + total_green_scholar,
                pet_donations_total = pet_donations_total + total_green_scholar,
                last_updated = NOW()
            WHERE id = 1;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_process_pet_donation ON unified_collections;
CREATE TRIGGER trigger_process_pet_donation
    AFTER UPDATE ON unified_collections
    FOR EACH ROW
    EXECUTE FUNCTION process_pet_donation_on_approval();

-- Test the trigger by checking if it exists
SELECT 'Trigger Status:' as info;
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_process_pet_donation';
