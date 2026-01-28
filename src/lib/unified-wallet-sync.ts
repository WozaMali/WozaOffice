import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export interface WalletSyncData {
  userId: string;
  totalApprovedKg: number;
  totalApprovedValue: number;
  totalPoints: number;
  lastSyncAt: string;
}

export interface CollectionSyncData {
  id: string;
  userId: string;
  materialType: string;
  weightKg: number;
  materialRate: number;
  computedValue: number;
  status: string;
  approvedAt: string;
}

/**
 * Unified Wallet Sync Service
 * 
 * This service provides a unified way for the main app to:
 * 1. Read approved collections with computed values
 * 2. Calculate wallet balances based on approved collections
 * 3. Sync wallet data across all applications
 */
export class UnifiedWalletSyncService {
  
  /**
   * Get all approved collections with computed values
   * Used by main app to calculate wallet balances
   */
  static async getApprovedCollections(): Promise<{ data: CollectionSyncData[] | null; error: any }> {
    try {
      // Fetch approved collections
      const { data: collections, error: collectionsError } = await supabase
        .from('collections')
        .select('*')
        .eq('status', 'approved')
        .order('updated_at', { ascending: false });

      if (collectionsError) {
        console.debug('Error fetching approved collections:', collectionsError);
        return { data: null, error: collectionsError };
      }

      if (!collections || collections.length === 0) {
        return { data: [], error: null };
      }

      // Get material rates
      const materialNames = Array.from(new Set(
        collections.map(c => (c.material_type || '').toLowerCase()).filter(Boolean)
      ));

      const { data: materials } = await supabase
        .from('materials')
        .select('name, current_rate')
        .in('name', materialNames);

      const nameToRate = new Map(
        (materials || []).map((m: any) => [String(m.name).toLowerCase(), Number(m.current_rate) || 0])
      );

      // Map collections with computed values
      const syncData: CollectionSyncData[] = collections.map((c: any) => {
        const kg = c.weight_kg ?? c.total_weight_kg ?? 0;
        const materialRate = nameToRate.get(String(c.material_type || '').toLowerCase()) || 0;
        const computedValue = kg * materialRate;

        return {
          id: c.id,
          userId: c.user_id,
          materialType: c.material_type || 'Unknown',
          weightKg: kg,
          materialRate,
          computedValue,
          status: c.status,
          approvedAt: c.updated_at || c.created_at
        };
      });

      return { data: syncData, error: null };
    } catch (error) {
      console.error('Exception in getApprovedCollections:', error);
      return { data: null, error };
    }
  }

  /**
   * Calculate wallet sync data for a specific user
   * Used by main app to get user's wallet balance from approved collections
   */
  static async getUserWalletSyncData(userId: string): Promise<{ data: WalletSyncData | null; error: any }> {
    try {
      const { data: collections, error } = await this.getApprovedCollections();
      
      if (error || !collections) {
        return { data: null, error };
      }

      // Filter collections for this user
      const userCollections = collections.filter(c => c.userId === userId);
      
      const totalApprovedKg = userCollections.reduce((sum, c) => sum + c.weightKg, 0);
      const totalApprovedValue = userCollections.reduce((sum, c) => sum + c.computedValue, 0);
      const totalPoints = totalApprovedKg; // 1 point per kg
      
      const lastSyncAt = userCollections.length > 0 
        ? userCollections.reduce((latest, c) => c.approvedAt > latest ? c.approvedAt : latest, userCollections[0].approvedAt)
        : new Date().toISOString();

      return {
        data: {
          userId,
          totalApprovedKg,
          totalApprovedValue,
          totalPoints,
          lastSyncAt
        },
        error: null
      };
    } catch (error) {
      console.error('Exception in getUserWalletSyncData:', error);
      return { data: null, error };
    }
  }

