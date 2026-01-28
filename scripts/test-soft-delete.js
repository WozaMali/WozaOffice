const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
);

async function testSoftDelete() {
  console.log('🧪 Testing soft delete functionality...');
  
  try {
    // 1. Get a test collection
    const { data: collections, error: fetchError } = await supabase
      .from('unified_collections')
      .select('id, collection_code, status')
      .limit(1);
    
    if (fetchError) {
      console.log('❌ Error fetching collections:', fetchError.message);
      return;
    }
    
    if (!collections || collections.length === 0) {
      console.log('❌ No collections found to test with');
      return;
    }
    
    const testCollection = collections[0];
    console.log('📋 Test collection:', testCollection);
    
    // 2. Test the soft delete function
    console.log('🗑️ Testing soft delete function...');
    const { data: result, error: deleteError } = await supabase.rpc('soft_delete_collection', {
      p_collection_id: testCollection.id,
      p_deleted_by: '00000000-0000-0000-0000-000000000000', // Test user ID
      p_deletion_reason: 'Test deletion'
    });
    
    if (deleteError) {
      console.log('❌ Soft delete function error:', deleteError.message);
      return;
    }
    
    console.log('✅ Soft delete result:', result);
    
    // 3. Check if it was moved to deleted_transactions
    if (result.success) {
      const { data: deleted, error: deletedError } = await supabase
        .from('deleted_transactions')
        .select('*')
        .eq('original_collection_id', testCollection.id);
      
      if (deletedError) {
        console.log('❌ Error checking deleted_transactions:', deletedError.message);
      } else {
        console.log('✅ Found in deleted_transactions:', deleted?.length || 0, 'records');
      }
    }
    
    // 4. Check if it was removed from original table
    const { data: stillExists, error: checkError } = await supabase
      .from('unified_collections')
      .select('id')
      .eq('id', testCollection.id);
    
    if (checkError) {
      console.log('❌ Error checking original table:', checkError.message);
    } else {
      console.log('✅ Removed from original table:', stillExists?.length === 0 ? 'Yes' : 'No');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSoftDelete();
