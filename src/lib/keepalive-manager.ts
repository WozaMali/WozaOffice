import { getSupabaseClient } from './supabase'
import { realtimeManager } from './realtimeManager'

/**
 * KeepAlive Manager
 * Prevents app disconnection by:
 * 1. Keeping auth session alive with periodic refreshes
 * 2. Keeping realtime connections alive with pings
 * 3. Automatically refreshing data when tab becomes visible
 * 4. Detecting and recovering from silent disconnections
 */
class KeepAliveManager {
  private authRefreshInterval: ReturnType<typeof setInterval> | null = null
  private connectionPingInterval: ReturnType<typeof setInterval> | null = null
  private lastActivity: number = Date.now()
  private isActive: boolean = false

  /**
   * Start the keepalive system
   */
  start() {
    if (this.isActive) return
    this.isActive = true
    this.lastActivity = Date.now()

    // Track user activity to reset timers
    this.setupActivityTracking()

    // Refresh auth session every 5 minutes (before typical 10-15 min timeout)
    this.startAuthRefresh()

    // Ping connection every 8 seconds to keep it alive
    this.startConnectionPing()

    // Refresh when tab becomes visible
    this.setupVisibilityRefresh()

    console.log('✅ KeepAlive Manager started')
  }

  /**
   * Stop the keepalive system
   */
  stop() {
    this.isActive = false
    if (this.authRefreshInterval) {
      clearInterval(this.authRefreshInterval)
      this.authRefreshInterval = null
    }
    if (this.connectionPingInterval) {
      clearInterval(this.connectionPingInterval)
      this.connectionPingInterval = null
    }
    console.log('🛑 KeepAlive Manager stopped')
  }

