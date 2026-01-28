-- ============================================================================
-- FIX ADDRESS CONSTRAINT ISSUE
-- ============================================================================
-- This script fixes the issue where address_id is required but being passed as null

-- First, drop the existing NOT NULL constraint
ALTER TABLE public.pickups 
ALTER COLUMN address_id DROP NOT NULL;

-- Verify the change
SELECT 
    column_name, 
    is_nullable, 
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name = 'pickups' 
    AND column_name = 'address_id';

-- Test inserting a pickup without address_id
-- (This should now work)
INSERT INTO public.pickups (
    customer_id, 
    collector_id, 
    status, 
    started_at
) VALUES (
    '73ff49c1-d670-4aea-9029-75a4c97e043a',
    'ae6f499f-2318-476d-ac66-560f7681ac2e',
    'submitted',
    NOW()
) RETURNING id;

-- Clean up test data
DELETE FROM public.pickups 
WHERE customer_id = '73ff49c1-d670-4aea-9029-75a4c97e043a' 
    AND collector_id = 'ae6f499f-2318-476d-ac66-560f7681ac2e'
    AND status = 'submitted';
