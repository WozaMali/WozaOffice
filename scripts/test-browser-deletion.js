/**
 * Browser Console Test for Transaction Deletion
 * Run this in your browser console on the Office App transactions page
 */

// Test 1: Check if we can query transactions
async function testQueryTransactions() {
  console.log('🔍 Testing transaction query...');
  
  try {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('id, user_id, amount, points, source_id, created_at')
      .limit(5);
    
    if (error) {
      console.error('❌ Query failed:', error);
      return false;
    }
    
    console.log('✅ Query successful. Found transactions:', data);
    return data;
  } catch (err) {
    console.error('❌ Query exception:', err);
    return false;
  }
}

// Test 2: Check current user and role
async function testUserContext() {
  console.log('👤 Testing user context...');
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('❌ User error:', userError);
      return false;
    }
    
    console.log('👤 Current user ID:', user?.id);
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, role, full_name')
      .eq('id', user?.id)
      .single();
    
    if (profileError) {
      console.error('❌ Profile error:', profileError);
      return false;
    }
    
    console.log('👤 User profile:', profile);
    return profile;
  } catch (err) {
    console.error('❌ User context exception:', err);
    return false;
  }
}

// Test 3: Try to delete a transaction
async function testDeleteTransaction(transactionId) {
  console.log('🗑️ Testing deletion of transaction:', transactionId);
  
  try {
    // First, verify the transaction exists
    const { data: existing, error: fetchError } = await supabase
      .from('wallet_transactions')
      .select('id, amount, points')
      .eq('id', transactionId)
      .single();
    
    if (fetchError || !existing) {
      console.error('❌ Transaction not found:', fetchError);
      return false;
    }
    
    console.log('📋 Transaction exists:', existing);
    
    // Try to delete it
    const { error: deleteError, count } = await supabase
      .from('wallet_transactions')
      .delete()
      .eq('id', transactionId);
    
    if (deleteError) {
      console.error('❌ Deletion failed:', deleteError);
      console.error('Error details:', {
        code: deleteError.code,
        message: deleteError.message,
        details: deleteError.details,
        hint: deleteError.hint
      });
      return false;
    }
    
    console.log('✅ Deletion successful! Rows affected:', count);
    
    // Verify it's actually gone
    const { data: verify, error: verifyError } = await supabase
      .from('wallet_transactions')
      .select('id')
      .eq('id', transactionId)
      .single();
    
    if (verifyError && verifyError.code === 'PGRST116') {
      console.log('✅ Transaction confirmed deleted (not found)');
    } else if (verify) {
      console.error('❌ Transaction still exists after deletion!');
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('❌ Deletion exception:', err);
    return false;
  }
}

// Test 4: Check RLS policies
async function testRLSPolicies() {
  console.log('🔒 Testing RLS policies...');
  
  try {
    // This query should work if RLS policies are correct
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ RLS policy test failed:', error);
      return false;
    }
    
    console.log('✅ RLS policies allow query');
    return true;
  } catch (err) {
    console.error('❌ RLS test exception:', err);
    return false;
  }
}

// Main test function
async function runAllTests() {
  console.log('🚀 Starting comprehensive deletion tests...');
  console.log('=====================================');
  
  // Test 1: User context
  const userProfile = await testUserContext();
  if (!userProfile) {
    console.error('❌ Cannot proceed without user context');
    return;
  }
  
  if (userProfile.role !== 'admin') {
    console.warn('⚠️ User is not admin. RLS policies may not work correctly.');
  }
  
  console.log('---');
  
  // Test 2: RLS policies
  const rlsOk = await testRLSPolicies();
  if (!rlsOk) {
    console.error('❌ RLS policies are not working correctly');
    return;
  }
  
  console.log('---');
  
  // Test 3: Query transactions
  const transactions = await testQueryTransactions();
  if (!transactions || transactions.length === 0) {
    console.log('ℹ️ No transactions found to test deletion');
    return;
  }
  
  console.log('---');
  
  // Test 4: Delete a transaction
  const testTransaction = transactions[0];
  console.log('🎯 Testing deletion with transaction:', testTransaction.id);
  
  const deleteOk = await testDeleteTransaction(testTransaction.id);
  if (deleteOk) {
    console.log('🎉 ALL TESTS PASSED! Deletion is working correctly.');
  } else {
    console.log('❌ DELETION FAILED. Check the error messages above.');
  }
}

// Run the tests
runAllTests();
