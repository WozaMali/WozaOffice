import { getSupabaseClient } from './supabase'
import { backoffDelays, wait } from './utils'
// Minimal UI coupling: dispatch lightweight events; UI can decide how to display

type ChannelSpec = {
  name: string
  onSetup: (channel: ReturnType<ReturnType<typeof getSupabaseClient>['channel']>) => void
}

class RealtimeManager {
  private channels: Map<string, { spec: ChannelSpec; instance: any | null }> = new Map()
  private isOnline: boolean = true
  private reconnecting: boolean = false
  private reconnectAttempt: number = 0
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null
  private lastHeartbeat: number = 0

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline)
      window.addEventListener('offline', this.handleOffline)
      document.addEventListener('visibilitychange', this.handleVisibility)
      // Start heartbeat to keep connections alive
      this.startHeartbeat()
    }
  }

  subscribe(name: string, onSetup: ChannelSpec['onSetup']) {
    const spec: ChannelSpec = { name, onSetup }
    this.channels.set(name, { spec, instance: null })
    this.attachChannel(spec)
  }

  unsubscribe(name: string) {
    const entry = this.channels.get(name)
    if (entry?.instance) {
      try { entry.instance.unsubscribe() } catch {}
    }
    this.channels.delete(name)
  }

  private attachChannel = (spec: ChannelSpec) => {
    try {
      // Create channel with proper configuration to prevent idle timeouts
      const supabase = getSupabaseClient();
      const channel = supabase.channel(spec.name, {
        config: {
          // Enable presence to keep connection alive
          presence: { key: '' }
        }
      })
      spec.onSetup(channel)
      const sub = channel.subscribe((status) => {
        // Only log status changes in development, and skip CLOSED during normal cleanup
        if (process.env.NODE_ENV === 'development' && status !== 'CLOSED') {
          console.log(`📡 Channel ${spec.name} status:`, status);
        }
        
        if (status === 'SUBSCRIBED') {
          this.reconnectAttempt = 0
          this.lastHeartbeat = Date.now()
          // If we were reconnecting, mark as connected
          if (this.reconnecting) {
            console.log(`✅ Channel ${spec.name} subscribed, marking as connected`);
            this.reconnecting = false
            this.dispatchStatus('connected', {})
          }
        }
        // Only reconnect on actual errors, not on temporary states
        if (status === 'CHANNEL_ERROR') {
          console.warn(`⚠️ Channel ${spec.name} error`);
          if (!this.reconnecting) {
            setTimeout(() => {
              if (!this.reconnecting) {
                this.scheduleReconnect()
              }
            }, 3000) // Wait 3 seconds before reconnecting
          }
        }
        // For TIMED_OUT, reconnect (connection dropped unexpectedly)
        // CLOSED is normal during cleanup/unmount, so don't treat it as an error
        if (status === 'TIMED_OUT') {
          console.warn(`⚠️ Channel ${spec.name} timed out`);
          // Only reconnect if we're not already reconnecting
          if (!this.reconnecting) {
            setTimeout(() => {
              if (!this.reconnecting) {
                this.scheduleReconnect()
              }
            }, 3000) // Wait 3 seconds before reconnecting
          }
        }
        // CLOSED status is normal during component cleanup/unmount
        // Only log if we're not in the middle of a cleanup operation
        // (We can detect this by checking if the channel instance still exists)
      })
      this.channels.set(spec.name, { spec, instance: sub })
    } catch (err) {
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect = async () => {
    if (this.reconnecting || !this.isOnline) {
      console.log('⏸️ Reconnect skipped - already reconnecting or offline');
      return
    }
    this.reconnecting = true
    console.log('🔄 Starting reconnection attempt...');
    
    for (const delay of backoffDelays({ baseMs: 2000, maxMs: 30000, factor: 2, jitter: true, maxAttempts: 5 })) {
      this.reconnectAttempt += 1
      this.dispatchStatus('reconnecting', { attempt: this.reconnectAttempt })
      console.log(`🔄 Reconnection attempt ${this.reconnectAttempt}...`);
      
      try {
        // re-attach all channels
        const specs = Array.from(this.channels.values()).map(e => e.spec)
        if (specs.length === 0) {
          console.log('✅ No channels to reconnect, marking as connected');
          this.reconnecting = false
          this.reconnectAttempt = 0
          this.dispatchStatus('connected', {})
          return
        }
        
        // clean up old instances
        for (const entry of Array.from(this.channels.values())) {
          try { entry.instance?.unsubscribe() } catch {}
          entry.instance = null
        }
        // small delay, then re-subscribe
        await wait(100)
        for (const spec of specs) {
          this.attachChannel(spec)
        }
        
        // Wait a bit to see if channels connect
        await wait(2000)
        
        // Check if at least one channel connected
        const hasConnectedChannel = Array.from(this.channels.values()).some(e => e.instance)
        if (hasConnectedChannel) {
          console.log('✅ Reconnection successful');
          this.reconnecting = false
          this.reconnectAttempt = 0
          this.dispatchStatus('connected', {})
          return
        } else {
          console.log('⚠️ Channels not connected yet, will retry...');
        }
      } catch (err) {
        console.warn('⚠️ Reconnection attempt failed:', err);
        // wait and retry
      }
      await wait(delay)
      if (!this.isOnline) break
    }
    console.log('❌ Reconnection failed after all attempts');
    this.reconnecting = false
    this.reconnectAttempt = 0
    this.dispatchStatus('disconnected', {})
  }

  private handleOnline = () => {
    this.isOnline = true
    this.scheduleReconnect()
  }

  private handleOffline = () => {
    this.isOnline = false
    this.dispatchStatus('offline', {})
  }

  private handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      // Always reconnect when tab becomes visible to ensure fresh connection
      this.scheduleReconnect()
    }
  }

  // Heartbeat to keep connections alive and detect disconnections
  private startHeartbeat = () => {
    // Check connection status every 30 seconds (less aggressive to prevent loops)
    this.heartbeatInterval = setInterval(() => {
      if (document.visibilityState === 'hidden') return // Don't check when tab is hidden
      if (this.reconnecting || !this.isOnline) return // Don't check if already reconnecting or offline
      
      // Check if we have channels that need to be reconnected
      let needsReconnect = false
      const channelEntries = Array.from(this.channels.entries())
      for (const [name, entry] of channelEntries) {
        // If we have a spec but no instance, we need to reconnect
        if (entry.spec && !entry.instance) {
          needsReconnect = true
          console.log(`🔄 Heartbeat: Channel ${name} missing, will reconnect...`)
          break
        }
      }
      
      // Only reconnect if channels are actually missing (not just checking status)
      // Don't reconnect if channels are already connected
      if (needsReconnect) {
        // Add a delay to prevent rapid reconnection attempts
        setTimeout(() => {
          if (!this.reconnecting && this.isOnline) {
            this.scheduleReconnect()
          }
        }, 2000) // Wait 2 seconds before reconnecting
      }
      
      this.lastHeartbeat = Date.now()
    }, 30000) // Check every 30 seconds (less aggressive)
  }

  // Public method to force reconnection attempt (can be called from UI)
  public reconnectNow() {
    this.scheduleReconnect()
  }

  private dispatchStatus(type: 'connected' | 'disconnected' | 'reconnecting' | 'offline', detail: any) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('realtime-status', { detail: { type, ...detail } }))
    }
  }
}

export const realtimeManager = new RealtimeManager()


