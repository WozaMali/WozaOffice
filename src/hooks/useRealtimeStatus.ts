import { useEffect, useState } from 'react'

export type RealtimeStatus = 'connected' | 'disconnected' | 'reconnecting' | 'offline' | 'unknown'

export function useRealtimeStatus(): { status: RealtimeStatus; attempt?: number } {
  const [status, setStatus] = useState<RealtimeStatus>('unknown')
  const [attempt, setAttempt] = useState<number | undefined>(undefined)

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail || {}
      setStatus(detail.type as RealtimeStatus)
      setAttempt(detail.attempt)
    }
    window.addEventListener('realtime-status', handler as any)
    return () => window.removeEventListener('realtime-status', handler as any)
  }, [])

  return { status, attempt }
}


