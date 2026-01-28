import { supabase } from './supabase';

// Wallet tier definitions
export interface WalletTier {
  id: string;
  name: string;
  min_balance: number;
  max_balance: number;
  color: string;
  benefits: string[];
  icon: string;
}

// User wallet with tier information
export interface UserWalletWithTier {
  user_id: string;
  full_name: string;
  email: string;
  current_points: number;
  total_points_earned: number;
  total_points_spent: number;
  tier: WalletTier;
  collections_count: number;
  total_weight_kg: number;
  last_activity: string;
}

// Define wallet tiers
export const WALLET_TIERS: WalletTier[] = [
  {
    id: 'bronze',
    name: 'Bronze Collector',
    min_balance: 0,
    max_balance: 99,
    color: 'bg-amber-100 text-amber-800',
    benefits: ['Basic collection service', 'Standard processing time'],
    icon: '🥉'
  },
  {
    id: 'silver',
    name: 'Silver Collector',
    min_balance: 100,
    max_balance: 499,
    color: 'bg-gray-100 text-gray-800',
    benefits: ['Priority collection', 'Faster processing', 'Monthly bonus points'],
    icon: '🥈'
  },
  {
    id: 'gold',
    name: 'Gold Collector',
    min_balance: 500,
    max_balance: 999,
    color: 'bg-yellow-100 text-yellow-800',
    benefits: ['Same-day collection', 'Premium support', 'Exclusive rewards', 'Quarterly bonus'],
    icon: '🥇'
  },
  {
    id: 'platinum',
    name: 'Platinum Collector',
    min_balance: 1000,
    max_balance: 9999,
    color: 'bg-yellow-100 text-yellow-800',
    benefits: ['VIP collection service', 'Personal account manager', 'Custom rewards', 'Annual bonus'],
    icon: '💎'
  },
  {
    id: 'diamond',
    name: 'Diamond Collector',
    min_balance: 10000,
    max_balance: Infinity,
    color: 'bg-blue-100 text-blue-800',
    benefits: ['White-glove service', 'Executive support', 'Luxury rewards', 'Partnership opportunities'],
    icon: '💠'
  }
];

/**
 * Get wallet tier based on current points balance
 */
export function getWalletTier(points: number): WalletTier {
  return WALLET_TIERS.find(tier => 
    points >= tier.min_balance && points <= tier.max_balance
  ) || WALLET_TIERS[0]; // Default to bronze
}

/**
 * Get all users with their wallet data and tier information
 * Uses the original pickups table structure
 */
