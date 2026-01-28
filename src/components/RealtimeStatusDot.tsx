"use client"
import React from 'react'
import { useRealtimeStatus } from '@/hooks/useRealtimeStatus'

export default function RealtimeStatusDot({ className }: { className?: string }) {
  const { status } = useRealtimeStatus()

  const color = status === 'connected' ? 'bg-green-500' : status === 'reconnecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
  const tooltip = status === 'connected' ? 'Live: Connected' : status === 'reconnecting' ? 'Live: Reconnecting' : status === 'offline' ? 'Live: Offline' : 'Live: Disconnected'

  return (
    <div className={`flex items-center gap-2 ${className || ''}`} title={tooltip} aria-label={tooltip}>
      <span className={`inline-block w-3 h-3 rounded-full ${color}`} />
      <span className="text-sm font-medium text-gray-600 select-none">Live</span>
    </div>
  )
}


