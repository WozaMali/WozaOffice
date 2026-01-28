/**
 * Example usage of UnifiedWalletSyncService in the main app
 * 
 * This file shows how the main app can integrate with the unified wallet sync service
 * to keep wallet balances in sync with approved collections from the Office app.
 */

import React, { useEffect, useState } from 'react';
import { 
  UnifiedWalletSyncService,
  type WalletSyncData,
  type CollectionSyncData 
} from './unified-wallet-sync';

/**
 * Example: Sync wallet balance for a specific user
 * Call this when a user logs into the main app
 */
export async function syncUserWalletOnLogin(userId: string) {
  try {
    console.log(`🔄 Syncing wallet for user ${userId}...`);
    
    const { data, error } = await UnifiedWalletSyncService.syncUserWallet(userId);
    
    if (error) {
      console.error('❌ Failed to sync wallet:', error);
      return { success: false, error };
    }
    
    console.log('✅ Wallet synced successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Exception syncing wallet:', error);
    return { success: false, error };
  }
}

/**
 * Example: Get user's wallet balance from approved collections
 * Use this to display wallet balance in the main app
 */
export async function getUserWalletBalance(userId: string) {
  try {
    const { data, error } = await UnifiedWalletSyncService.getUserWalletSyncData(userId);
    
    if (error) {
      console.error('❌ Failed to get wallet balance:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('❌ Exception getting wallet balance:', error);
    return null;
  }
}

/**
 * Example: Sync all users' wallets (for admin/maintenance)
 * Call this periodically or when needed
 */
export async function syncAllWallets() {
  try {
    console.log('🔄 Syncing all wallets...');
    
    const { data: allSyncData, error } = await UnifiedWalletSyncService.getAllUsersWalletSyncData();
    
    if (error || !allSyncData) {
      console.error('❌ Failed to get sync data:', error);
      return { success: false, error };
    }
    
    // Sync each user's wallet
    const results = await Promise.allSettled(
      allSyncData.map(userData => 
        UnifiedWalletSyncService.syncUserWallet(userData.userId)
      )
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`✅ Wallet sync completed: ${successful} successful, ${failed} failed`);
    
    return { 
      success: true, 
      data: { 
        total: allSyncData.length, 
        successful, 
        failed 
      } 
    };
  } catch (error) {
    console.error('❌ Exception syncing all wallets:', error);
    return { success: false, error };
  }
}

/**
 * Example: Get wallet balance summary for dashboard
 * Use this in the main app dashboard
 */
export async function getWalletSummary() {
  try {
    const { data, error } = await UnifiedWalletSyncService.getWalletBalanceSummary();
    
    if (error) {
      console.error('❌ Failed to get wallet summary:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('❌ Exception getting wallet summary:', error);
    return null;
  }
}

/**
 * Example: React hook for wallet sync
 * Use this in React components
 */
export function useWalletSync(userId: string) {
  const [walletData, setWalletData] = useState<WalletSyncData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const syncWallet = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await syncUserWalletOnLogin(userId);
      
      if (result.success) {
        // Refresh wallet data after sync
        const walletBalance = await getUserWalletBalance(userId);
        setWalletData(walletBalance);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      syncWallet();
    }
  }, [userId]);

  return {
    walletData,
    loading,
    error,
    syncWallet
  };
}

/**
 * Example: Integration with main app wallet page
 * 
 * In your main app wallet page component:
 * 
 * ```tsx
 * import { useWalletSync } from './wallet-sync-example';
 * 
 * function WalletPage() {
 *   const { user } = useAuth();
 *   const { walletData, loading, error, syncWallet } = useWalletSync(user?.id);
 * 
 *   if (loading) return <div>Loading wallet...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 * 
 *   return (
 *     <div>
 *       <h1>My Wallet</h1>
 *       <p>Balance: R{walletData?.totalApprovedValue || 0}</p>
 *       <p>Points: {walletData?.totalPoints || 0}</p>
 *       <p>Total Kg Collected: {walletData?.totalApprovedKg || 0}</p>
 *       <button onClick={syncWallet}>Refresh Wallet</button>
 *     </div>
 *   );
 * }
 * ```
 */

/**
 * Example: Scheduled wallet sync (for background jobs)
 * 
 * Set up a cron job or scheduled function to sync wallets periodically:
 * 
 * ```javascript
 * // Every hour
 * setInterval(async () => {
 *   console.log('Running scheduled wallet sync...');
 *   await syncAllWallets();
 * }, 60 * 60 * 1000);
 * 
 * // Or using a job scheduler like node-cron:
 * import cron from 'node-cron';
 * 
 * // Run every 6 hours (cron syntax varies by library)
 * // Example placeholder (written to avoid ending this block comment):
 * // cron.schedule('every-6-hours', async () => {
 * //   console.log('Running scheduled wallet sync...');
 * //   await syncAllWallets();
 * // });
 * ```
 */
