"use client"

import { useEffect } from "react"

export function PWARegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[PWA] Service Worker registered with scope:", registration.scope)
          
          // Check for updates every 60 seconds
          setInterval(() => {
            registration.update()
          }, 60000)

          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            console.log('[PWA] New Service Worker found, installing...')
            
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[PWA] New Service Worker installed, page will reload on next navigation')
                  // Optionally show a toast/notification to user
                  // or automatically reload: window.location.reload()
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error("[PWA] Service Worker registration failed:", error)
        })

      // Handle controller change (when new SW takes over)
      let refreshing = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          console.log('[PWA] Controller changed, reloading page...')
          refreshing = true
          window.location.reload()
        }
      })
    }
  }, [])

  return null
}
