/**
 * Transactions Management Service
 * Handles CRUD operations for wallet and regular transactions
 */

import { supabase } from './supabase';

export interface PointsTransaction {
  id: string;
  user_id: string;
  transaction_type: string;
  points: number;
  amount: number;
  description?: string;
  source_id?: string;
  created_at: string;
}

export interface MonetaryTransaction {
  id: string;
  user_id: string;
  transaction_type: string;
  amount: number;
  points: number;
  description?: string;
  source_id?: string;
  created_at: string;
}

export interface DeleteTransactionResult {
  success: boolean;
  message: string;
  deletedCount?: number;
  error?: any;
}

/**
 * Get all points transactions (from wallet_transactions where points > 0)
 */
export async function getAllPointsTransactions(): Promise<{ data: PointsTransaction[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select(`
        *,
        user:users(
          id,
          full_name,
          email
        )
      `)
      .gt('points', 0)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching points transactions:', error);
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('Exception in getAllPointsTransactions:', error);
    return { data: null, error };
  }
}

/**
 * Get all monetary transactions (from wallet_transactions where amount > 0)
 */
export async function getAllMonetaryTransactions(): Promise<{ data: MonetaryTransaction[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select(`
        *,
        user:users(
          id,
          full_name,
          email
        )
      `)
      .gt('amount', 0)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching monetary transactions:', error);
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('Exception in getAllMonetaryTransactions:', error);
    return { data: null, error };
  }
}

/**
 * Delete a single points transaction
 */
export async function deletePointsTransaction(transactionId: string): Promise<DeleteTransactionResult> {
  try {
    console.log('🗑️ Deleting points transaction:', transactionId);

    // First, get the transaction details to find the source_id
    const { data: transaction, error: fetchError } = await supabase
      .from('wallet_transactions')
      .select('id, source_id, points, amount, user_id')
      .eq('id', transactionId)
      .gt('points', 0)
      .single();

    if (fetchError || !transaction) {
      console.error('Error fetching transaction details:', fetchError);
      return {
        success: false,
        message: `Transaction not found: ${fetchError?.message || 'Unknown error'}`,
        error: fetchError
      };
    }

    // Delete the wallet transaction
    console.log('🗑️ Attempting to delete transaction with ID:', transactionId);
    const { error, count } = await supabase
      .from('wallet_transactions')
      .delete()
      .eq('id', transactionId)
      .gt('points', 0);

    if (error) {
      console.error('❌ Error deleting points transaction:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return {
        success: false,
        message: `Failed to delete points transaction: ${error.message}`,
        error
      };
    }

    console.log('✅ Transaction deletion successful. Rows affected:', count);

    // If the transaction has a source_id, delete the related collection records
    if (transaction.source_id) {
      console.log('🔄 Deleting related collection records for source_id:', transaction.source_id);
      
      // Delete from unified_collections table
      const { error: unifiedError } = await supabase
        .from('unified_collections')
        .delete()
        .eq('id', transaction.source_id);

      if (unifiedError) {
        console.warn('Warning: Could not delete from unified_collections:', unifiedError);
      } else {
        console.log('✅ Deleted from unified_collections');
      }

      // Delete from collections table
      const { error: collectionsError } = await supabase
        .from('collections')
        .delete()
        .eq('id', transaction.source_id);

      if (collectionsError) {
        console.warn('Warning: Could not delete from collections:', collectionsError);
      } else {
        console.log('✅ Deleted from collections');
      }

      // Delete related collection_photos
      const { error: photosError } = await supabase
        .from('collection_photos')
        .delete()
        .eq('collection_id', transaction.source_id);

      if (photosError) {
        console.warn('Warning: Could not delete collection_photos:', photosError);
      } else {
        console.log('✅ Deleted collection_photos');
      }

      // Delete related collection_materials
      const { error: materialsError } = await supabase
        .from('collection_materials')
        .delete()
        .eq('collection_id', transaction.source_id);

      if (materialsError) {
        console.warn('Warning: Could not delete collection_materials:', materialsError);
      } else {
        console.log('✅ Deleted collection_materials');
      }

      // Delete related wallet_update_queue entries
      const { error: queueError } = await supabase
        .from('wallet_update_queue')
        .delete()
        .eq('collection_id', transaction.source_id);

      if (queueError) {
        console.warn('Warning: Could not delete wallet_update_queue:', queueError);
      } else {
        console.log('✅ Deleted wallet_update_queue entries');
      }

      // Delete related Green Scholar PET contribution transactions
      const { error: gsError } = await supabase
        .from('green_scholar_transactions')
        .delete()
        .eq('source_type', 'collection')
        .eq('source_id', transaction.source_id);

      if (gsError) {
        console.warn('Warning: Could not delete green_scholar_transactions:', gsError);
      } else {
        console.log('✅ Deleted related green_scholar_transactions');
      }

      // Best-effort refresh of Green Scholar balance snapshot (ignore if RPC not present)
      try {
        await supabase.rpc('refresh_green_scholar_fund_balance');
      } catch (refreshError: any) {
        console.warn('Green Scholar balance refresh skipped:', refreshError?.message || refreshError);
      }
    }

    console.log('✅ Points transaction deleted successfully');
    return {
      success: true,
      message: 'Points transaction deleted successfully',
      deletedCount: 1
    };

  } catch (error) {
    console.error('Exception in deletePointsTransaction:', error);
    return {
      success: false,
      message: 'Failed to delete points transaction',
      error
    };
  }
}