  /**
   * Calculate wallet sync data for all users
   * Used by main app to get all users' wallet balances from approved collections
   */
  static async getAllUsersWalletSyncData(): Promise<{ data: WalletSyncData[] | null; error: any }> {
    try {
      const { data: collections, error } = await this.getApprovedCollections();
      
      if (error || !collections) {
        return { data: null, error };
      }

      // Group collections by user
      const userMap = new Map<string, CollectionSyncData[]>();
      collections.forEach(c => {
        if (!userMap.has(c.userId)) {
          userMap.set(c.userId, []);
        }
        userMap.get(c.userId)!.push(c);
      });

      // Calculate sync data for each user
      const syncData: WalletSyncData[] = Array.from(userMap.entries()).map(([userId, userCollections]) => {
        const totalApprovedKg = userCollections.reduce((sum, c) => sum + c.weightKg, 0);
        const totalApprovedValue = userCollections.reduce((sum, c) => sum + c.computedValue, 0);
        const totalPoints = totalApprovedKg; // 1 point per kg
        
        const lastSyncAt = userCollections.reduce((latest, c) => c.approvedAt > latest ? c.approvedAt : latest, userCollections[0].approvedAt);

        return {
          userId,
          totalApprovedKg,
          totalApprovedValue,
          totalPoints,
          lastSyncAt
        };
      });

      return { data: syncData, error: null };
    } catch (error) {
      console.error('Exception in getAllUsersWalletSyncData:', error);
      return { data: null, error };
    }
  }

  /**
   * Sync wallet balance for a user in the main app
   * This method can be called by the main app to update wallet balances
   */
  static async syncUserWallet(userId: string): Promise<{ data: any; error: any }> {
    try {
      const { data: syncData, error } = await this.getUserWalletSyncData(userId);
      
      if (error || !syncData) {
        return { data: null, error };
      }

      // Try to update wallet using RPC function first
      const { data: rpcData, error: rpcError } = await supabase.rpc('update_wallet_simple', {
        p_user_id: userId,
        p_amount: syncData.totalApprovedValue,
        p_points: syncData.totalPoints
      });

      if (!rpcError && rpcData) {
        return { data: rpcData, error: null };
      }

      // Fallback: direct wallet update
      console.debug('RPC failed, trying direct wallet update:', rpcError);
      
      const { data: walletData, error: walletError } = await supabase
        .from('user_wallets')
        .upsert({
          user_id: userId,
          balance: syncData.totalApprovedValue,
          points: syncData.totalPoints,
          updated_at: new Date().toISOString()
        })
        .select();

      if (walletError) {
        console.debug('Direct wallet update also failed:', walletError);
        return { data: null, error: walletError };
      }

      return { data: walletData, error: null };
    } catch (error) {
      console.error('Exception in syncUserWallet:', error);
      return { data: null, error };
    }
  }

  /**
   * Get wallet balance summary for dashboard
   * Used by main app dashboard to show total wallet balances
   */
  static async getWalletBalanceSummary(): Promise<{ 
    data: { 
      totalBalance: number; 
      totalPoints: number; 
      totalUsers: number; 
    } | null; 
    error: any 
  }> {
    try {
      const { data: allSyncData, error } = await this.getAllUsersWalletSyncData();
      
      if (error || !allSyncData) {
        return { data: null, error };
      }

      const totalBalance = allSyncData.reduce((sum, user) => sum + user.totalApprovedValue, 0);
      const totalPoints = allSyncData.reduce((sum, user) => sum + user.totalPoints, 0);
      const totalUsers = allSyncData.length;

      return {
        data: {
          totalBalance,
          totalPoints,
          totalUsers
        },
        error: null
      };
    } catch (error) {
      console.error('Exception in getWalletBalanceSummary:', error);
      return { data: null, error };
    }
  }
}

// Export individual functions for easier use
export const {
  getApprovedCollections,
  getUserWalletSyncData,
  getAllUsersWalletSyncData,
  syncUserWallet,
  getWalletBalanceSummary
} = UnifiedWalletSyncService;
