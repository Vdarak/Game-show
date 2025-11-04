"use client"

import { useState, useEffect } from "react"

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [connectionType, setConnectionType] = useState<string>("unknown")

  useEffect(() => {
    // Initial check
    setIsOnline(navigator.onLine)

    // Get connection type if available
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
    if (connection) {
      setConnectionType(connection.effectiveType || connection.type || "unknown")
    }

    const handleOnline = () => {
      setIsOnline(true)
      console.log("[Network] Online")
    }

    const handleOffline = () => {
      setIsOnline(false)
      console.log("[Network] Offline")
    }

    const handleConnectionChange = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
      if (connection) {
        setConnectionType(connection.effectiveType || connection.type || "unknown")
      }
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    if (connection) {
      connection.addEventListener("change", handleConnectionChange)
    }

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      if (connection) {
        connection.removeEventListener("change", handleConnectionChange)
      }
    }
  }, [])

  return { isOnline, connectionType }
}