/**
 * Delete a single monetary transaction
 */
export async function deleteMonetaryTransaction(transactionId: string): Promise<DeleteTransactionResult> {
  try {
    console.log('🗑️ Deleting monetary transaction:', transactionId);

    // First, get the transaction details to find the source_id
    const { data: transaction, error: fetchError } = await supabase
      .from('wallet_transactions')
      .select('id, source_id, points, amount, user_id')
      .eq('id', transactionId)
      .gt('amount', 0)
      .single();

    if (fetchError || !transaction) {
      console.error('Error fetching transaction details:', fetchError);
      return {
        success: false,
        message: `Transaction not found: ${fetchError?.message || 'Unknown error'}`,
        error: fetchError
      };
    }

    // Delete the wallet transaction
    console.log('🗑️ Attempting to delete transaction with ID:', transactionId);
    const { error, count } = await supabase
      .from('wallet_transactions')
      .delete()
      .eq('id', transactionId)
      .gt('amount', 0);

    if (error) {
      console.error('❌ Error deleting monetary transaction:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return {
        success: false,
        message: `Failed to delete monetary transaction: ${error.message}`,
        error
      };
    }

    console.log('✅ Transaction deletion successful. Rows affected:', count);

    // If the transaction has a source_id, delete the related collection records
    if (transaction.source_id) {
      console.log('🔄 Deleting related collection records for source_id:', transaction.source_id);
      
      // Delete from unified_collections table
      const { error: unifiedError } = await supabase
        .from('unified_collections')
        .delete()
        .eq('id', transaction.source_id);

      if (unifiedError) {
        console.warn('Warning: Could not delete from unified_collections:', unifiedError);
      } else {
        console.log('✅ Deleted from unified_collections');
      }

      // Delete from collections table
      const { error: collectionsError } = await supabase
        .from('collections')
        .delete()
        .eq('id', transaction.source_id);

      if (collectionsError) {
        console.warn('Warning: Could not delete from collections:', collectionsError);
      } else {
        console.log('✅ Deleted from collections');
      }

      // Delete related collection_photos
      const { error: photosError } = await supabase
        .from('collection_photos')
        .delete()
        .eq('collection_id', transaction.source_id);

      if (photosError) {
        console.warn('Warning: Could not delete collection_photos:', photosError);
      } else {
        console.log('✅ Deleted collection_photos');
      }

      // Delete related collection_materials
      const { error: materialsError } = await supabase
        .from('collection_materials')
        .delete()
        .eq('collection_id', transaction.source_id);

      if (materialsError) {
        console.warn('Warning: Could not delete collection_materials:', materialsError);
      } else {
        console.log('✅ Deleted collection_materials');
      }

      // Delete related wallet_update_queue entries
      const { error: queueError } = await supabase
        .from('wallet_update_queue')
        .delete()
        .eq('collection_id', transaction.source_id);

      if (queueError) {
        console.warn('Warning: Could not delete wallet_update_queue:', queueError);
      } else {
        console.log('✅ Deleted wallet_update_queue entries');
      }

      // Delete related Green Scholar PET contribution transactions
      const { error: gsError } = await supabase
        .from('green_scholar_transactions')
        .delete()
        .eq('source_type', 'collection')
        .eq('source_id', transaction.source_id);

      if (gsError) {
        console.warn('Warning: Could not delete green_scholar_transactions:', gsError);
      } else {
        console.log('✅ Deleted related green_scholar_transactions');
      }

      // Best-effort refresh of Green Scholar balance snapshot (ignore if RPC not present)
      try {
        await supabase.rpc('refresh_green_scholar_fund_balance');
      } catch (refreshError: any) {
        console.warn('Green Scholar balance refresh skipped:', refreshError?.message || refreshError);
      }
    }

    console.log('✅ Monetary transaction deleted successfully');
    return {
      success: true,
      message: 'Monetary transaction deleted successfully',
      deletedCount: 1
    };

  } catch (error) {
    console.error('Exception in deleteMonetaryTransaction:', error);
    return {
      success: false,
      message: 'Failed to delete monetary transaction',
      error
    };
  }
}

