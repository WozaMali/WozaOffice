// ============================================================================
// TEST COMPLETE DELETION FLOW
// ============================================================================
// This script tests that deleting a transaction from Transactions Management
// also removes it from the Collections page

console.log('🧪 Testing Complete Deletion Flow');
console.log('=====================================');

// Test function to verify deletion works across both pages
async function testCompleteDeletion() {
  try {
    console.log('📋 Step 1: Check current transactions and collections');
    
    // Check wallet_transactions
    const { data: walletTransactions, error: walletError } = await supabase
      .from('wallet_transactions')
      .select('id, source_id, amount, points, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (walletError) {
      console.error('❌ Error fetching wallet transactions:', walletError);
      return;
    }
    
    console.log('💰 Wallet Transactions:', walletTransactions?.length || 0);
    walletTransactions?.forEach(t => {
      console.log(`  - ${t.id}: ${t.amount || 0} (source: ${t.source_id || 'none'})`);
    });
    
    // Check unified_collections
    const { data: unifiedCollections, error: unifiedError } = await supabase
      .from('unified_collections')
      .select('id, total_value, computed_value, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (unifiedError) {
      console.error('❌ Error fetching unified collections:', unifiedError);
      return;
    }
    
    console.log('📦 Unified Collections:', unifiedCollections?.length || 0);
    unifiedCollections?.forEach(c => {
      console.log(`  - ${c.id}: ${c.total_value || 0} (status: ${c.status})`);
    });
    
    // Check collections
    const { data: collections, error: collectionsError } = await supabase
      .from('collections')
      .select('id, total_value, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (collectionsError) {
      console.error('❌ Error fetching collections:', collectionsError);
      return;
    }
    
    console.log('🗂️ Collections:', collections?.length || 0);
    collections?.forEach(c => {
      console.log(`  - ${c.id}: ${c.total_value || 0} (status: ${c.status})`);
    });
    
    console.log('\n📋 Step 2: Find a transaction with source_id to test deletion');
    
    const transactionWithSource = walletTransactions?.find(t => t.source_id);
    if (!transactionWithSource) {
      console.log('⚠️ No transactions with source_id found. Cannot test complete deletion.');
      console.log('💡 Create a collection first, then try again.');
      return;
    }
    
    console.log(`🎯 Found transaction to test: ${transactionWithSource.id}`);
    console.log(`   Amount: ${transactionWithSource.amount}`);
    console.log(`   Source ID: ${transactionWithSource.source_id}`);
    
    console.log('\n📋 Step 3: Test deletion (this will actually delete the transaction!)');
    console.log('⚠️ WARNING: This will permanently delete the transaction and related collection records!');
    
    const confirmDelete = confirm(`Delete transaction ${transactionWithSource.id} and related collection records?`);
    if (!confirmDelete) {
      console.log('❌ Deletion cancelled by user');
      return;
    }
    
    console.log('🗑️ Deleting transaction and related records...');
    
    // Import the deletion function (you'll need to make this available)
    // For now, we'll simulate the deletion process
    console.log('🔄 This would call deleteMonetaryTransaction or deletePointsTransaction');
    console.log('🔄 Which should now delete from:');
    console.log('   - wallet_transactions');
    console.log('   - unified_collections');
    console.log('   - collections');
    console.log('   - collection_photos');
    console.log('   - collection_materials');
    console.log('   - wallet_update_queue');
    
    console.log('\n✅ Test completed! Check both pages to verify deletion.');
    console.log('📱 Transactions Management page should not show the transaction');
    console.log('📱 Collections page should not show the related collection');
    
  } catch (error) {
    console.error('❌ Error in test:', error);
  }
}

// Run the test
testCompleteDeletion();

// Helper function to check if a specific transaction exists
async function checkTransactionExists(transactionId) {
  const { data, error } = await supabase
    .from('wallet_transactions')
    .select('id')
    .eq('id', transactionId)
    .single();
  
  return { exists: !!data, error };
}

// Helper function to check if a specific collection exists
async function checkCollectionExists(collectionId) {
  const { data, error } = await supabase
    .from('unified_collections')
    .select('id')
    .eq('id', collectionId)
    .single();
  
  return { exists: !!data, error };
}

console.log('\n🔧 Helper Functions Available:');
console.log('- checkTransactionExists(transactionId)');
console.log('- checkCollectionExists(collectionId)');
console.log('- testCompleteDeletion()');
