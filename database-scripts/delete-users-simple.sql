-- ============================================================================
-- SIMPLE DELETE: USERS CREATED YESTERDAY AND TODAY
-- ============================================================================
-- WARNING: This will permanently delete users. Review first!

-- First, see what will be deleted:
SELECT 
    id,
    email,
    full_name,
    created_at
FROM public.users
WHERE created_at >= DATE_TRUNC('day', CURRENT_DATE - INTERVAL '1 day')
  AND created_at < DATE_TRUNC('day', CURRENT_DATE + INTERVAL '1 day')
ORDER BY created_at DESC;

-- Then delete (uncomment to execute):
/*
DELETE FROM public.users
WHERE created_at >= DATE_TRUNC('day', CURRENT_DATE - INTERVAL '1 day')
  AND created_at < DATE_TRUNC('day', CURRENT_DATE + INTERVAL '1 day');
*/

