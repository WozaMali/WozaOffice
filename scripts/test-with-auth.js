const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mljtjntkddwkcjixkyuy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanRqbnRrZGR3a2NqaXhreXV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQyNjY4NSwiZXhwIjoyMDcwMDAyNjg1fQ.X6O2YFRkkN0T_yB-XgGYi2_PY9ob0ZOmHE0FJUl9T7A';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testWithAuth() {
  try {
    console.log('🔐 Testing soft delete with authentication...');
    
    // First, let's find a super admin user
    console.log('👤 Looking for super admin users...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('role', 'super_admin')
      .limit(1);
    
    if (usersError) {
      console.log('❌ Error getting users:', usersError.message);
      return;
    }
    
    if (!users || users.length === 0) {
      console.log('⚠️ No super admin users found');
      console.log('📝 Creating a test super admin user...');
      
      // Create a test super admin user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          id: '00000000-0000-0000-0000-000000000001',
          email: 'test-superadmin@wozamali.co.za',
          role: 'super_admin',
          full_name: 'Test Super Admin'
        })
        .select()
        .single();
      
      if (createError) {
        console.log('❌ Error creating test user:', createError.message);
        return;
      }
      
      console.log('✅ Test super admin user created:', newUser.email);
      users.push(newUser);
    }
    
    const superAdminUser = users[0];
    console.log('👤 Using super admin:', superAdminUser.email, '(ID:', superAdminUser.id, ')');
    
    // Get a collection to test with
    console.log('📋 Getting a collection to test with...');
    const { data: collections, error: collectionsError } = await supabase
      .from('unified_collections')
      .select('id, total_weight_kg, total_value, status')
      .limit(1);
    
    if (collectionsError) {
      console.log('❌ Error getting collections:', collectionsError.message);
      return;
    }
    
    if (!collections || collections.length === 0) {
      console.log('⚠️ No collections found to test with');
      return;
    }
    
    const testCollection = collections[0];
    console.log('📋 Testing with collection:', {
      id: testCollection.id,
      weight: testCollection.total_weight_kg,
      value: testCollection.total_value,
      status: testCollection.status
    });
    
    // Test the function with the super admin user
    console.log('🧪 Testing soft_delete_collection function...');
    const { data: result, error: error } = await supabase.rpc('soft_delete_collection', {
      p_collection_id: testCollection.id,
      p_deleted_by: superAdminUser.id,
      p_deletion_reason: 'Test deletion with proper authentication'
    });
    
    console.log('📊 Function result:', result);
    console.log('📊 Function error:', error);
    
    if (error) {
      if (error.message.includes('weight_kg')) {
        console.log('❌ Weight field error still exists');
      } else if (error.message.includes('created_at')) {
        console.log('❌ Created_at constraint error still exists');
      } else {
        console.log('❌ Other error:', error.message);
      }
    } else if (result && result.success) {
      console.log('✅ SUCCESS! Soft delete function is working correctly!');
      console.log('📊 Deleted transaction ID:', result.deleted_transaction_id);
      
      // Verify the record was moved to deleted_transactions
      console.log('🔍 Verifying record was moved to deleted_transactions...');
      const { data: deletedRecord, error: deletedError } = await supabase
        .from('deleted_transactions')
        .select('*')
        .eq('original_collection_id', testCollection.id)
        .single();
      
      if (deletedError) {
        console.log('❌ Error verifying deleted record:', deletedError.message);
      } else {
        console.log('✅ Record successfully moved to deleted_transactions');
        console.log('📊 Deleted record:', {
          id: deletedRecord.id,
          weight_kg: deletedRecord.weight_kg,
          total_value: deletedRecord.total_value,
          created_at: deletedRecord.created_at
        });
      }
    } else {
      console.log('❌ Function returned unsuccessful result:', result);
    }
    
  } catch (err) {
    console.error('❌ Exception in auth test:', err);
  }
}

testWithAuth();
