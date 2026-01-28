import { supabase } from './supabase'
import { realtimeManager } from './realtimeManager'

type UpdateCallback<T = any> = (payload: T) => void
type SubscriptionId = string

interface Subscription {
  id: SubscriptionId
  userId: string
  type: 'wallet' | 'collections' | 'notifications' | 'custom'
  unsubscribe: () => void
}

/**
 * Realtime Data Service
 * Manages Supabase realtime subscriptions with automatic reconnection logic
 */
class RealtimeDataService {
  private subscriptions: Map<SubscriptionId, Subscription> = new Map()
  private isOnline: boolean = true
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts: number = 0
  private readonly MAX_RECONNECT_DELAY = 30000 // 30 seconds

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline)
      window.addEventListener('offline', this.handleOffline)
    }
  }

  /**
   * Subscribe to wallet updates for a user
   */
  subscribeToWalletUpdates(
    userId: string,
    onUpdate: UpdateCallback
  ): SubscriptionId {
    return this.subscribe('wallet', userId, 'wallets', onUpdate, {
      filter: `user_id=eq.${userId}`
    })
  }

  /**
   * Subscribe to collection updates for a user
   */
  subscribeToCollectionUpdates(
    userId: string,
    onUpdate: UpdateCallback
  ): SubscriptionId {
    return this.subscribe('collections', userId, 'pickups', onUpdate, {
      filter: `customer_id=eq.${userId}`
    })
  }

  /**
   * Subscribe to notification updates for a user
   */
  subscribeToNotificationUpdates(
    userId: string,
    onUpdate: UpdateCallback
  ): SubscriptionId {
    return this.subscribe('notifications', userId, 'notifications', onUpdate, {
      filter: `user_id=eq.${userId}`
    })
  }

  /**
   * Subscribe to custom table updates
   */
  subscribeToTableUpdates(
    tableName: string,
    userId: string,
    onUpdate: UpdateCallback,
    filter?: string
  ): SubscriptionId {
    return this.subscribe('custom', userId, tableName, onUpdate, {
      filter: filter || `user_id=eq.${userId}`
    })
  }

  /**
   * Generic subscribe method
   */
  private subscribe(
    type: Subscription['type'],
    userId: string,
    tableName: string,
    onUpdate: UpdateCallback,
    options: { filter?: string } = {}
  ): SubscriptionId {
    const subscriptionId = `${type}_${userId}_${tableName}_${Date.now()}`

    const channelName = `${type}_${userId}_${tableName}`
    
    const unsubscribe = realtimeManager.subscribe(channelName, (channel) => {
      channel
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: tableName,
          filter: options.filter
        }, (payload) => {
          if (this.isOnline) {
            onUpdate(payload)
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.reconnectAttempts = 0
            console.log(`✅ Realtime subscribed: ${channelName}`)
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn(`⚠️ Realtime error for ${channelName}, will reconnect`)
            this.scheduleReconnect()
          }
        })
    })

    const subscription: Subscription = {
      id: subscriptionId,
      userId,
      type,
      unsubscribe: () => {
        realtimeManager.unsubscribe(channelName)
        this.subscriptions.delete(subscriptionId)
      }
    }

    this.subscriptions.set(subscriptionId, subscription)
    return subscriptionId
  }

  /**
   * Unsubscribe from a specific subscription
   */
  unsubscribe(subscriptionId: SubscriptionId) {
    const subscription = this.subscriptions.get(subscriptionId)
    if (subscription) {
      subscription.unsubscribe()
      this.subscriptions.delete(subscriptionId)
    }
  }

  /**
   * Unsubscribe all subscriptions for a user
   */
  unsubscribeUser(userId: string) {
    const userSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.userId === userId)

    userSubscriptions.forEach(sub => {
      sub.unsubscribe()
    })

    console.log(`🛑 Unsubscribed all realtime for user ${userId}`)
  }

  /**
   * Handle online event
   */
  private handleOnline = () => {
    this.isOnline = true
    this.reconnectAttempts = 0
    
    // Debounce reconnection: wait 1 second after network returns
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }

    this.reconnectTimeout = setTimeout(() => {
      console.log('🌐 Network online, reconnecting realtime...')
      realtimeManager.reconnectNow()
      this.reconnectTimeout = null
    }, 1000)
  }

  /**
   * Handle offline event
   */
  private handleOffline = () => {
    this.isOnline = false
    console.log('📴 Network offline')
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect() {
    if (!this.isOnline) return

    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts),
      this.MAX_RECONNECT_DELAY
    )

    this.reconnectAttempts++

    setTimeout(() => {
      if (this.isOnline) {
        console.log(`🔄 Reconnecting realtime (attempt ${this.reconnectAttempts})...`)
        realtimeManager.reconnectNow()
      }
    }, delay)
  }

  /**
   * Get all active subscriptions for a user
   */
  getUserSubscriptions(userId: string): Subscription[] {
    return Array.from(this.subscriptions.values())
      .filter(sub => sub.userId === userId)
  }

  /**
   * Get subscription count
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size
  }
}

// Export singleton instance
export const realtimeDataService = new RealtimeDataService()

