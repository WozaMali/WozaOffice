-- ============================================================================
-- CREATE TEST PICKUPS USING EXISTING USERS
-- ============================================================================
-- Run this in your Supabase SQL Editor

-- First, let's see what we have
SELECT 'Current Status:' as info;
SELECT 
  role,
  COUNT(*) as user_count
FROM public.profiles 
GROUP BY role
ORDER BY role;

-- Check if we have any collectors
SELECT 'Collector Users:' as info;
SELECT 
  id,
  email,
  full_name,
  role
FROM public.profiles 
WHERE role = 'collector';

-- Check if we have any members (customers)
SELECT 'Member Users (Customers):' as info;
SELECT 
  id,
  email,
  full_name,
  role
FROM public.profiles 
WHERE role = 'member'
LIMIT 5;

-- Check addresses for member users
SELECT 'Addresses for Members:' as info;
SELECT 
  a.id as address_id,
  p.email as user_email,
  p.full_name as user_name,
  a.line1,
  a.suburb,
  a.city
FROM public.addresses a
JOIN public.profiles p ON a.profile_id = p.id
WHERE p.role = 'member'
LIMIT 5;

-- Now let's create test pickups if we have the right users
DO $$
DECLARE
  collector_uuid UUID;
  customer_uuid UUID;
  address_uuid UUID;
  pickup_count INTEGER := 0;
BEGIN
  -- Get a collector (or use an admin if no collectors exist)
  SELECT id INTO collector_uuid 
  FROM public.profiles 
  WHERE role = 'collector' 
  LIMIT 1;
  
  -- If no collectors, use an admin
  IF collector_uuid IS NULL THEN
    SELECT id INTO collector_uuid 
    FROM public.profiles 
    WHERE role = 'admin' 
    LIMIT 1;
  END IF;
  
  -- Get a customer/member
  SELECT id INTO customer_uuid 
  FROM public.profiles 
  WHERE role = 'member' 
  LIMIT 1;
  
  -- Get an address for the customer
  SELECT a.id INTO address_uuid 
  FROM public.addresses a
  JOIN public.profiles p ON a.profile_id = p.id
  WHERE p.role = 'member'
  LIMIT 1;
  
  -- Show what we found
  RAISE NOTICE 'Collector: %, Customer: %, Address: %', 
    collector_uuid, customer_uuid, address_uuid;
  
  -- Only create test data if we have all required users
  IF collector_uuid IS NOT NULL AND customer_uuid IS NOT NULL AND address_uuid IS NOT NULL THEN
    
    -- Create a few test pickups
    FOR i IN 1..3 LOOP
      INSERT INTO public.pickups (id, customer_id, collector_id, address_id, status)
      VALUES (
        uuid_generate_v4(),
        customer_uuid,
        collector_uuid,
        address_uuid,
        CASE 
          WHEN i = 1 THEN 'submitted'
          WHEN i = 2 THEN 'approved'
          ELSE 'rejected'
        END
      );
      pickup_count := pickup_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Created % test pickups successfully!', pickup_count;
    
  ELSE
    RAISE NOTICE 'Cannot create test data - missing required users or addresses';
  END IF;
  
END $$;

-- Show what we created
SELECT 'Test Pickups Created:' as info;
SELECT 
  p.id as pickup_id,
  c.email as customer_email,
  c.full_name as customer_name,
  col.email as collector_email,
  col.full_name as collector_name,
  a.line1 as address,
  p.status,
  p.started_at
FROM public.pickups p
JOIN public.profiles c ON p.customer_id = c.id
JOIN public.profiles col ON p.collector_id = col.id
JOIN public.addresses a ON p.address_id = a.id
ORDER BY p.started_at DESC;

-- Show final counts
SELECT 'Final Counts:' as info;
SELECT 
  'Profiles' as table_name,
  COUNT(*) as count
FROM public.profiles
UNION ALL
SELECT 
  'Addresses' as table_name,
  COUNT(*) as count
FROM public.addresses
UNION ALL
SELECT 
  'Pickups' as table_name,
  COUNT(*) as count
FROM public.pickups;
