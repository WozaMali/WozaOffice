// ============================================================================
// UNIFIED SERVICES FOR WOZAMALI OFFICE APP
// ============================================================================
// These services work with the new unified database schema
// Provides administrative control over user wallets, metrics, and points

import { supabase } from './supabase'
import { realtimeManager } from './realtimeManager'
import {
  UserProfile,
  CollectionPickup,
  PickupItem,
  Material,
  UserWallet,
  PointsTransaction,
  AdminActionsLog,
  CollectionMetrics,
  AdminFunctionResponse,
  WalletResetResponse,
  MetricsResetResponse,
  PointsAdjustmentResponse,
  UserSummaryResponse,
  CollectionPickupWithDetails,
  PickupItemWithMaterial
} from './unified-types'

// ============================================================================
// 1. USER MANAGEMENT SERVICES
// ============================================================================

export const userServices = {
  // Get all users with their profiles
  async getAllUsers(): Promise<UserProfile[]> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching users:', error)
      return []
    }
  },

  // Get user by ID with full details
  async getUserById(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching user:', error)
      return null
    }
  },

  // Update user role or status
  async updateUserRole(userId: string, newRole: string, newStatus?: string): Promise<boolean> {
    try {
      const updateData: any = { role: newRole }
      if (newStatus) updateData.status = newStatus

      const { error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', userId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error updating user role:', error)
      return false
    }
  },

  // Get users by role
  async getUsersByRole(role: string): Promise<UserProfile[]> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('role', role)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching users by role:', error)
      return []
    }
  }
}

// ============================================================================
// 2. COLLECTION MANAGEMENT SERVICES
// ============================================================================

