'use client'

import { useConnectivity } from '@/hooks/useConnectivity'
import { Button } from '@/components/ui/button'
import { WifiOff, RefreshCw } from 'lucide-react'

interface OfflineBannerProps {
  onRetry?: () => void
  className?: string
}

/**
 * Offline Banner Component
 * Shows an indicator when the app is offline with a retry button
 */
export function OfflineBanner({ onRetry, className = '' }: OfflineBannerProps) {
  const { isOnline, checkNow } = useConnectivity()

  // Don't render if online
  if (isOnline) return null

  const handleRetry = () => {
    checkNow()
    if (onRetry) {
      onRetry()
    }
  }

  return (
    <div className={`bg-red-50 border-b border-red-200 px-4 py-3 ${className}`}>
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <WifiOff className="h-5 w-5 text-red-600" />
          <div>
            <p className="text-sm font-medium text-red-800">You're offline</p>
            <p className="text-xs text-red-600">Please check your internet connection</p>
          </div>
        </div>
        <Button
          onClick={handleRetry}
          variant="outline"
          size="sm"
          className="border-red-300 text-red-700 hover:bg-red-100"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    </div>
  )
}

