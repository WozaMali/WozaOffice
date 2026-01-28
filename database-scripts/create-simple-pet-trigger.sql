-- Create a simple trigger function for future PET donations
CREATE OR REPLACE FUNCTION process_pet_donation_trigger()
RETURNS TRIGGER AS $$
DECLARE
    pet_amount NUMERIC := 0;
BEGIN
    -- Only process when status changes to 'approved'
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        
        -- Calculate total PET amount from this collection
        SELECT COALESCE(SUM(cm.total_price), 0) INTO pet_amount
        FROM collection_materials cm
        WHERE cm.collection_id = NEW.id
        AND (LOWER(cm.material_name) LIKE '%plastic%' OR LOWER(cm.material_name) LIKE '%pet%');
        
        -- Add to Green Scholar Fund if there's PET material
        IF pet_amount > 0 THEN
            -- Insert transaction record
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
                pet_amount,
                'PET material donation from ' || NEW.collection_code,
                NEW.customer_name,
                NEW.customer_email,
                'general_fund',
                NULL,
                'confirmed'
            );
            
            -- Update fund balance
            UPDATE green_scholar_fund_balance 
            SET 
                total_balance = total_balance + pet_amount,
                pet_donations_total = pet_donations_total + pet_amount,
                last_updated = NOW()
            WHERE id = 1;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_pet_donation ON unified_collections;
CREATE TRIGGER trigger_pet_donation
    AFTER UPDATE ON unified_collections
    FOR EACH ROW
    EXECUTE FUNCTION process_pet_donation_trigger();

-- Verify the trigger was created
SELECT 'Trigger Created Successfully:' as info;
SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_pet_donation';
