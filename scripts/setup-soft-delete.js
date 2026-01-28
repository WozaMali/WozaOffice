const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
);

async function setupSoftDelete() {
  console.log('🔧 Setting up soft delete functionality...');
  
  try {
    // 1. Create deleted_transactions table
    console.log('📋 Creating deleted_transactions table...');
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.deleted_transactions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        original_collection_id uuid NOT NULL,
        collection_code text,
        status text NOT NULL,
        customer_id uuid,
        collector_id uuid,
        weight_kg numeric(10,2),
        total_value numeric(12,2),
        deleted_by uuid NOT NULL,
        deletion_reason text,
        original_data jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `;
    
    const { error: tableError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    if (tableError) {
      console.log('❌ Error creating table:', tableError.message);
      return;
    }
    console.log('✅ deleted_transactions table created');
    
    // 2. Create soft_delete_collection function
    console.log('🔧 Creating soft_delete_collection function...');
    const createFunctionSQL = `
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
      BEGIN
        -- Get the collection data
        SELECT * INTO v_collection FROM public.unified_collections WHERE id = p_collection_id;
        IF NOT FOUND THEN
          SELECT * INTO v_collection FROM public.collections WHERE id = p_collection_id;
          IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'Collection not found');
          END IF;
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
          original_data
        ) VALUES (
          v_collection.id,
          COALESCE(v_collection.collection_code, ''),
          v_collection.status,
          COALESCE(v_collection.customer_id, v_collection.user_id),
          v_collection.collector_id,
          COALESCE(v_collection.total_weight_kg, 0),
          COALESCE(v_collection.total_value, 0),
          p_deleted_by,
          p_deletion_reason,
          v_original_data
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
    `;
    
    const { error: functionError } = await supabase.rpc('exec_sql', { sql: createFunctionSQL });
    if (functionError) {
      console.log('❌ Error creating function:', functionError.message);
      return;
    }
    console.log('✅ soft_delete_collection function created');
    
    // 3. Grant permissions
    console.log('🔐 Setting up permissions...');
    const grantSQL = `
      GRANT EXECUTE ON FUNCTION public.soft_delete_collection(uuid, uuid, text) TO authenticated;
      GRANT SELECT, INSERT ON public.deleted_transactions TO authenticated;
    `;
    
    const { error: grantError } = await supabase.rpc('exec_sql', { sql: grantSQL });
    if (grantError) {
      console.log('❌ Error setting permissions:', grantError.message);
      return;
    }
    console.log('✅ Permissions granted');
    
    console.log('🎉 Soft delete functionality setup complete!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  }
}

setupSoftDelete();