/**
 * Delete multiple points transactions
 */
export async function deleteMultiplePointsTransactions(transactionIds: string[]): Promise<DeleteTransactionResult> {
  try {
    console.log('🗑️ Deleting multiple points transactions:', transactionIds);

    // First, get all transaction details to find source_ids
    const { data: transactions, error: fetchError } = await supabase
      .from('wallet_transactions')
      .select('id, source_id, points, amount, user_id')
      .in('id', transactionIds)
      .gt('points', 0);

    if (fetchError) {
      console.error('Error fetching transaction details:', fetchError);
      return {
        success: false,
        message: `Failed to fetch transaction details: ${fetchError.message}`,
        error: fetchError
      };
    }

    // Group transactions by source_id for efficient updates
    const sourceUpdates = new Map<string, number>();
    transactions?.forEach(transaction => {
      if (transaction.source_id) {
        const currentAmount = sourceUpdates.get(transaction.source_id) || 0;
        sourceUpdates.set(transaction.source_id, currentAmount + (transaction.amount || 0));
      }
    });

    // Delete the wallet transactions
    const { error } = await supabase
      .from('wallet_transactions')
      .delete()
      .in('id', transactionIds)
      .gt('points', 0);

    if (error) {
      console.error('Error deleting multiple points transactions:', error);
      return {
        success: false,
        message: `Failed to delete points transactions: ${error.message}`,
        error
      };
    }

    // Delete collection records for each affected source_id
    for (const [sourceId, totalAmountToSubtract] of Array.from(sourceUpdates)) {
      console.log('🔄 Deleting collection records for source_id:', sourceId);
      
      // Delete from unified_collections table
      const { error: unifiedError } = await supabase
        .from('unified_collections')
        .delete()
        .eq('id', sourceId);

      if (unifiedError) {
        console.warn('Warning: Could not delete from unified_collections for source_id', sourceId, ':', unifiedError);
      } else {
        console.log('✅ Deleted from unified_collections for source_id', sourceId);
      }

      // Delete from collections table
      const { error: collectionsError } = await supabase
        .from('collections')
        .delete()
        .eq('id', sourceId);

      if (collectionsError) {
        console.warn('Warning: Could not delete from collections for source_id', sourceId, ':', collectionsError);
      } else {
        console.log('✅ Deleted from collections for source_id', sourceId);
      }

      // Delete related collection_photos
      const { error: photosError } = await supabase
        .from('collection_photos')
        .delete()
        .eq('collection_id', sourceId);

      if (photosError) {
        console.warn('Warning: Could not delete collection_photos for source_id', sourceId, ':', photosError);
      } else {
        console.log('✅ Deleted collection_photos for source_id', sourceId);
      }

      // Delete related collection_materials
      const { error: materialsError } = await supabase
        .from('collection_materials')
        .delete()
        .eq('collection_id', sourceId);

      if (materialsError) {
        console.warn('Warning: Could not delete collection_materials for source_id', sourceId, ':', materialsError);
      } else {
        console.log('✅ Deleted collection_materials for source_id', sourceId);
      }

      // Delete related wallet_update_queue entries
      const { error: queueError } = await supabase
        .from('wallet_update_queue')
        .delete()
        .eq('collection_id', sourceId);

      if (queueError) {
        console.warn('Warning: Could not delete wallet_update_queue for source_id', sourceId, ':', queueError);
      } else {
        console.log('✅ Deleted wallet_update_queue entries for source_id', sourceId);
      }

      // Delete related Green Scholar PET contribution transactions for this collection
      const { error: gsError } = await supabase
        .from('green_scholar_transactions')
        .delete()
        .eq('source_type', 'collection')
        .eq('source_id', sourceId);

      if (gsError) {
        console.warn('Warning: Could not delete green_scholar_transactions for source_id', sourceId, ':', gsError);
      } else {
        console.log('✅ Deleted related green_scholar_transactions for source_id', sourceId);
      }
    }

    // Best-effort refresh of Green Scholar balance snapshot (ignore if RPC not present)
    try {
      await supabase.rpc('refresh_green_scholar_fund_balance');
    } catch (refreshError: any) {
      console.warn('Green Scholar balance refresh skipped:', refreshError?.message || refreshError);
    }

    console.log('✅ Multiple points transactions deleted successfully');
    return {
      success: true,
      message: `${transactionIds.length} points transactions deleted successfully`,
      deletedCount: transactionIds.length
    };

  } catch (error) {
    console.error('Exception in deleteMultiplePointsTransactions:', error);
    return {
      success: false,
      message: 'Failed to delete points transactions',
      error
    };
  }
}