export async function getUsersWithWalletTiers(): Promise<UserWalletWithTier[]> {
  console.log('🔍 Fetching users with wallet tiers...');
  
  try {
    // Get all user wallets with profile information, fallback if unified table missing
    let source: 'user_wallets' | 'wallets' = 'user_wallets';
    let walletsResp = await supabase
      .from('user_wallets')
      .select(`
        user_id,
        current_points,
        total_points_earned,
        total_points_spent,
        last_updated
      `)
      .order('current_points', { ascending: false });

    if (walletsResp.error && (walletsResp.error.code === 'PGRST205' || walletsResp.error.message?.includes("Could not find the table 'public.user_wallets'"))) {
      console.warn('⚠️ user_wallets not found, falling back to wallets');
      source = 'wallets';
      const legacyResp = await supabase
        .from('wallets')
        .select(`
          user_id,
          balance,
          total_points,
          updated_at
        `)
        .order('balance', { ascending: false });
      // Remap legacy fields to expected unified fields
      walletsResp = {
        data: (legacyResp.data || []).map((w: any) => ({
          user_id: w.user_id,
          current_points: w.balance,
          total_points_earned: w.total_points,
          total_points_spent: 0,
          last_updated: w.updated_at
        })),
        error: legacyResp.error,
        count: legacyResp.count,
        status: legacyResp.status,
        statusText: legacyResp.statusText
      } as any;
    }

    if (walletsResp.error) {
      console.error('❌ Error fetching wallets:', walletsResp.error);
      throw walletsResp.error;
    }
    const wallets = walletsResp.data || [];

    // Get user profiles for wallet holders
    const userIds = wallets?.map(w => w.user_id) || [];
    const { data: profiles, error: profileError } = userIds.length > 0 ? await supabase
      .from('users')
      .select('id, full_name, email')
      .in('id', userIds) : { data: [] };

    if (profileError) {
      console.error('❌ Error fetching profiles:', profileError);
      throw profileError;
    }

    // Get collection statistics for each user from pickups table
    const { data: pickups, error: pickupsError } = userIds.length > 0 ? await supabase
      .from('pickups')
      .select(`
        user_id,
        total_kg,
        created_at,
        status
      `)
      .in('user_id', userIds)
      .eq('status', 'approved') : { data: [] };

    if (pickupsError) {
      console.error('❌ Error fetching pickups:', pickupsError);
      // Continue without pickup data
    }

    // Process and combine the data
    const usersWithTiers: UserWalletWithTier[] = (wallets || []).map((wallet: any) => {
      const profile = profiles?.find(p => p.id === wallet.user_id);
      const userPickups = pickups?.filter(p => p.user_id === wallet.user_id) || [];
      
      // Calculate collection statistics
      const collectionsCount = userPickups.length;
      const totalWeightKg = userPickups.reduce((sum, p) => sum + (p.total_kg || 0), 0);
      const lastActivity = userPickups.length > 0 
        ? userPickups.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
        : (wallet.last_updated ?? wallet.updated_at);

      // Determine tier based on current points
      const currentPoints = wallet.current_points ?? wallet.balance ?? 0;
      const totalEarned = wallet.total_points_earned ?? wallet.total_points ?? 0;
      const totalSpent = wallet.total_points_spent ?? 0;
      const tier = getWalletTier(currentPoints);

      return {
        user_id: wallet.user_id,
        full_name: profile?.full_name || 'Unknown User',
        email: profile?.email || '',
        current_points: currentPoints,
        total_points_earned: totalEarned,
        total_points_spent: totalSpent,
        tier,
        collections_count: collectionsCount,
        total_weight_kg: totalWeightKg,
        last_activity: lastActivity
      };
    });

    console.log('✅ Users with wallet tiers fetched successfully:', usersWithTiers.length);
    return usersWithTiers;

  } catch (error) {
    console.error('❌ Exception in getUsersWithWalletTiers:', error);
    throw error;
  }
}

/**
 * Get tier distribution statistics
 */
export async function getTierDistribution() {
  console.log('📊 Calculating tier distribution...');
  
  try {
    const usersWithTiers = await getUsersWithWalletTiers();
    
    const distribution = WALLET_TIERS.map(tier => {
      const usersInTier = usersWithTiers.filter(user => user.tier.id === tier.id);
      const totalPointsInTier = usersInTier.reduce((sum, user) => sum + user.current_points, 0);
      const totalWeightInTier = usersInTier.reduce((sum, user) => sum + user.total_weight_kg, 0);
      
      return {
        tier,
        user_count: usersInTier.length,
        percentage: usersWithTiers.length > 0 ? (usersInTier.length / usersWithTiers.length) * 100 : 0,
        total_points: totalPointsInTier,
        total_weight_kg: totalWeightInTier,
        avg_points_per_user: usersInTier.length > 0 ? totalPointsInTier / usersInTier.length : 0
      };
    });

    console.log('✅ Tier distribution calculated successfully');
    return distribution;

  } catch (error) {
    console.error('❌ Exception in getTierDistribution:', error);
    throw error;
  }
}

/**
 * Get users approaching next tier
 */
