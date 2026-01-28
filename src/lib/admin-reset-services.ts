// ============================================================================
// ADMIN RESET SERVICES
// ============================================================================
// Supabase service functions for admin customer reset functionality

import { createClient } from '@supabase/supabase-js';
import {
  AdminResetCustomerDataParams,
  AdminResetCustomerDataResult,
  AdminResetCustomerWalletParams,
  AdminResetCustomerWalletResult,
  AdminResetCustomerCompleteParams,
  AdminResetCustomerCompleteResult,
  CustomerOverview,
  CustomerForReset,
  ResetHistoryEntry,
  AdminResetStatistics,
  AdminResetService
} from '../types/admin-reset';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export class AdminResetServices implements AdminResetService {
  
  /**
   * Reset a customer's pickup data (kgs and amounts) to zero
   */
  async resetCustomerPickupData(
    params: AdminResetCustomerDataParams
  ): Promise<AdminResetCustomerDataResult> {
    try {
      const { data, error } = await supabase.rpc('admin_reset_customer_pickup_data', {
        customer_uuid: params.customerUuid,
        reset_reason: params.resetReason || 'Admin reset',
        admin_user_id: params.adminUserId || undefined
      });

      if (error) {
        throw new Error(`Failed to reset customer pickup data: ${error.message}`);
      }

      return data as AdminResetCustomerDataResult;
    } catch (error) {
      console.error('Error in resetCustomerPickupData:', error);
      throw error;
    }
  }

  /**
   * Reset a customer's wallet balance to zero
   */
  async resetCustomerWallet(
    params: AdminResetCustomerWalletParams
  ): Promise<AdminResetCustomerWalletResult> {
    try {
      const { data, error } = await supabase.rpc('admin_reset_customer_wallet', {
        customer_uuid: params.customerUuid,
        reset_reason: params.resetReason || 'Admin reset',
        admin_user_id: params.adminUserId || undefined
      });

      if (error) {
        throw new Error(`Failed to reset customer wallet: ${error.message}`);
      }

      return data as AdminResetCustomerWalletResult;
    } catch (error) {
      console.error('Error in resetCustomerWallet:', error);
      throw error;
    }
  }

  /**
   * Reset a customer's complete data (pickups + wallet)
   */
  async resetCustomerComplete(
    params: AdminResetCustomerCompleteParams
  ): Promise<AdminResetCustomerCompleteResult> {
    try {
      const { data, error } = await supabase.rpc('admin_reset_customer_complete', {
        customer_uuid: params.customerUuid,
        reset_reason: params.resetReason || 'Admin reset',
        admin_user_id: params.adminUserId || undefined
      });

      if (error) {
        throw new Error(`Failed to reset customer complete data: ${error.message}`);
      }

      return data as AdminResetCustomerCompleteResult;
    } catch (error) {
      console.error('Error in resetCustomerComplete:', error);
      throw error;
    }
  }

  /**
   * Get overview of all customers for admin review
   */
  async getCustomerOverview(): Promise<CustomerOverview[]> {
    try {
      const { data, error } = await supabase
        .from('admin_customer_overview')
        .select('*')
        .order('full_name');

      if (error) {
        throw new Error(`Failed to get customer overview: ${error.message}`);
      }

      return data as CustomerOverview[];
    } catch (error) {
      console.error('Error in getCustomerOverview:', error);
      throw error;
    }
  }

  /**
   * Get customers eligible for reset (have data to reset)
   */
  async getCustomersForReset(): Promise<CustomerForReset[]> {
    try {
      const { data, error } = await supabase
        .from('admin_customers_for_reset')
        .select('*')
        .order('total_kg', { ascending: false })
        .order('wallet_balance', { ascending: false });

      if (error) {
        throw new Error(`Failed to get customers for reset: ${error.message}`);
      }

      return data as CustomerForReset[];
    } catch (error) {
      console.error('Error in getCustomersForReset:', error);
      throw error;
    }
  }

  /**
   * Get customer reset history
   */
  async getCustomerResetHistory(
    customerUuid?: string,
    daysBack: number = 30
  ): Promise<ResetHistoryEntry[]> {
    try {
      const { data, error } = await supabase.rpc('get_customer_reset_history', {
        customer_uuid: customerUuid || null,
        days_back: daysBack
      });

      if (error) {
        throw new Error(`Failed to get customer reset history: ${error.message}`);
      }

      return data as ResetHistoryEntry[];
    } catch (error) {
      console.error('Error in getCustomerResetHistory:', error);
      throw error;
    }
  }

  /**
   * Get admin dashboard statistics
   */
  async getAdminResetStatistics(): Promise<AdminResetStatistics> {
    try {
      const { data, error } = await supabase.rpc('get_admin_reset_statistics');

      if (error) {
        throw new Error(`Failed to get admin reset statistics: ${error.message}`);
      }

      return data as AdminResetStatistics;
    } catch (error) {
      console.error('Error in getAdminResetStatistics:', error);
      throw error;
    }
  }

  /**
   * Batch reset multiple customers (utility function)
   */
  async batchResetCustomers(
    customerUuids: string[],
    resetReason: string = 'Batch admin reset',
    adminUserId?: string
  ): Promise<{
    success: string[];
    failed: Array<{ customerId: string; error: string }>;
  }> {
    const results = {
      success: [] as string[],
      failed: [] as Array<{ customerId: string; error: string }>
    };

    for (const customerUuid of customerUuids) {
      try {
        await this.resetCustomerComplete({
          customerUuid,
          resetReason,
          adminUserId
        });
        results.success.push(customerUuid);
      } catch (error) {
        results.failed.push({
          customerId: customerUuid,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Search customers by name or email
   */
  async searchCustomers(query: string): Promise<CustomerOverview[]> {
    try {
      const { data, error } = await supabase
        .from('admin_customer_overview')
        .select('*')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .order('full_name');

      if (error) {
        throw new Error(`Failed to search customers: ${error.message}`);
      }

      return data as CustomerOverview[];
    } catch (error) {
      console.error('Error in searchCustomers:', error);
      throw error;
    }
  }

  /**
   * Get customers with high kg or value totals (potential candidates for reset)
   */
  async getHighValueCustomers(threshold: number = 100): Promise<CustomerForReset[]> {
    try {
      const { data, error } = await supabase
        .from('admin_customers_for_reset')
        .select('*')
        .or(`total_kg.gte.${threshold},total_value.gte.${threshold}`)
        .order('total_value', { ascending: false });

      if (error) {
        throw new Error(`Failed to get high value customers: ${error.message}`);
      }

      return data as CustomerForReset[];
    } catch (error) {
      console.error('Error in getHighValueCustomers:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const adminResetServices = new AdminResetServices();

// Export individual functions for convenience
export const {
  resetCustomerPickupData,
  resetCustomerWallet,
  resetCustomerComplete,
  getCustomerOverview,
  getCustomersForReset,
  getCustomerResetHistory,
  getAdminResetStatistics,
  batchResetCustomers,
  searchCustomers,
  getHighValueCustomers
} = adminResetServices;
