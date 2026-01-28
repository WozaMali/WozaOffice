/**
 * Reset Transactions Service
 * Handles resetting transactions for collections
 */

import { supabase } from './supabase';

export interface ResetTransactionsResult {
  success: boolean;
  message: string;
  resetCount?: number;
  error?: any;
}

/**
 * Reset transactions for a specific collection
 */
export async function resetCollectionTransactions(collectionId: string): Promise<ResetTransactionsResult> {
  try {
    console.log('🔄 Resetting transactions for collection:', collectionId);

    // Get the collection details first
    const { data: collection, error: collectionError } = await supabase
      .from('unified_collections')
      .select('id, customer_id, total_value, status')
      .eq('id', collectionId)
      .single();

    if (collectionError || !collection) {
      return {
        success: false,
        message: 'Collection not found',
        error: collectionError
      };
    }

    // Check if collection is approved (only reset approved collections)
    if (collection.status !== 'approved') {
      return {
        success: false,
        message: 'Can only reset transactions for approved collections'
      };
    }

    // Delete wallet transactions related to this collection
    const { error: walletTxError } = await supabase
      .from('wallet_transactions')
      .delete()
      .eq('source_id', collectionId);

    if (walletTxError) {
      console.warn('Warning: Could not delete wallet transactions:', walletTxError);
    }

    // Delete regular transactions related to this collection
    const { error: txError } = await supabase
      .from('transactions')
      .delete()
      .eq('source_id', collectionId);

    if (txError) {
      console.warn('Warning: Could not delete transactions:', txError);
    }

    // Delete wallet update queue entries
    const { error: queueError } = await supabase
      .from('wallet_update_queue')
      .delete()
      .eq('collection_id', collectionId);

    if (queueError) {
      console.warn('Warning: Could not delete wallet update queue entries:', queueError);
    }

    // Update collection status back to pending
    const { error: updateError } = await supabase
      .from('unified_collections')
      .update({ 
        status: 'pending',
        admin_notes: `Transactions reset on ${new Date().toISOString()}. Previous admin notes: ${(collection as any).admin_notes || 'None'}`
      })
      .eq('id', collectionId);

    if (updateError) {
      return {
        success: false,
        message: 'Failed to update collection status',
        error: updateError
      };
    }

    console.log('✅ Successfully reset transactions for collection:', collectionId);

    return {
      success: true,
      message: 'Transactions reset successfully. Collection status changed to pending.',
      resetCount: 1
    };

  } catch (error) {
    console.error('❌ Error resetting collection transactions:', error);
    return {
      success: false,
      message: 'Failed to reset transactions',
      error
    };
  }
}

/**
 * Reset transactions for multiple collections
 */
export async function resetMultipleCollectionTransactions(collectionIds: string[]): Promise<ResetTransactionsResult> {
  try {
    console.log('🔄 Resetting transactions for multiple collections:', collectionIds);

    let successCount = 0;
    const errors: string[] = [];

    for (const collectionId of collectionIds) {
      const result = await resetCollectionTransactions(collectionId);
      if (result.success) {
        successCount++;
      } else {
        errors.push(`Collection ${collectionId}: ${result.message}`);
      }
    }

    if (successCount === 0) {
      return {
        success: false,
        message: 'No transactions were reset',
        error: errors.join('; ')
      };
    }

    return {
      success: true,
      message: `Successfully reset transactions for ${successCount} collection(s)`,
      resetCount: successCount,
      error: errors.length > 0 ? errors.join('; ') : undefined
    };

  } catch (error) {
    console.error('❌ Error resetting multiple collection transactions:', error);
    return {
      success: false,
      message: 'Failed to reset transactions',
      error
    };
  }
}

/**
 * Get collection transaction status
 */
export async function getCollectionTransactionStatus(collectionId: string): Promise<{
  hasWalletTransactions: boolean;
  hasTransactions: boolean;
  hasQueueEntries: boolean;
  walletTransactionCount: number;
  transactionCount: number;
  queueEntryCount: number;
}> {
  try {
    // Check wallet transactions
    const { data: walletTxs, error: walletError } = await supabase
      .from('wallet_transactions')
      .select('id')
      .eq('source_id', collectionId);

    // Check regular transactions
    const { data: txs, error: txError } = await supabase
      .from('transactions')
      .select('id')
      .eq('source_id', collectionId);

    // Check wallet update queue
    const { data: queueEntries, error: queueError } = await supabase
      .from('wallet_update_queue')
      .select('id')
      .eq('collection_id', collectionId);

    return {
      hasWalletTransactions: !walletError && (walletTxs?.length || 0) > 0,
      hasTransactions: !txError && (txs?.length || 0) > 0,
      hasQueueEntries: !queueError && (queueEntries?.length || 0) > 0,
      walletTransactionCount: walletTxs?.length || 0,
      transactionCount: txs?.length || 0,
      queueEntryCount: queueEntries?.length || 0
    };

  } catch (error) {
    console.error('❌ Error checking collection transaction status:', error);
    return {
      hasWalletTransactions: false,
      hasTransactions: false,
      hasQueueEntries: false,
      walletTransactionCount: 0,
      transactionCount: 0,
      queueEntryCount: 0
    };
  }
}
