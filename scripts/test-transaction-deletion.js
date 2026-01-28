/**
 * Test script to verify transaction deletion functionality
 * Run this in your browser console on the Office App transactions page
 */

// Test function to check if we can delete a transaction
async function testTransactionDeletion() {
  console.log('🧪 Testing transaction deletion...');
  
  try {
    // First, let's see what transactions we have
    const { data: transactions, error: fetchError } = await supabase
      .from('wallet_transactions')
      .select('id, user_id, transaction_type, amount, points, source_id')
      .limit(5);
    
    if (fetchError) {
      console.error('❌ Error fetching transactions:', fetchError);
      return;
    }
    
    console.log('📋 Found transactions:', transactions);
    
    if (transactions && transactions.length > 0) {
      const testTransaction = transactions[0];
      console.log('🎯 Testing deletion of transaction:', testTransaction.id);
      
      // Try to delete the first transaction
      const { error: deleteError, count } = await supabase
        .from('wallet_transactions')
        .delete()
        .eq('id', testTransaction.id);
      
      if (deleteError) {
        console.error('❌ Deletion failed:', deleteError);
        console.error('Error details:', {
          code: deleteError.code,
          message: deleteError.message,
          details: deleteError.details,
          hint: deleteError.hint
        });
      } else {
        console.log('✅ Deletion successful! Rows affected:', count);
      }
    } else {
      console.log('ℹ️ No transactions found to test with');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Test function to check RLS policies
async function testRLSPolicies() {
  console.log('🔒 Testing RLS policies...');
  
  try {
    // Check if we can query the table
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Cannot query wallet_transactions:', error);
    } else {
      console.log('✅ Can query wallet_transactions');
    }
    
    // Check current user
    const { data: { user } } = await supabase.auth.getUser();
    console.log('👤 Current user:', user?.id);
    
    // Check user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('id', user?.id)
      .single();
    
    if (profileError) {
      console.error('❌ Cannot fetch user profile:', profileError);
    } else {
      console.log('👤 User profile:', profile);
    }
    
  } catch (error) {
    console.error('❌ RLS test failed:', error);
  }
}

// Run the tests
console.log('🚀 Starting transaction deletion tests...');
testRLSPolicies().then(() => {
  console.log('---');
  testTransactionDeletion();
});
