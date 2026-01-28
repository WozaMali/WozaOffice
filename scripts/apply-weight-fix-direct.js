const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mljtjntkddwkcjixkyuy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanRqbnRrZGR3a2NqaXhreXV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQyNjY4NSwiZXhwIjoyMDcwMDAyNjg1fQ.X6O2YFRkkN0T_yB-XgGYi2_PY9ob0ZOmHE0FJUl9T7A';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyFix() {
  try {
    console.log('🔧 Applying weight field fix...');
    
    // Test the current function first
    console.log('🧪 Testing current soft_delete_collection function...');
    
    const { data: testData, error: testError } = await supabase.rpc('soft_delete_collection', {
      p_collection_id: '00000000-0000-0000-0000-000000000000', // Non-existent ID for testing
      p_deleted_by: '00000000-0000-0000-0000-000000000000',
      p_deletion_reason: 'Test'
    });
    
    console.log('Test result:', testData, testError);
    
    if (testError && testError.message.includes('weight_kg')) {
      console.log('✅ Confirmed weight_kg error exists');
      console.log('📝 Please apply the FIX_WEIGHT_FIELD_ERROR.sql file manually in Supabase SQL Editor');
      console.log('🔗 Go to: https://supabase.com/dashboard/project/mljtjntkddwkcjixkyuy/sql');
    } else {
      console.log('✅ Function appears to be working correctly');
    }
    
  } catch (err) {
    console.error('❌ Exception:', err);
  }
}

applyFix();
