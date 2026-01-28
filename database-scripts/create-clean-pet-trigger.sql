-- Clean trigger function for PET donations
CREATE OR REPLACE FUNCTION process_pet_donation_trigger()
RETURNS TRIGGER AS $$
DECLARE
    pet_amount NUMERIC := 0;
BEGIN
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        SELECT COALESCE(SUM(cm.total_price), 0) INTO pet_amount
        FROM collection_materials cm
        WHERE cm.collection_id = NEW.id
        AND (LOWER(cm.material_name) LIKE '%plastic%' OR LOWER(cm.material_name) LIKE '%pet%');
        
        IF pet_amount > 0 THEN
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
