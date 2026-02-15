-- ============================================================================
-- FIX SOFT DELETE PERMISSIONS FOR SUPER_ADMIN
-- ============================================================================
-- This script updates the soft_delete_collection function to properly check
-- for SUPER_ADMIN permissions and ensures RLS policies allow access

-- Step 1: Update the soft_delete_collection function to check for SUPER_ADMIN role
CREATE OR REPLACE FUNCTION public.soft_delete_collection(
  p_collection_id uuid,
  p_deleted_by uuid,
  p_deletion_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_collection RECORD;
  v_deleted_id uuid;
  v_original_data jsonb;
  v_user_role TEXT;
  v_customer_id UUID;
  v_weight_kg DECIMAL;
BEGIN
  -- Check if the user has SUPER_ADMIN role
  SELECT u.role INTO v_user_role
  FROM public.users u
  WHERE u.id = p_deleted_by;
  
  -- Allow SUPER_ADMIN, superadmin, super_admin, or ADMIN roles
  IF v_user_role IS NULL OR 
     (v_user_role NOT IN ('SUPER_ADMIN', 'superadmin', 'super_admin', 'ADMIN', 'admin')) THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Insufficient permissions. Only super admin or admin users can delete collections.'
    );
  END IF;

  -- Get the collection data - try unified_collections first, then collections
  SELECT * INTO v_collection FROM public.unified_collections WHERE id = p_collection_id;
  IF FOUND THEN
    -- unified_collections uses customer_id
    v_customer_id := v_collection.customer_id;
    v_weight_kg := COALESCE(v_collection.total_weight_kg, 0);
  ELSE
    -- Try collections table (uses user_id)
    SELECT * INTO v_collection FROM public.collections WHERE id = p_collection_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Collection not found');
    END IF;
    -- collections table uses user_id instead of customer_id
    v_customer_id := v_collection.user_id;
    v_weight_kg := COALESCE(v_collection.kgs, v_collection.weight_kg, 0);
  END IF;

  -- Prepare original data for audit trail
  v_original_data := jsonb_build_object(
    'collection', row_to_json(v_collection)
  );

  -- Insert into deleted_transactions table
  INSERT INTO public.deleted_transactions (
    original_collection_id,
    collection_code,
    status,
    customer_id,
    collector_id,
    weight_kg,
    total_value,
    deleted_by,
    deletion_reason,
    original_data,
    created_at,
    updated_at
  ) VALUES (
    v_collection.id,
    COALESCE(v_collection.collection_code, ''),
    v_collection.status,
    v_customer_id,  -- Use the determined customer_id/user_id
    v_collection.collector_id,
    v_weight_kg,  -- Use the determined weight
    COALESCE(v_collection.total_value, 0),
    p_deleted_by,
    p_deletion_reason,
    v_original_data,
    NOW(),  -- Explicitly set created_at
    NOW()   -- Explicitly set updated_at
  ) RETURNING id INTO v_deleted_id;

  -- Delete from the original table
  DELETE FROM public.unified_collections WHERE id = p_collection_id;
  DELETE FROM public.collections WHERE id = p_collection_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Collection successfully moved to deleted transactions',
    'deleted_transaction_id', v_deleted_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Step 2: Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.soft_delete_collection(uuid, uuid, text) TO authenticated;

-- Step 3: Ensure RLS policies allow SUPER_ADMIN to access deleted_transactions
-- Drop existing policies if they're too restrictive
DROP POLICY IF EXISTS "Users can insert deleted transactions" ON public.deleted_transactions;
DROP POLICY IF EXISTS "Admins can manage deleted transactions" ON public.deleted_transactions;

-- Create a policy that allows SUPER_ADMIN and ADMIN to insert into deleted_transactions
CREATE POLICY "Admins can manage deleted transactions" ON public.deleted_transactions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('SUPER_ADMIN', 'superadmin', 'super_admin', 'ADMIN', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('SUPER_ADMIN', 'superadmin', 'super_admin', 'ADMIN', 'admin')
    )
  );

-- Step 4: Verify the function was created correctly
SELECT 'Function updated successfully. Testing with dumisani user...' as info;

-- Step 5: Check dumisani's current role
SELECT 
  u.id,
  u.email,
  u.role,
  u.role_id,
  r.name as role_name_from_table
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
WHERE LOWER(u.email) = LOWER('dumisani@sebenzawaste.co.za');
