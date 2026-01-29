import { supabase } from './supabase'
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
   */
  private startAuthRefresh() {
    // Refresh every 5 minutes (300000ms)
    this.authRefreshInterval = setInterval(async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.warn('⚠️ KeepAlive: Session refresh error:', error)
          return
        }

        if (session) {
          // Refresh the session token
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
      } catch (err) {
        console.error('❌ KeepAlive: Auth refresh failed:', err)
      }
    }, 5 * 60 * 1000) // 5 minutes
  }

  /**
   * Ping connection to keep it alive
   */
  private startConnectionPing() {
    // Ping every 8 seconds to keep connection alive (before 30s timeout)
    this.connectionPingInterval = setInterval(async () => {
      // Skip if tab is hidden
      if (document.visibilityState === 'hidden') return

      try {
        // Make a lightweight query to keep connection alive
        // This also verifies the connection is working
        const { error } = await supabase
          .from('users')
          .select('id')
          .limit(1)
          .single()

        if (error && error.code !== 'PGRST116') {
          // PGRST116 is "no rows returned" which is fine
          console.warn('⚠️ KeepAlive: Connection ping failed, reconnecting...', error.code)
          // Trigger reconnection
          realtimeManager.reconnectNow()
        } else {
          // Connection is alive
          this.lastActivity = Date.now()
        }
      } catch (err) {
        console.warn('⚠️ KeepAlive: Ping error, reconnecting...', err)
        realtimeManager.reconnectNow()
      }
    }, 8000) // Every 8 seconds
  }

  /**
   * Refresh data when tab becomes visible
   */
  private setupVisibilityRefresh() {
    let lastHiddenTime = 0

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const hiddenDuration = Date.now() - lastHiddenTime
        
        // If tab was hidden for more than 5 seconds, refresh
        if (hiddenDuration > 5000) {
          console.log('🔄 KeepAlive: Tab visible after', Math.round(hiddenDuration / 1000), 'seconds, refreshing...')
          
          // Refresh session
          supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (session) {
              const { error: refreshError } = await supabase.auth.refreshSession();
              if (refreshError) {
                console.warn('⚠️ KeepAlive: Visibility refresh token error, forcing logout:', refreshError);
                const { LogoutUtils } = await import('@/lib/logout-utils');
                await LogoutUtils.performCompleteLogout(supabase);
                LogoutUtils.forceRedirectToHome();
              }
            }
          }).catch(console.error)

          // Reconnect realtime
          realtimeManager.reconnectNow()

          // Trigger app refresh event
          window.dispatchEvent(new Event('app:refresh'))
        }
      } else {
        lastHiddenTime = Date.now()
      }
    }, { passive: true })
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

