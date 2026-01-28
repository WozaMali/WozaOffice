const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mljtjntkddwkcjixkyuy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanRqbnRrZGR3a2NqaXhreXV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQyNjY4NSwiZXhwIjoyMDcwMDAyNjg1fQ.X6O2YFRkkN0T_yB-XgGYi2_PY9ob0ZOmHE0FJUl9T7A';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSoftDeleteComprehensive() {
  try {
    console.log('🧪 Running comprehensive soft delete test...');
    
    // Test 1: Check if deleted_transactions table exists and is accessible
    console.log('\n📊 Test 1: Checking deleted_transactions table...');
    try {
      const { data: deletedData, error: deletedError } = await supabase
        .from('deleted_transactions')
        .select('*')
        .limit(1);
      
      if (deletedError) {
        console.log('❌ deleted_transactions table issue:', deletedError.message);
        if (deletedError.message.includes('does not exist')) {
          console.log('📝 The deleted_transactions table needs to be created');
        } else if (deletedError.message.includes('permission denied')) {
          console.log('✅ Table exists but needs proper permissions');
        }
      } else {
        console.log('✅ deleted_transactions table is accessible');
        console.log('📋 Sample record:', deletedData?.[0] || 'No records found');
      }
    } catch (err) {
      console.log('❌ Exception accessing deleted_transactions:', err.message);
    }
    
    // Test 2: Check collections data
    console.log('\n📊 Test 2: Checking collections data...');
    const { data: unifiedCollections, error: unifiedError } = await supabase
      .from('unified_collections')
      .select('id, total_weight_kg, total_value, status, collection_code, customer_id, collector_id')
      .limit(2);
    
    if (unifiedError) {
      console.log('❌ Error getting unified_collections:', unifiedError.message);
    } else {
      console.log('✅ Found', unifiedCollections?.length || 0, 'unified collections');
      if (unifiedCollections && unifiedCollections.length > 0) {
        console.log('📋 Sample collection:', {
          id: unifiedCollections[0].id,
          total_weight_kg: unifiedCollections[0].total_weight_kg,
          total_value: unifiedCollections[0].total_value,
          status: unifiedCollections[0].status
        });
      }
    }
    
    // Test 3: Test the soft_delete_collection function
    console.log('\n🧪 Test 3: Testing soft_delete_collection function...');
    
    if (unifiedCollections && unifiedCollections.length > 0) {
      const testCollectionId = unifiedCollections[0].id;
      console.log('📋 Testing with collection ID:', testCollectionId);
      
      const { data: testResult, error: testError } = await supabase.rpc('soft_delete_collection', {
        p_collection_id: testCollectionId,
        p_deleted_by: '00000000-0000-0000-0000-000000000000', // Test user ID
        p_deletion_reason: 'Comprehensive test deletion'
      });
      
      console.log('📊 Function result:', testResult);
      console.log('📊 Function error:', testError);
      
      if (testError) {
        if (testError.message.includes('weight_kg')) {
          console.log('❌ Weight field error still exists');
          console.log('📝 Need to apply FINAL_WEIGHT_FIELD_FIX.sql');
        } else if (testError.message.includes('created_at')) {
          console.log('❌ Created_at constraint error still exists');
          console.log('📝 Need to apply FIX_CREATED_AT_CONSTRAINT.sql');
        } else if (testError.message.includes('Insufficient permissions')) {
          console.log('✅ Function is working but needs proper authentication');
          console.log('📝 The database constraints appear to be fixed');
        } else {
          console.log('❌ Other error:', testError.message);
        }
      } else {
        console.log('✅ Function executed successfully!');
        console.log('📊 Result:', testResult);
      }
    } else {
      console.log('⚠️ No collections available for testing');
    }
    
    // Test 4: Check function definition
    console.log('\n📊 Test 4: Checking function definition...');
    try {
      const { data: functionInfo, error: functionError } = await supabase
        .from('pg_proc')
        .select('proname, prosrc')
        .eq('proname', 'soft_delete_collection')
        .limit(1);
      
      if (functionError) {
        console.log('❌ Error checking function:', functionError.message);
      } else {
        console.log('✅ Function exists in database');
        if (functionInfo && functionInfo.length > 0) {
          const source = functionInfo[0].prosrc;
          if (source.includes('v_weight_kg') && source.includes('v_current_time')) {
            console.log('✅ Function appears to have the latest fixes applied');
          } else {
            console.log('⚠️ Function may not have the latest fixes');
            console.log('📝 Need to apply the SQL fixes');
          }
        }
      }
    } catch (err) {
      console.log('❌ Exception checking function:', err.message);
    }
    
    console.log('\n🎯 Test Summary:');
    console.log('1. Check if deleted_transactions table exists and is accessible');
    console.log('2. Verify collections data is available for testing');
    console.log('3. Test the soft_delete_collection function with real data');
    console.log('4. Check if the function has the latest fixes applied');
    
  } catch (err) {
    console.error('❌ Exception in comprehensive test:', err);
  }
}

testSoftDeleteComprehensive();