  /**
   * Track user activity (mouse, keyboard, touch, scroll)
   */
  private setupActivityTracking() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    const updateActivity = () => {
      this.lastActivity = Date.now()
    }

    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true })
    })
  }

  /**
   * Refresh auth session periodically to prevent timeout
   * Works even when tab is hidden to maintain session
   */
  private startAuthRefresh() {
    // Refresh every 4 minutes (240000ms) - more frequent to prevent any timeout
    // This ensures session stays alive even after 20+ minutes of inactivity
    this.authRefreshInterval = setInterval(async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.warn('⚠️ KeepAlive: Session refresh error:', error)
          // Try to recover by refreshing
          try {
            await supabase.auth.refreshSession()
          } catch (recoverErr) {
            console.warn('⚠️ KeepAlive: Recovery attempt failed:', recoverErr)
          }
          return
        }

        if (session) {
          // Check if session is about to expire (within 5 minutes)
          const expiresAt = session.expires_at ? session.expires_at * 1000 : 0
          const timeUntilExpiry = expiresAt - Date.now()
          
          // Refresh if expiring soon or if it's been more than 3 minutes since last refresh
          if (timeUntilExpiry < 5 * 60 * 1000 || timeUntilExpiry > 60 * 60 * 1000) {
            const { error: refreshError } = await supabase.auth.refreshSession()
            if (refreshError) {
              console.warn('⚠️ KeepAlive: Token refresh error, forcing logout:', refreshError)
              // If refresh fails, it means the session is likely invalid. Force full logout.
              // This will also trigger a redirect to the login page.
              const { LogoutUtils } = await import('@/lib/logout-utils');
              await LogoutUtils.performCompleteLogout(supabase);
              LogoutUtils.forceRedirectToHome();
            } else {
              console.log('✅ KeepAlive: Session refreshed successfully')
            }
          }
        } else {
          // No session - try to get a new one
          console.warn('⚠️ KeepAlive: No active session found')
        }
      } catch (err) {
        console.error('❌ KeepAlive: Auth refresh failed:', err)
        // Don't give up - try again on next interval
      }
    }, 4 * 60 * 1000) // Every 4 minutes (more frequent to prevent timeouts)
  }

  /**
   * Ping connection to keep it alive
   * Works even when tab is hidden to prevent disconnection
   */
  private startConnectionPing() {
    // Ping every 15 seconds to keep connection alive (before 30s timeout)
    // Increased interval to reduce load, but still frequent enough
    this.connectionPingInterval = setInterval(async () => {
      // Continue pinging even when tab is hidden to prevent disconnection
      // This ensures the app works when you return after 20+ minutes

      try {
        // Make a lightweight query to keep connection alive
        // This also verifies the connection is working
        const supabase = getSupabaseClient();
        
        // Use a very lightweight query that works even when idle
        const { error } = await Promise.race([
          supabase
            .from('users')
            .select('id')
            .limit(1)
            .single(),
          // Add timeout to prevent hanging
          new Promise<{ error: any }>((resolve) => 
            setTimeout(() => resolve({ error: { code: 'TIMEOUT' } }), 5000)
          )
        ]) as any

        if (error) {
          if (error.code === 'PGRST116') {
            // PGRST116 is "no rows returned" which is fine
            this.lastActivity = Date.now()
          } else if (error.code === 'TIMEOUT') {
            console.warn('⚠️ KeepAlive: Ping timeout, reconnecting...')
            realtimeManager.reconnectNow()
          } else {
            console.warn('⚠️ KeepAlive: Connection ping failed, reconnecting...', error.code)
            // Trigger reconnection
            realtimeManager.reconnectNow()
          }
        } else {
          // Connection is alive
          this.lastActivity = Date.now()
        }
      } catch (err) {
        console.warn('⚠️ KeepAlive: Ping error, reconnecting...', err)
        realtimeManager.reconnectNow()
      }
    }, 15000) // Every 15 seconds (reduced frequency but still keeps connection alive)
  }

  /**
   * Refresh data when tab becomes visible
   * Also handles long idle periods gracefully
   */
  private setupVisibilityRefresh() {
    let lastHiddenTime = 0
    let lastVisibleTime = Date.now()

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const hiddenDuration = Date.now() - lastHiddenTime
        const timeSinceLastVisible = Date.now() - lastVisibleTime
        
        // Always refresh if tab was hidden, regardless of duration
        // This ensures the app works after any period of inactivity
        if (hiddenDuration > 1000 || timeSinceLastVisible > 60000) {
          console.log('🔄 KeepAlive: Tab visible after', Math.round(hiddenDuration / 1000), 'seconds, refreshing...')
          
          // Refresh session immediately
          const supabase = getSupabaseClient();
          supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (session) {
              // Always refresh when tab becomes visible to ensure fresh session
              const { error: refreshError } = await supabase.auth.refreshSession();
              if (refreshError) {
                console.warn('⚠️ KeepAlive: Visibility refresh token error, forcing logout:', refreshError);
                const { LogoutUtils } = await import('@/lib/logout-utils');
                await LogoutUtils.performCompleteLogout(supabase);
                LogoutUtils.forceRedirectToHome();
              } else {
                console.log('✅ KeepAlive: Session refreshed on visibility change')
              }
            }
          }).catch(console.error)

          // Reconnect realtime
          realtimeManager.reconnectNow()

          // Trigger app refresh event to update all data
          window.dispatchEvent(new CustomEvent('app:refresh', { 
            detail: { reason: 'visibility-change', hiddenDuration } 
          }))
        }
        
        lastVisibleTime = Date.now()
      } else {
        lastHiddenTime = Date.now()
      }
    }, { passive: true })
    
    // Also check periodically if we've been idle too long (even if tab is visible)
    // This handles cases where user leaves tab open but doesn't interact
    setInterval(() => {
      const timeSinceActivity = Date.now() - this.lastActivity
      const timeSinceVisible = Date.now() - lastVisibleTime
      
      // If idle for more than 10 minutes, refresh to ensure everything stays alive
      if (timeSinceActivity > 10 * 60 * 1000 && document.visibilityState === 'visible') {
        console.log('🔄 KeepAlive: Long idle period detected, refreshing...')
        
        const supabase = getSupabaseClient();
        supabase.auth.getSession().then(async ({ data: { session } }) => {
          if (session) {
            await supabase.auth.refreshSession().catch(console.warn)
          }
        }).catch(console.warn)
        
        // Trigger refresh
        window.dispatchEvent(new CustomEvent('app:refresh', { 
          detail: { reason: 'idle-refresh' } 
        }))
        
        this.lastActivity = Date.now()
      }
    }, 5 * 60 * 1000) // Check every 5 minutes
  }

  /**
   * Get last activity timestamp
   */
  getLastActivity(): number {
    return this.lastActivity
  }

  /**
   * Check if manager is active
   */
  getActive(): boolean {
    return this.isActive
  }
}

// Export singleton instance
export const keepAliveManager = new KeepAliveManager()

// Auto-start when module loads (client-side only)
if (typeof window !== 'undefined') {
  // Start after a short delay to ensure Supabase is initialized
  setTimeout(() => {
    keepAliveManager.start()
  }, 2000)
}