/**
 * Delete multiple monetary transactions
 */
export async function deleteMultipleMonetaryTransactions(transactionIds: string[]): Promise<DeleteTransactionResult> {
  try {
    console.log('🗑️ Deleting multiple monetary transactions:', transactionIds);

    // First, get all transaction details to find source_ids
    const { data: transactions, error: fetchError } = await supabase
      .from('wallet_transactions')
      .select('id, source_id, points, amount, user_id')
      .in('id', transactionIds)
      .gt('amount', 0);

    if (fetchError) {
      console.error('Error fetching transaction details:', fetchError);
      return {
        success: false,
        message: `Failed to fetch transaction details: ${fetchError.message}`,
        error: fetchError
      };
    }

    // Group transactions by source_id for efficient updates
    const sourceUpdates = new Map<string, number>();
    transactions?.forEach(transaction => {
      if (transaction.source_id) {
        const currentAmount = sourceUpdates.get(transaction.source_id) || 0;
        sourceUpdates.set(transaction.source_id, currentAmount + (transaction.amount || 0));
      }
    });

    // Delete the wallet transactions
    const { error } = await supabase
      .from('wallet_transactions')
      .delete()
      .in('id', transactionIds)
      .gt('amount', 0);

    if (error) {
      console.error('Error deleting multiple monetary transactions:', error);
      return {
        success: false,
        message: `Failed to delete monetary transactions: ${error.message}`,
        error
      };
    }

    // Delete collection records for each affected source_id
    for (const [sourceId, totalAmountToSubtract] of Array.from(sourceUpdates)) {
      console.log('🔄 Deleting collection records for source_id:', sourceId);
      
      // Delete from unified_collections table
      const { error: unifiedError } = await supabase
        .from('unified_collections')
        .delete()
        .eq('id', sourceId);

      if (unifiedError) {
        console.warn('Warning: Could not delete from unified_collections for source_id', sourceId, ':', unifiedError);
      } else {
        console.log('✅ Deleted from unified_collections for source_id', sourceId);
      }

      // Delete from collections table
      const { error: collectionsError } = await supabase
        .from('collections')
        .delete()
        .eq('id', sourceId);

      if (collectionsError) {
        console.warn('Warning: Could not delete from collections for source_id', sourceId, ':', collectionsError);
      } else {
        console.log('✅ Deleted from collections for source_id', sourceId);
      }

      // Delete related collection_photos
      const { error: photosError } = await supabase
        .from('collection_photos')
        .delete()
        .eq('collection_id', sourceId);

      if (photosError) {
        console.warn('Warning: Could not delete collection_photos for source_id', sourceId, ':', photosError);
      } else {
        console.log('✅ Deleted collection_photos for source_id', sourceId);
      }

      // Delete related collection_materials
      const { error: materialsError } = await supabase
        .from('collection_materials')
        .delete()
        .eq('collection_id', sourceId);

      if (materialsError) {
        console.warn('Warning: Could not delete collection_materials for source_id', sourceId, ':', materialsError);
      } else {
        console.log('✅ Deleted collection_materials for source_id', sourceId);
      }

      // Delete related wallet_update_queue entries
      const { error: queueError } = await supabase
        .from('wallet_update_queue')
        .delete()
        .eq('collection_id', sourceId);

      if (queueError) {
        console.warn('Warning: Could not delete wallet_update_queue for source_id', sourceId, ':', queueError);
      } else {
        console.log('✅ Deleted wallet_update_queue entries for source_id', sourceId);
      }

      // Delete related Green Scholar PET contribution transactions for this collection
      const { error: gsError } = await supabase
        .from('green_scholar_transactions')
        .delete()
        .eq('source_type', 'collection')
        .eq('source_id', sourceId);

      if (gsError) {
        console.warn('Warning: Could not delete green_scholar_transactions for source_id', sourceId, ':', gsError);
      } else {
        console.log('✅ Deleted related green_scholar_transactions for source_id', sourceId);
      }
    }

    // Best-effort refresh of Green Scholar balance snapshot (ignore if RPC not present)
    try {
      await supabase.rpc('refresh_green_scholar_fund_balance');
    } catch (refreshError: any) {
      console.warn('Green Scholar balance refresh skipped:', refreshError?.message || refreshError);
    }

    console.log('✅ Multiple monetary transactions deleted successfully');
    return {
      success: true,
      message: `${transactionIds.length} monetary transactions deleted successfully`,
      deletedCount: transactionIds.length
    };

  } catch (error) {
    console.error('Exception in deleteMultipleMonetaryTransactions:', error);
    return {
      success: false,
      message: 'Failed to delete monetary transactions',
      error
    };
  }
}

