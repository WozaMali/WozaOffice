const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mljtjntkddwkcjixkyuy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanRqbnRrZGR3a2NqaXhreXV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQyNjY4NSwiZXhwIjoyMDcwMDAyNjg1fQ.X6O2YFRkkN0T_yB-XgGYi2_PY9ob0ZOmHE0FJUl9T7A';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCreatedAtFix() {
  try {
    console.log('🔍 Testing created_at constraint fix...');
    
    // First, let's check the current deleted_transactions table structure
    console.log('📊 Checking deleted_transactions table structure...');
    
    const { data: tableInfo, error: tableError } = await supabase
      .from('deleted_transactions')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.log('❌ Error accessing deleted_transactions:', tableError);
      if (tableError.message.includes('relation "deleted_transactions" does not exist')) {
        console.log('📝 The deleted_transactions table needs to be created first');
        console.log('🔗 Please run the FIX_CREATED_AT_CONSTRAINT.sql script in Supabase SQL Editor');
        return;
      }
    } else {
      console.log('✅ deleted_transactions table exists');
    }
    
    // Test the function with a real collection ID
    console.log('🧪 Testing soft_delete_collection function...');
    
    // Get a collection to test with
    const { data: collections, error: collectionsError } = await supabase
      .from('unified_collections')
      .select('id, total_weight_kg, total_value, status')
      .limit(1);
    
    if (collectionsError) {
      console.log('❌ Error getting collections:', collectionsError);
      return;
    }
    
    if (!collections || collections.length === 0) {
      console.log('⚠️ No collections found to test with');
      return;
    }
    
    const testCollectionId = collections[0].id;
    console.log('📋 Testing with collection:', testCollectionId);
    
    // Test the function
    const { data: testData, error: testError } = await supabase.rpc('soft_delete_collection', {
      p_collection_id: testCollectionId,
      p_deleted_by: '00000000-0000-0000-0000-000000000000', // Test user ID
      p_deletion_reason: 'Test deletion for created_at fix'
    });
    
    console.log('Test result:', testData, testError);
    
    if (testError) {
      if (testError.message.includes('created_at')) {
        console.log('❌ Created_at constraint error still exists');
        console.log('📝 The function needs to be updated to handle created_at properly');
      } else if (testError.message.includes('Insufficient permissions')) {
        console.log('✅ Function is working but needs proper authentication');
        console.log('📝 The created_at constraint issue appears to be fixed');
      } else {
        console.log('❌ Other error:', testError.message);
      }
    } else {
      console.log('✅ Function executed successfully!');
    }
    
  } catch (err) {
    console.error('❌ Exception:', err);
  }
}

testCreatedAtFix();
