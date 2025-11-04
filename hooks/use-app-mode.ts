"use client"

import { useState, useEffect } from "react"

type AppMode = "standalone" | "browser" | "web-app"

/**
 * Detects if the app is running in:
 * - "standalone": PWA installed as a native app (launched from home screen/app drawer)
 * - "web-app": Running in minimal-ui or fullscreen mode (before install)
 * - "browser": Regular browser tab
 */
export function useAppMode(): AppMode {
  const [mode, setMode] = useState<AppMode>("browser")

  useEffect(() => {
    // Method 1: Check if running as standalone PWA via display-mode media query
    if (window.matchMedia("(display-mode: standalone)").matches) {
      console.log("[AppMode] Detected: standalone PWA (via media query)")
      setMode("standalone")
      return
    }

    // Method 2: Check navigator.standalone (older Safari PWA detection)
    if ((navigator as any).standalone === true) {
      console.log("[AppMode] Detected: standalone PWA (via navigator.standalone)")
      setMode("standalone")
      return
    }

    // Method 3: Check display-mode from manifest (fullscreen or minimal-ui)
    if (window.matchMedia("(display-mode: fullscreen)").matches) {
      console.log("[AppMode] Detected: web-app (fullscreen mode)")
      setMode("web-app")
      return
    }

    if (window.matchMedia("(display-mode: minimal-ui)").matches) {
      console.log("[AppMode] Detected: web-app (minimal-ui mode)")
      setMode("web-app")
      return
    }

    // Method 4: Check if window.top === window.self (not in iframe, can indicate web-app context)
    // Method 5: Check if service worker is active (indicates PWA context)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        if (registrations.length > 0 && registrations[0].active) {
          console.log("[AppMode] Service Worker active, likely PWA context")
          // If we got here without matching standalone/fullscreen, probably web-app
          setMode("web-app")
        }
      })
    }

    // Default to browser
    console.log("[AppMode] Detected: browser (regular tab)")
    setMode("browser")

    // Listen for changes (e.g., user installs/uninstalls PWA)
    const standaloneQuery = window.matchMedia("(display-mode: standalone)")
    const fullscreenQuery = window.matchMedia("(display-mode: fullscreen)")
    const minimalUiQuery = window.matchMedia("(display-mode: minimal-ui)")

    const handleChange = () => {
      if (standaloneQuery.matches) {
        setMode("standalone")
      } else if (fullscreenQuery.matches || minimalUiQuery.matches) {
        setMode("web-app")
      } else {
        setMode("browser")
      }
    }

    standaloneQuery.addEventListener("change", handleChange)
    fullscreenQuery.addEventListener("change", handleChange)
    minimalUiQuery.addEventListener("change", handleChange)

    return () => {
      standaloneQuery.removeEventListener("change", handleChange)
      fullscreenQuery.removeEventListener("change", handleChange)
      minimalUiQuery.removeEventListener("change", handleChange)
    }
  }, [])

  return mode
}

/**
 * Helper to check if running as installed PWA
 */
export function isStandalonePWA(): boolean {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  )
}

/**
 * Helper to check if in web-app mode (fullscreen/minimal-ui)
 */
export function isWebApp(): boolean {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches
  )
}
