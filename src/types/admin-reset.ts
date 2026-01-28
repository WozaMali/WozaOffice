// ============================================================================
// ADMIN RESET FUNCTION TYPES
// ============================================================================
// TypeScript interfaces for admin customer reset functionality

export interface AdminResetCustomerDataParams {
  customerUuid: string;
  resetReason?: string;
  adminUserId?: string;
}

export interface AdminResetCustomerDataResult {
  success: boolean;
  message: string;
  customer_id: string;
  customer_name: string;
  pickups_affected: number;
  total_kg_reset: number;
  total_value_reset: number;
  reset_reason: string;
  admin_user_id: string;
  reset_log_id: string;
  reset_timestamp: string;
}

export interface AdminResetCustomerWalletParams {
  customerUuid: string;
  resetReason?: string;
  adminUserId?: string;
}

export interface AdminResetCustomerWalletResult {
  success: boolean;
  message: string;
  customer_id: string;
  customer_name: string;
  old_balance: number;
  new_balance: number;
  reset_reason: string;
  admin_user_id: string;
  reset_log_id: string;
  reset_timestamp: string;
}

export interface AdminResetCustomerCompleteParams {
  customerUuid: string;
  resetReason?: string;
  adminUserId?: string;
}

export interface AdminResetCustomerCompleteResult {
  success: boolean;
  message: string;
  customer_id: string;
  pickup_reset: AdminResetCustomerDataResult;
  wallet_reset: AdminResetCustomerWalletResult;
  reset_reason: string;
  admin_user_id: string;
  reset_timestamp: string;
}

export interface CustomerOverview {
  customer_id: string;
  full_name: string;
  email: string;
  phone: string;
  wallet_balance: number;
  customer_since: string;
  total_pickups: number;
  approved_pickups: number;
  pending_pickups: number;
  total_kg: number;
  total_value: number;
  last_pickup_date: string | null;
  can_reset: boolean;
}

export interface CustomerForReset extends CustomerOverview {
  reset_type: 'Both' | 'Pickup Data Only' | 'Wallet Only' | 'No Reset Needed';
}

export interface ResetHistoryEntry {
  log_id: string;
  customer_id: string;
  customer_name: string;
  activity_type: string;
  description: string;
  reset_reason: string;
  admin_user_id: string;
  admin_name: string;
  created_at: string;
  metadata: any;
}

export interface AdminResetStatistics {
  total_customers: number;
  customers_with_data: number;
  total_resets_today: number;
  total_resets_week: number;
  total_resets_month: number;
  recent_resets: Array<{
    customer_name: string;
    reset_type: string;
    reset_reason: string;
    admin_name: string;
    timestamp: string;
  }>;
}

export interface AdminResetService {
  resetCustomerPickupData: (params: AdminResetCustomerDataParams) => Promise<AdminResetCustomerDataResult>;
  resetCustomerWallet: (params: AdminResetCustomerWalletParams) => Promise<AdminResetCustomerWalletResult>;
  resetCustomerComplete: (params: AdminResetCustomerCompleteParams) => Promise<AdminResetCustomerCompleteResult>;
  getCustomerOverview: () => Promise<CustomerOverview[]>;
  getCustomersForReset: () => Promise<CustomerForReset[]>;
  getCustomerResetHistory: (customerUuid?: string, daysBack?: number) => Promise<ResetHistoryEntry[]>;
  getAdminResetStatistics: () => Promise<AdminResetStatistics>;
}