export async function getUsersApproachingNextTier(): Promise<UserWalletWithTier[]> {
  console.log('🎯 Finding users approaching next tier...');
  
  try {
    const usersWithTiers = await getUsersWithWalletTiers();
    
    const approachingNextTier = usersWithTiers.filter(user => {
      const currentTierIndex = WALLET_TIERS.findIndex(tier => tier.id === user.tier.id);
      const nextTier = WALLET_TIERS[currentTierIndex + 1];
      
      if (!nextTier) return false; // Already at highest tier
      
      const pointsToNextTier = nextTier.min_balance - user.current_points;
      return pointsToNextTier <= 50; // Within 50 points of next tier
    });

    console.log('✅ Users approaching next tier found:', approachingNextTier.length);
    return approachingNextTier;

  } catch (error) {
    console.error('❌ Exception in getUsersApproachingNextTier:', error);
    throw error;
  }
}

/**
 * Get tier performance metrics
 */
export async function getTierPerformanceMetrics() {
  console.log('📈 Calculating tier performance metrics...');
  
  try {
    const usersWithTiers = await getUsersWithWalletTiers();
    const distribution = await getTierDistribution();
    
    // Calculate overall metrics
    const totalUsers = usersWithTiers.length;
    const totalPoints = usersWithTiers.reduce((sum, user) => sum + user.current_points, 0);
    const totalWeight = usersWithTiers.reduce((sum, user) => sum + user.total_weight_kg, 0);
    const avgPointsPerUser = totalUsers > 0 ? totalPoints / totalUsers : 0;
    
    // Find most active tier
    const mostActiveTier = distribution.reduce((max, tier) => 
      tier.total_weight_kg > max.total_weight_kg ? tier : max
    );
    
    // Calculate tier retention (users who have moved up tiers)
    const tierUpgrades = usersWithTiers.filter(user => {
      // This would require historical data to track tier changes
      // For now, we'll use a simple heuristic based on total points earned
      return user.total_points_earned > user.current_points * 1.5;
    });

    const metrics = {
      total_users: totalUsers,
      total_points: totalPoints,
      total_weight_kg: totalWeight,
      avg_points_per_user: avgPointsPerUser,
      most_active_tier: mostActiveTier.tier,
      tier_distribution: distribution,
      tier_upgrades: tierUpgrades.length,
      upgrade_rate: totalUsers > 0 ? (tierUpgrades.length / totalUsers) * 100 : 0
    };

    console.log('✅ Tier performance metrics calculated successfully');
    return metrics;

  } catch (error) {
    console.error('❌ Exception in getTierPerformanceMetrics:', error);
    throw error;
  }
}

/**
 * Get personalized tier recommendations for a user
 */
export async function getTierRecommendations(userId: string) {
  console.log(`💡 Getting tier recommendations for user ${userId}...`);
  
  try {
    const usersWithTiers = await getUsersWithWalletTiers();
    const user = usersWithTiers.find(u => u.user_id === userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    const currentTierIndex = WALLET_TIERS.findIndex(tier => tier.id === user.tier.id);
    const nextTier = WALLET_TIERS[currentTierIndex + 1];
    
    if (!nextTier) {
      return {
        current_tier: user.tier,
        next_tier: null,
        points_needed: 0,
        recommendations: ['You are at the highest tier! Keep up the great work!']
      };
    }

    const pointsNeeded = nextTier.min_balance - user.current_points;
    const estimatedCollections = Math.ceil(pointsNeeded / 10); // Assuming 10 points per collection on average
    
    const recommendations = [
      `You need ${pointsNeeded} more points to reach ${nextTier.name}`,
      `Complete approximately ${estimatedCollections} more collections`,
      `Focus on larger collections to reach the next tier faster`,
      `Consider referring friends to earn bonus points`
    ];

    return {
      current_tier: user.tier,
      next_tier: nextTier,
      points_needed: pointsNeeded,
      estimated_collections: estimatedCollections,
      recommendations
    };

  } catch (error) {
    console.error('❌ Exception in getTierRecommendations:', error);
    throw error;
  }
}
