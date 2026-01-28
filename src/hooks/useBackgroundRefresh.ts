import { useEffect, useState, useCallback } from 'react'
import { backgroundRefreshService } from '@/lib/backgroundRefreshService'

type RefreshCallback = () => Promise<void> | void

/**
 * Hook for background data refresh
 * 
 * @param userId - User ID to track refresh for
 * @param refreshCallback - Callback function to execute on refresh
 * @returns Object with forceRefresh function and isRefreshing status
 */
export function useBackgroundRefresh(
  userId: string | undefined | null,
  refreshCallback?: RefreshCallback
) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<number | null>(null)

  // Force refresh function
  const forceRefresh = useCallback(async () => {
    if (!userId) return
    setIsRefreshing(true)
    try {
      await backgroundRefreshService.forceRefresh(userId)
      setLastRefresh(Date.now())
    } finally {
      setIsRefreshing(false)
    }
  }, [userId])

  // Listen for refresh events
  useEffect(() => {
    if (!userId) return

    const handleRefresh = (event: CustomEvent) => {
      if (event.detail?.userId === userId) {
        setIsRefreshing(false)
        setLastRefresh(event.detail.timestamp)
      }
    }

    window.addEventListener('app-data-refreshed', handleRefresh as EventListener)
    return () => {
      window.removeEventListener('app-data-refreshed', handleRefresh as EventListener)
    }
  }, [userId])

  // Start/stop background refresh when userId or callback changes
  useEffect(() => {
    if (!userId || !refreshCallback) {
      return
    }

    // Start background refresh
    backgroundRefreshService.startBackgroundRefresh(userId, refreshCallback)

    // Cleanup on unmount or change
    return () => {
      backgroundRefreshService.removeCallback(userId, refreshCallback)
    }
  }, [userId, refreshCallback])

  return {
    forceRefresh,
    isRefreshing: isRefreshing || backgroundRefreshService.isUserRefreshing(userId),
    lastRefresh
  }
}

