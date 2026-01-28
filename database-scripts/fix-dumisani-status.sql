-- Fix Dumisani Dlamini's status to pending_approval
-- This script will update the user status to pending_approval so they appear in the pending collectors section

-- First, let's see the current status
SELECT 
    id,
    email,
    full_name,
    role,
    status,
    created_at
FROM public.users 
WHERE email = 'dumzbuttons@gmail.com' 
   OR full_name ILIKE '%dumisani%'
   OR full_name ILIKE '%dlamini%';

-- Update the status to pending_approval
UPDATE public.users 
SET 
    status = 'pending_approval',
    updated_at = NOW()
WHERE email = 'dumzbuttons@gmail.com' 
   OR full_name ILIKE '%dumisani%'
   OR full_name ILIKE '%dlamini%';

-- Verify the update
SELECT 
    id,
    email,
    full_name,
    role,
    status,
    updated_at
FROM public.users 
WHERE email = 'dumzbuttons@gmail.com' 
   OR full_name ILIKE '%dumisani%'
   OR full_name ILIKE '%dlamini%';

-- Show all pending collectors
SELECT 
    id,
    email,
    full_name,
    role,
    status,
    employee_number,
    created_at
FROM public.users 
WHERE status = 'pending_approval' 
  AND role = 'collector'
ORDER BY created_at DESC;

SELECT 'Dumisani Dlamini status updated to pending_approval!' as result;
