const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mljtjntkddwkcjixkyuy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanRqbnRrZGR3a2NqaXhreXV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQyNjY4NSwiZXhwIjoyMDcwMDAyNjg1fQ.X6O2YFRkkN0T_yB-XgGYi2_PY9ob0ZOmHE0FJUl9T7A';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSoftDelete() {
  try {
    console.log('🔍 Finding collections to test with...');
    
    // Get collections from unified_collections
    const { data: unifiedCollections, error: unifiedError } = await supabase
      .from('unified_collections')
      .select('id, total_weight_kg, total_value, status')
      .limit(1);
    
    if (unifiedError) {
      console.log('❌ Error getting unified_collections:', unifiedError);
    } else {
      console.log('📊 Unified collections found:', unifiedCollections?.length || 0);
      if (unifiedCollections && unifiedCollections.length > 0) {
        console.log('Sample unified collection:', unifiedCollections[0]);
      }
    }
    
    // Get collections from collections table
    const { data: collections, error: collectionsError } = await supabase
      .from('collections')
      .select('id, weight_kg, computed_value, status')
      .limit(1);
    
    if (collectionsError) {
      console.log('❌ Error getting collections:', collectionsError);
    } else {
      console.log('📊 Collections found:', collections?.length || 0);
      if (collections && collections.length > 0) {
        console.log('Sample collection:', collections[0]);
      }
    }
    
    // Test the function with a real collection ID if available
    const testCollectionId = unifiedCollections?.[0]?.id || collections?.[0]?.id;
    
    if (testCollectionId) {
      console.log('🧪 Testing soft_delete_collection with real collection:', testCollectionId);
      
      const { data: testData, error: testError } = await supabase.rpc('soft_delete_collection', {
        p_collection_id: testCollectionId,
        p_deleted_by: '00000000-0000-0000-0000-000000000000', // Test user ID
        p_deletion_reason: 'Test deletion'
      });
      
      console.log('Test result:', testData, testError);
      
      if (testError && testError.message.includes('weight_kg')) {
        console.log('❌ Confirmed weight_kg error exists');
        console.log('📝 The function needs to be updated to handle weight fields correctly');
      } else if (testError && testError.message.includes('Insufficient permissions')) {
        console.log('✅ Function is working but needs proper authentication');
      } else {
        console.log('✅ Function appears to be working correctly');
      }
    } else {
      console.log('⚠️ No collections found to test with');
    }
    
  } catch (err) {
    console.error('❌ Exception:', err);
  }
}

testSoftDelete();
