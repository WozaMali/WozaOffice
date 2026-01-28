import { useState, useEffect, useCallback } from 'react'

/**
 * Hook for monitoring online/offline connectivity status
 * 
 * @returns Object with isOnline status, lastChangeAt timestamp, and checkNow function
 */
export function useConnectivity() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [lastChangeAt, setLastChangeAt] = useState<Date>(new Date())

  // Manual connectivity check
  const checkNow = useCallback(() => {
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true
    if (online !== isOnline) {
      setIsOnline(online)
      setLastChangeAt(new Date())
    }
    return online
  }, [isOnline])

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setLastChangeAt(new Date())
      console.log('🌐 Network: Online')
    }

    const handleOffline = () => {
      setIsOnline(false)
      setLastChangeAt(new Date())
      console.log('📴 Network: Offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return {
    isOnline,
    lastChangeAt,
    checkNow
  }
}