/**
 * Delete all transactions (use with caution!)
 */
export async function deleteAllTransactions(): Promise<DeleteTransactionResult> {
  try {
    console.log('🗑️ Deleting ALL transactions (use with caution!)');

    // Delete all wallet transactions
    const { error: transactionsError } = await supabase
      .from('wallet_transactions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (transactionsError) {
      console.error('Error deleting all transactions:', transactionsError);
      return {
        success: false,
        message: 'Some transactions could not be deleted',
        error: transactionsError
      };
    }

    console.log('✅ All transactions deleted successfully');
    return {
      success: true,
      message: 'All transactions deleted successfully',
      deletedCount: -1 // Unknown count
    };

  } catch (error) {
    console.error('Exception in deleteAllTransactions:', error);
    return {
      success: false,
      message: 'Failed to delete all transactions',
      error
    };
  }
}

/**
 * Delete transactions by source (e.g., collection ID)
 */
export async function deleteTransactionsBySource(sourceId: string): Promise<DeleteTransactionResult> {
  try {
    console.log('🗑️ Deleting transactions by source:', sourceId);

    // Delete transactions by source_id
    const { error: transactionsError } = await supabase
      .from('wallet_transactions')
      .delete()
      .eq('source_id', sourceId);

    if (transactionsError) {
      console.error('Error deleting transactions by source:', transactionsError);
      return {
        success: false,
        message: 'Some transactions could not be deleted',
        error: transactionsError
      };
    }

    console.log('✅ Transactions deleted by source successfully');

    // Also delete related Green Scholar PET contribution transactions for this source collection
    const { error: gsError } = await supabase
      .from('green_scholar_transactions')
      .delete()
      .eq('source_type', 'collection')
      .eq('source_id', sourceId);

    if (gsError) {
      console.warn('Warning: Could not delete green_scholar_transactions for source_id', sourceId, ':', gsError);
    } else {
      console.log('✅ Deleted related green_scholar_transactions for source_id', sourceId);
    }

    // Best-effort refresh of Green Scholar balance snapshot (ignore if RPC not present)
    try {
      await supabase.rpc('refresh_green_scholar_fund_balance');
    } catch (refreshError: any) {
      console.warn('Green Scholar balance refresh skipped:', refreshError?.message || refreshError);
    }
    return {
      success: true,
      message: 'Transactions deleted by source successfully',
      deletedCount: -1 // Unknown count
    };

  } catch (error) {
    console.error('Exception in deleteTransactionsBySource:', error);
    return {
      success: false,
      message: 'Failed to delete transactions by source',
      error
    };
  }
}
