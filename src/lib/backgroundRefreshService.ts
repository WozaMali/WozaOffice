/**
 * Background Refresh Service
 * Periodically refreshes data in the background to keep the app up-to-date
 * without requiring manual refreshes
 */

type RefreshCallback = () => Promise<void> | void
type UserRefreshState = {
  intervalId: ReturnType<typeof setInterval> | null
  lastRefresh: number
  isRefreshing: boolean
  callbacks: Set<RefreshCallback>
}

class BackgroundRefreshService {
  private userStates: Map<string, UserRefreshState> = new Map()
  private readonly REFRESH_INTERVAL = 60000 // 60 seconds (reduced frequency to prevent overload)
  private readonly CACHE_DURATION = 300000 // 5 minutes (increased cache to reduce queries)
  private readonly IDLE_REFRESH_INTERVAL = 10 * 60 * 1000 // 10 minutes for idle refresh

  /**
   * Start background refresh for a user
   */
  startBackgroundRefresh(userId: string | undefined | null, callback: RefreshCallback) {
    if (!userId) return

    let state = this.userStates.get(userId)
    if (!state) {
      state = {
        intervalId: null,
        lastRefresh: 0,
        isRefreshing: false,
        callbacks: new Set()
      }
      this.userStates.set(userId, state)
    }

    // Add callback
    state.callbacks.add(callback)

    // If already running, just return
    if (state.intervalId) return

    // Perform immediate refresh
    this.performRefresh(userId)

    // Set up periodic refresh
    state.intervalId = setInterval(() => {
      this.performRefresh(userId)
    }, this.REFRESH_INTERVAL)

    console.log(`✅ Background refresh started for user ${userId}`)
  }

  /**
   * Stop background refresh for a user
   */
  stopBackgroundRefresh(userId: string | undefined | null) {
    if (!userId) return

    const state = this.userStates.get(userId)
    if (!state) return

    if (state.intervalId) {
      clearInterval(state.intervalId)
      state.intervalId = null
    }

    state.callbacks.clear()
    this.userStates.delete(userId)

    console.log(`🛑 Background refresh stopped for user ${userId}`)
  }

  /**
   * Force immediate refresh, bypassing cache
   */
  async forceRefresh(userId: string | undefined | null): Promise<void> {
    if (!userId) return

    const state = this.userStates.get(userId)
    if (!state || state.callbacks.size === 0) return

    // Reset last refresh to force update
    state.lastRefresh = 0
    await this.performRefresh(userId, true)
  }

  /**
   * Check if a user is currently refreshing
   */
  isUserRefreshing(userId: string | undefined | null): boolean {
    if (!userId) return false
    const state = this.userStates.get(userId)
    return state?.isRefreshing ?? false
  }

  /**
   * Remove a callback from a user's refresh list
   */
  removeCallback(userId: string | undefined | null, callback: RefreshCallback) {
    if (!userId) return

    const state = this.userStates.get(userId)
    if (!state) return

    state.callbacks.delete(callback)

    // If no more callbacks, stop the refresh
    if (state.callbacks.size === 0) {
      this.stopBackgroundRefresh(userId)
    }
  }

  /**
   * Perform the actual refresh
   * Works even when tab is hidden to keep data fresh
   */
  private async performRefresh(userId: string, force: boolean = false) {
    const state = this.userStates.get(userId)
    if (!state || state.callbacks.size === 0) return

    // Check cache if not forcing
    if (!force) {
      const timeSinceLastRefresh = Date.now() - state.lastRefresh
      if (timeSinceLastRefresh < this.CACHE_DURATION) {
        console.log(`⏭️ Skipping refresh for user ${userId} (cache still valid)`)
        return
      }
    }

    // Prevent concurrent refreshes
    if (state.isRefreshing) {
      console.log(`⏸️ Refresh already in progress for user ${userId}`)
      return
    }

    state.isRefreshing = true
    state.lastRefresh = Date.now()

    try {
      // Execute all callbacks with timeout protection
      const promises = Array.from(state.callbacks).map(callback => {
        try {
          // Add timeout to prevent hanging callbacks
          return Promise.race([
            Promise.resolve(callback()),
            new Promise((resolve) => setTimeout(() => {
              console.warn(`⚠️ Refresh callback timeout for user ${userId}`)
              resolve(undefined)
            }, 30000)) // 30 second timeout per callback
          ])
        } catch (error) {
          console.error('Error in refresh callback:', error)
          return Promise.resolve()
        }
      })

      await Promise.all(promises)

      // Dispatch custom event for components to listen to
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app-data-refreshed', {
          detail: { userId, timestamp: Date.now() }
        }))
      }

      console.log(`✅ Background refresh completed for user ${userId}`)
    } catch (error) {
      console.error(`❌ Background refresh failed for user ${userId}:`, error)
      // Don't give up - will retry on next interval
    } finally {
      state.isRefreshing = false
    }
  }

  /**
   * Get last refresh time for a user
   */
  getLastRefresh(userId: string | undefined | null): number | null {
    if (!userId) return null
    const state = this.userStates.get(userId)
    return state?.lastRefresh ?? null
  }
}

// Export singleton instance
export const backgroundRefreshService = new BackgroundRefreshService()