export const collectionServices = {
  // Get all collection pickups with details
  async getAllPickups(): Promise<CollectionPickupWithDetails[]> {
    try {
      const { data, error } = await supabase
        .from('collection_pickups')
        .select(`
          *,
          zone:collection_zones(*),
          collector:user_profiles!collection_pickups_collector_id_fkey(*),
          items:pickup_items(
            *,
            material:materials(*)
          ),
          photos:pickup_photos(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching pickups:', error)
      return []
    }
  },

  // Get pickup by ID with full details
  async getPickupById(pickupId: string): Promise<CollectionPickupWithDetails | null> {
    try {
      const { data, error } = await supabase
        .from('collection_pickups')
        .select(`
          *,
          zone:collection_zones(*),
          collector:user_profiles!collection_pickups_collector_id_fkey(*),
          items:pickup_items(
            *,
            material:materials(*)
          ),
          photos:pickup_photos(*)
        `)
        .eq('id', pickupId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching pickup:', error)
      return null
    }
  },

  // Update pickup status
  async updatePickupStatus(pickupId: string, newStatus: string, notes?: string): Promise<boolean> {
    try {
      const updateData: any = { status: newStatus }
      if (notes) updateData.notes = notes
      if (newStatus === 'completed') updateData.completed_at = new Date().toISOString()

      const { error } = await supabase
        .from('collection_pickups')
        .update(updateData)
        .eq('id', pickupId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error updating pickup status:', error)
      return false
    }
  },

  // Get pickups by status
  async getPickupsByStatus(status: string): Promise<CollectionPickupWithDetails[]> {
    try {
      const { data, error } = await supabase
        .from('collection_pickups')
        .select(`
          *,
          zone:collection_zones(*),
          collector:user_profiles!collection_pickups_collector_id_fkey(*),
          items:pickup_items(
            *,
            material:materials(*)
          ),
          photos:pickup_photos(*)
        `)
        .eq('status', status)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching pickups by status:', error)
      return []
    }
  }
}

// ============================================================================
// 3. MATERIALS & PRICING SERVICES
// ============================================================================

export const materialServices = {
  // Get all materials with categories
  async getAllMaterials(): Promise<Material[]> {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select(`
          *,
          category:materials(*)
        `)
        .eq('active', true)
        .order('name')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching materials:', error)
      return []
    }
  },

  // Update material pricing
  async updateMaterialPricing(materialId: string, newPrice: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('materials')
        .update({ 
          current_price_per_unit: newPrice,
          updated_at: new Date().toISOString()
        })
        .eq('id', materialId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error updating material pricing:', error)
      return false
    }
  },

  // Get material categories
  async getMaterialCategories(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('active', true)
        .order('sort_order')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching material categories:', error)
      return []
    }
  }
}

// ============================================================================
// 4. WALLET & POINTS ADMINISTRATION SERVICES
// ============================================================================

export const walletAdminServices = {
  // Reset user wallet to 0 points
  async resetUserWallet(
    targetUserId: string, 
    adminUserId: string, 
    reason: string = 'Administrative reset',
    adminNotes?: string
  ): Promise<WalletResetResponse> {
    try {
      const { data, error } = await supabase.rpc('reset_user_wallet', {
        target_user_uuid: targetUserId,
        admin_user_uuid: adminUserId,
        reason,
        admin_notes: adminNotes
      })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error resetting user wallet:', error)
      return {
        success: false,
        message: 'Failed to reset user wallet',
        old_points: 0,
        new_points: 0,
        reset_at: new Date().toISOString()
      }
    }
  },

  // Reset user collection metrics
  async resetUserMetrics(
    targetUserId: string,
    adminUserId: string,
    reason: string = 'Administrative reset',
    adminNotes?: string
  ): Promise<MetricsResetResponse> {
    try {
      const { data, error } = await supabase.rpc('reset_user_metrics', {
        target_user_uuid: targetUserId,
        admin_user_uuid: adminUserId,
        reason,
        admin_notes: adminNotes
      })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error resetting user metrics:', error)
      return {
        success: false,
        message: 'Failed to reset user metrics',
        reset_at: new Date().toISOString()
      }
    }
  },

  // Adjust user points (add or subtract)
  async adjustUserPoints(
    targetUserId: string,
    adminUserId: string,
    pointsAdjustment: number,
    adjustmentType: string = 'adjustment',
    reason: string = 'Administrative adjustment',
    adminNotes?: string
  ): Promise<PointsAdjustmentResponse> {
    try {
      const { data, error } = await supabase.rpc('adjust_user_points', {
        target_user_uuid: targetUserId,
        admin_user_uuid: adminUserId,
        points_adjustment: pointsAdjustment,
        adjustment_type: adjustmentType,
        reason,
        admin_notes: adminNotes
      })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error adjusting user points:', error)
      return {
        success: false,
        message: 'Failed to adjust user points',
        old_points: 0,
        points_adjustment: pointsAdjustment,
        new_points: 0,
        adjusted_at: new Date().toISOString()
      }
    }
  },

  // Get user summary (profile, wallet, metrics)
  async getUserSummary(
    targetUserId: string,
    adminUserId: string
  ): Promise<UserSummaryResponse> {
    try {
      const { data, error } = await supabase.rpc('get_user_summary', {
        target_user_uuid: targetUserId,
        admin_user_uuid: adminUserId
      })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting user summary:', error)
      return {
        success: false,
        message: 'Failed to get user summary',
        user_profile: {},
        wallet_info: {},
        collection_summary: {
          total_pickups: 0,
          total_materials_kg: 0,
          total_value: 0,
          total_points_earned: 0
        },
        retrieved_at: new Date().toISOString()
      }
    }
  },

  // Get user wallet details
  async getUserWallet(userId: string): Promise<UserWallet | null> {
    try {
      // Try unified table then fallback to legacy wallets
      let resp = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      if (resp.error && (resp.error.code === 'PGRST205' || resp.error.message?.includes("Could not find the table 'public.user_wallets'"))) {
        console.warn('⚠️ user_wallets not found, falling back to wallets')
        resp = await supabase
          .from('wallets')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle()
      }
      if (resp.error) throw resp.error

      return resp.data as any
    } catch (error) {
      console.error('Error fetching user wallet:', error)
      return null
    }
  },

  // Get user points transactions
  async getUserPointsTransactions(userId: string): Promise<PointsTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userId)
        .gt('points', 0)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching points transactions:', error)
      return []
    }
  }
}

// ============================================================================
// 5. ANALYTICS & REPORTING SERVICES
// ============================================================================

export const analyticsServices = {
  // Get collection metrics for a user
  async getUserCollectionMetrics(userId: string): Promise<CollectionMetrics[]> {
    try {
      const { data, error } = await supabase
        .from('collection_metrics')
        .select('*')
        .eq('collector_id', userId)
        .order('date', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching collection metrics:', error)
      return []
    }
  },

  // Get system-wide collection metrics
  async getSystemCollectionMetrics(): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('collection_metrics')
        .select('*')
        .order('date', { ascending: false })

      if (error) throw error

      // Calculate totals
      const totals = data?.reduce((acc, metric) => {
        acc.total_pickups += metric.total_pickups
        acc.completed_pickups += metric.completed_pickups
        acc.total_materials_kg += metric.total_materials_kg
        acc.total_value += metric.total_value
        acc.points_earned += metric.points_earned
        return acc
      }, {
        total_pickups: 0,
        completed_pickups: 0,
        total_materials_kg: 0,
        total_value: 0,
        points_earned: 0
      }) || {
        total_pickups: 0,
        completed_pickups: 0,
        total_materials_kg: 0,
        total_value: 0,
        points_earned: 0
      }

      return {
        daily_metrics: data || [],
        totals
      }
    } catch (error) {
      console.error('Error fetching system metrics:', error)
      return {
        daily_metrics: [],
        totals: {
          total_pickups: 0,
          completed_pickups: 0,
          total_materials_kg: 0,
          total_value: 0,
          points_earned: 0
        }
      }
    }
  },

  // Get admin actions log
  async getAdminActionsLog(adminUserId?: string): Promise<AdminActionsLog[]> {
    try {
      let query = supabase
        .from('admin_actions_log')
        .select('*')
        .order('created_at', { ascending: false })

      if (adminUserId) {
        query = query.eq('admin_user_id', adminUserId)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching admin actions log:', error)
      return []
    }
  }
}

// ============================================================================
// 6. REAL-TIME SUBSCRIPTION SERVICES
// ============================================================================

export const realtimeServices = {
  // Subscribe to user profile changes
  subscribeToUserProfiles(callback: (payload: any) => void) {
    realtimeManager.subscribe('user_profiles_changes', (channel) => {
      channel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_profiles'
      }, callback)
    })
    return () => { realtimeManager.unsubscribe('user_profiles_changes') }
  },

  // Subscribe to collection pickup changes
  subscribeToCollectionPickups(callback: (payload: any) => void) {
    realtimeManager.subscribe('collection_pickups_changes', (channel) => {
      channel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'collection_pickups'
      }, callback)
    })
    return () => { realtimeManager.unsubscribe('collection_pickups_changes') }
  },

  // Subscribe to pickup items changes
  subscribeToPickupItems(callback: (payload: any) => void) {
    realtimeManager.subscribe('pickup_items_changes', (channel) => {
      channel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pickup_items'
      }, callback)
    })
    return () => { realtimeManager.unsubscribe('pickup_items_changes') }
  },

  // Subscribe to user wallet changes
  subscribeToUserWallets(callback: (payload: any) => void) {
    realtimeManager.subscribe('user_wallets_changes', (channel) => {
      channel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_wallets'
      }, callback)
    })
    return () => { realtimeManager.unsubscribe('user_wallets_changes') }
  },

  // Subscribe to admin actions log
  subscribeToAdminActions(callback: (payload: any) => void) {
    realtimeManager.subscribe('admin_actions_changes', (channel) => {
      channel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'admin_actions_log'
      }, callback)
    })
    return () => { realtimeManager.unsubscribe('admin_actions_changes') }
  }
}

// ============================================================================
// 7. LEGACY COMPATIBILITY SERVICES
// ============================================================================
// These maintain backward compatibility with existing code

export const legacyServices = {
  // Get pickups (legacy format)
  async getPickups(): Promise<CollectionPickupWithDetails[]> {
    return collectionServices.getAllPickups()
  },

  // Get recent activity
  async getRecentActivity(): Promise<any[]> {
    try {
      const pickups = await collectionServices.getAllPickups()
      const users = await userServices.getAllUsers()

      const activities = [
        ...pickups.slice(0, 5).map(pickup => ({
          id: pickup.id,
          type: 'pickup_created',
          title: `New pickup created`,
          description: `Pickup ${pickup.pickup_code} for ${pickup.customer_name}`,
          timestamp: pickup.created_at,
          user: pickup.collector?.full_name || 'Unknown'
        })),
        ...users.slice(0, 3).map(user => ({
          id: user.id,
          type: 'user_registered',
          title: `New user registered`,
          description: `${user.full_name} joined as ${user.role}`,
          timestamp: user.created_at,
          user: user.full_name
        }))
      ]

      return activities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
    } catch (error) {
      console.error('Error fetching recent activity:', error)
      return []
    }
  }
}

// ============================================================================
// 8. EXPORT ALL SERVICES
// ============================================================================

// Note: individual services are already exported above
