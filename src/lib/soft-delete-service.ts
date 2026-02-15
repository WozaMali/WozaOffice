/**
 * Soft Delete Service
 * Handles soft deletion of collections and transactions
 * Moves records to deleted_transactions table instead of hard deleting
 */

import { getSupabaseClient } from './supabase';

export interface SoftDeleteResult {
  success: boolean;
  message: string;
  deletedTransactionId?: string;
  error?: any;
}

/**
 * Soft delete a collection and all related data
 * This moves the record to deleted_transactions table instead of hard deleting
 */
export async function softDeleteCollection(
  collectionId: string, 
  deletionReason?: string
): Promise<SoftDeleteResult> {
  try {
    console.log('🗑️ Starting soft delete for collection:', collectionId);
    
    const supabase = getSupabaseClient();
    // Get current user to verify they have super_admin role
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return {
        success: false,
        message: 'User not authenticated',
        error: userError
      };
    }

    // Call the RPC function to perform soft delete
    const { data, error } = await supabase.rpc('soft_delete_collection', {
      p_collection_id: collectionId,
      p_deleted_by: user.id,
      p_deletion_reason: deletionReason || 'Deleted by super admin'
    });

    if (error) {
      console.error('❌ Error in soft delete RPC:', error);
      return {
        success: false,
        message: `Failed to soft delete collection: ${error.message}`,
        error
      };
    }

    if (!data || !data.success) {
      return {
        success: false,
        message: data?.error || 'Soft delete failed',
        error: data
      };
    }

    console.log('✅ Collection soft deleted successfully:', data);
    return {
      success: true,
      message: 'Collection successfully moved to deleted transactions',
      deletedTransactionId: data.deleted_transaction_id
    };

  } catch (error) {
    console.error('❌ Exception in softDeleteCollection:', error);
    return {
      success: false,
      message: 'Failed to soft delete collection',
      error
    };
  }
}

/**
 * Get all deleted transactions (super admin only)
 */
export async function getDeletedTransactions(): Promise<{
  data: any[] | null;
  error: any;
}> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('v_deleted_transactions')
      .select('*')
      .order('deleted_at', { ascending: false });

    if (error) {
      console.error('Error fetching deleted transactions:', error);
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('Exception in getDeletedTransactions:', error);
    return { data: null, error };
  }
}

/**
 * Restore a deleted transaction (super admin only)
 * This moves the record back from deleted_transactions to active tables
 */
export async function restoreDeletedTransaction(
  deletedTransactionId: string
): Promise<SoftDeleteResult> {
  try {
    console.log('🔄 Starting restore for deleted transaction:', deletedTransactionId);
    
    const supabase = getSupabaseClient();
    // Get current user to verify they have super_admin role
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return {
        success: false,
        message: 'User not authenticated',
        error: userError
      };
    }

    // Get the deleted transaction data
    const { data: deletedData, error: fetchError } = await supabase
      .from('deleted_transactions')
      .select('*')
      .eq('id', deletedTransactionId)
      .single();

    if (fetchError || !deletedData) {
      return {
        success: false,
        message: 'Deleted transaction not found',
        error: fetchError
      };
    }

    // Start a transaction to restore the data
    const { data: restoreData, error: restoreError } = await supabase.rpc('restore_deleted_collection', {
      p_deleted_transaction_id: deletedTransactionId,
      p_restored_by: user.id
    });

    if (restoreError) {
      console.error('❌ Error in restore RPC:', restoreError);
      return {
        success: false,
        message: `Failed to restore collection: ${restoreError.message}`,
        error: restoreError
      };
    }

    if (!restoreData || !restoreData.success) {
      return {
        success: false,
        message: restoreData?.error || 'Restore failed',
        error: restoreData
      };
    }

    console.log('✅ Collection restored successfully:', restoreData);
    return {
      success: true,
      message: 'Collection successfully restored from deleted transactions'
    };

  } catch (error) {
    console.error('❌ Exception in restoreDeletedTransaction:', error);
    return {
      success: false,
      message: 'Failed to restore deleted transaction',
      error
    };
  }
}

/**
 * Permanently delete a soft-deleted transaction (super admin only)
 * This completely removes the record from deleted_transactions
 */
export async function permanentlyDeleteTransaction(
  deletedTransactionId: string
): Promise<SoftDeleteResult> {
  try {
    console.log('🗑️ Starting permanent delete for deleted transaction:', deletedTransactionId);
    
    const supabase = getSupabaseClient();
    // Get current user to verify they have super_admin role
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return {
        success: false,
        message: 'User not authenticated',
        error: userError
      };
    }

    // Delete from deleted_transactions table
    const { error } = await supabase
      .from('deleted_transactions')
      .delete()
      .eq('id', deletedTransactionId);

    if (error) {
      console.error('❌ Error permanently deleting transaction:', error);
      return {
        success: false,
        message: `Failed to permanently delete transaction: ${error.message}`,
        error
      };
    }

    console.log('✅ Transaction permanently deleted');
    return {
      success: true,
      message: 'Transaction permanently deleted'
    };

  } catch (error) {
    console.error('❌ Exception in permanentlyDeleteTransaction:', error);
    return {
      success: false,
      message: 'Failed to permanently delete transaction',
      error
    };
  }
}

/**
 * Check if a collection is soft deleted
 */
export async function isCollectionDeleted(collectionId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('deleted_transactions')
      .select('id')
      .eq('original_collection_id', collectionId)
      .limit(1);

    if (error) {
      console.error('Error checking if collection is deleted:', error);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    console.error('Exception in isCollectionDeleted:', error);
    return false;
  }
}
