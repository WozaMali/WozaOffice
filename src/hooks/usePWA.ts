'use client'

import { useState, useEffect } from 'react'

interface PWAState {
  isOnline: boolean
  isInstalled: boolean
  isStandalone: boolean
  canInstall: boolean
  updateAvailable: boolean
  registration: ServiceWorkerRegistration | null
}

export function usePWA() {
  const [pwaState, setPwaState] = useState<PWAState>({
    isOnline: navigator.onLine,
    isInstalled: false,
    isStandalone: false,
    canInstall: false,
    updateAvailable: false,
    registration: null,
  })

  useEffect(() => {
    // Check if app is installed (standalone mode)
    const checkStandalone = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches
      const isStandalone = standalone || (window.navigator as any).standalone
      
      setPwaState(prev => ({
        ...prev,
        isStandalone,
        isInstalled: isStandalone,
      }))
    }

    // Check online status
    const handleOnline = () => setPwaState(prev => ({ ...prev, isOnline: true }))
    const handleOffline = () => setPwaState(prev => ({ ...prev, isOnline: false }))

    // Register service worker
    const registerServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js')
          setPwaState(prev => ({ ...prev, registration }))

          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setPwaState(prev => ({ ...prev, updateAvailable: true }))
                }
              })
            }
          })

          console.log('Service Worker registered successfully')
        } catch (error) {
          console.error('Service Worker registration failed:', error)
        }
      }
    }

    // Check for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setPwaState(prev => ({ ...prev, canInstall: true }))
    }

    // Check for app installed
    const handleAppInstalled = () => {
      setPwaState(prev => ({ ...prev, isInstalled: true, canInstall: false }))
    }

    // Initial checks
    checkStandalone()
    registerServiceWorker()

    // Event listeners
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const installApp = async () => {
    if (!pwaState.canInstall) return false

    try {
      // This will be handled by the PWAInstallPrompt component
      return true
    } catch (error) {
      console.error('Install failed:', error)
      return false
    }
  }

  const updateApp = async () => {
    if (!pwaState.updateAvailable || !pwaState.registration) return false

    try {
      const newWorker = pwaState.registration.waiting
      if (newWorker) {
        newWorker.postMessage({ type: 'SKIP_WAITING' })
        window.location.reload()
        return true
      }
      return false
    } catch (error) {
      console.error('Update failed:', error)
      return false
    }
  }

  const sendNotification = async (title: string, options?: NotificationOptions) => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications')
      return false
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        console.log('Notification permission denied')
        return false
      }
    }

    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        ...options,
      })

      notification.onclick = () => {
        window.focus()
        notification.close()
      }

      return true
    }

    return false
  }

  return {
    ...pwaState,
    installApp,
    updateApp,
    sendNotification,
  }
}
