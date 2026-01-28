// ============================================================================
// DEBUG SPECIFIC TRANSACTION
// ============================================================================
// Debug the transaction f7a3ac9e-a0d8-4176-ab5b-124c3f1c09cc

const transactionId = 'f7a3ac9e-a0d8-4176-ab5b-124c3f1c09cc';

console.log('🔍 Debugging Transaction:', transactionId);
console.log('=====================================');

async function debugTransaction() {
  try {
    console.log('📋 Step 1: Check if transaction exists in wallet_transactions');
    
    const { data: walletTransaction, error: walletError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('id', transactionId)
      .single();
    
    if (walletError) {
      console.log('❌ Wallet transaction not found:', walletError.message);
    } else {
      console.log('✅ Wallet transaction found:');
      console.log('   ID:', walletTransaction.id);
      console.log('   Amount:', walletTransaction.amount);
      console.log('   Points:', walletTransaction.points);
      console.log('   Source ID:', walletTransaction.source_id);
      console.log('   User ID:', walletTransaction.user_id);
      console.log('   Created:', walletTransaction.created_at);
    }
    
    console.log('\n📋 Step 2: Check if related collection exists in unified_collections');
    
    if (walletTransaction?.source_id) {
      const { data: unifiedCollection, error: unifiedError } = await supabase
        .from('unified_collections')
        .select('*')
        .eq('id', walletTransaction.source_id)
        .single();
      
      if (unifiedError) {
        console.log('❌ Unified collection not found:', unifiedError.message);
      } else {
        console.log('✅ Unified collection found:');
        console.log('   ID:', unifiedCollection.id);
        console.log('   Total Value:', unifiedCollection.total_value);
        console.log('   Computed Value:', unifiedCollection.computed_value);
        console.log('   Status:', unifiedCollection.status);
        console.log('   Created:', unifiedCollection.created_at);
      }
    }
    
    console.log('\n📋 Step 3: Check if related collection exists in collections table');
    
    if (walletTransaction?.source_id) {
      const { data: collection, error: collectionError } = await supabase
        .from('collections')
        .select('*')
        .eq('id', walletTransaction.source_id)
        .single();
      
      if (collectionError) {
        console.log('❌ Collection not found:', collectionError.message);
      } else {
        console.log('✅ Collection found:');
        console.log('   ID:', collection.id);
        console.log('   Total Value:', collection.total_value);
        console.log('   Status:', collection.status);
        console.log('   Created:', collection.created_at);
      }
    }
    
    console.log('\n📋 Step 4: Check related collection_photos');
    
    if (walletTransaction?.source_id) {
      const { data: photos, error: photosError } = await supabase
        .from('collection_photos')
        .select('*')
        .eq('collection_id', walletTransaction.source_id);
      
      if (photosError) {
        console.log('❌ Error fetching photos:', photosError.message);
      } else {
        console.log('📸 Collection photos:', photos?.length || 0);
        photos?.forEach(photo => {
          console.log('   - Photo ID:', photo.id);
        });
      }
    }
    
    console.log('\n📋 Step 5: Check related collection_materials');
    
    if (walletTransaction?.source_id) {
      const { data: materials, error: materialsError } = await supabase
        .from('collection_materials')
        .select('*')
        .eq('collection_id', walletTransaction.source_id);
      
      if (materialsError) {
        console.log('❌ Error fetching materials:', materialsError.message);
      } else {
        console.log('🧱 Collection materials:', materials?.length || 0);
        materials?.forEach(material => {
          console.log('   - Material ID:', material.id);
        });
      }
    }
    
    console.log('\n📋 Step 6: Check related wallet_update_queue entries');
    
    if (walletTransaction?.source_id) {
      const { data: queueEntries, error: queueError } = await supabase
        .from('wallet_update_queue')
        .select('*')
        .eq('collection_id', walletTransaction.source_id);
      
      if (queueError) {
        console.log('❌ Error fetching queue entries:', queueError.message);
      } else {
        console.log('📋 Queue entries:', queueEntries?.length || 0);
        queueEntries?.forEach(entry => {
          console.log('   - Queue ID:', entry.id);
        });
      }
    }
    
    console.log('\n📋 Step 7: Manual deletion test');
    
    if (walletTransaction) {
      console.log('🗑️ Attempting to manually delete the transaction...');
      
      // Delete wallet transaction
      const { error: deleteWalletError } = await supabase
        .from('wallet_transactions')
        .delete()
        .eq('id', transactionId);
      
      if (deleteWalletError) {
        console.log('❌ Error deleting wallet transaction:', deleteWalletError.message);
      } else {
        console.log('✅ Wallet transaction deleted successfully');
      }
      
      // Delete from unified_collections if source_id exists
      if (walletTransaction.source_id) {
        const { error: deleteUnifiedError } = await supabase
          .from('unified_collections')
          .delete()
          .eq('id', walletTransaction.source_id);
        
        if (deleteUnifiedError) {
          console.log('❌ Error deleting unified collection:', deleteUnifiedError.message);
        } else {
          console.log('✅ Unified collection deleted successfully');
        }
        
        // Delete from collections
        const { error: deleteCollectionError } = await supabase
          .from('collections')
          .delete()
          .eq('id', walletTransaction.source_id);
        
        if (deleteCollectionError) {
          console.log('❌ Error deleting collection:', deleteCollectionError.message);
        } else {
          console.log('✅ Collection deleted successfully');
        }
        
        // Delete related records
        await supabase.from('collection_photos').delete().eq('collection_id', walletTransaction.source_id);
        await supabase.from('collection_materials').delete().eq('collection_id', walletTransaction.source_id);
        await supabase.from('wallet_update_queue').delete().eq('collection_id', walletTransaction.source_id);
        
        console.log('✅ Related records deleted');
      }
    }
    
    console.log('\n✅ Debug completed! Check both pages to see if the transaction is gone.');
    
  } catch (error) {
    console.error('❌ Error in debug:', error);
  }
}

// Run the debug
debugTransaction();

console.log('\n🔧 Manual deletion functions available:');
console.log('- debugTransaction() - Run the full debug process');
