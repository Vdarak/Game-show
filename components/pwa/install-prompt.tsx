"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

interface InstallPWAProps {
  showOnlyOnController?: boolean
}

export function InstallPWA({ showOnlyOnController = false }: InstallPWAProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [isController, setIsController] = useState(false)

  useEffect(() => {
    // Detect if we're on controller page
    if (typeof window !== "undefined") {
      setIsController(window.location.pathname === "/controller")
    }

    // Check if PWA is supported
    if ('serviceWorker' in navigator) {
      setIsSupported(true)
    }

    const handler = (e: Event) => {
      e.preventDefault()
      console.log("[InstallPWA] Install prompt event captured")
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener("beforeinstallprompt", handler)

    // Check if already installed (running as standalone app)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      console.log("[InstallPWA] App is already installed")
      setIsInstalled(true)
    }

    // Check if running as installed PWA on iOS
    if ((window.navigator as any).standalone === true) {
      console.log("[InstallPWA] App is installed on iOS")
      setIsInstalled(true)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
    }
  }, [])

  const handleInstall = async (e: React.MouseEvent) => {
    e.preventDefault()
    console.log("[InstallPWA] Install button clicked")
    
    if (!deferredPrompt) {
      console.log("[InstallPWA] No install prompt available, showing instructions")
      // If prompt not available, show browser-specific instructions
      const userAgent = navigator.userAgent.toLowerCase()
      let instructions = "To install this app:\n\n"
      
      if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
        instructions += "Chrome:\n1. Click the install icon (⊕) in the address bar\n2. Or click the menu (⋮) → 'Install Family Feud Game Show'"
      } else if (userAgent.includes('edg')) {
        instructions += "Edge:\n1. Click the app icon (⊕) in the address bar\n2. Or click the menu (···) → 'Apps' → 'Install Family Feud Game Show'"
      } else if (userAgent.includes('safari')) {
        instructions += "Safari:\n1. Tap the Share button\n2. Scroll down and tap 'Add to Home Screen'\n3. Tap 'Add' to confirm"
      } else if (userAgent.includes('firefox')) {
        instructions += "Firefox:\n1. Click the menu (☰)\n2. Look for 'Install' option\n3. Or check the address bar for install icon"
      } else {
        instructions += "1. Look for an install icon in your browser's address bar\n2. Or check your browser's menu for 'Install App' option"
      }
      
      alert(instructions)
      return
    }

    try {
      console.log("[InstallPWA] Triggering install prompt (Chrome/Edge)")
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      console.log(`[InstallPWA] User response: ${outcome}`)

      if (outcome === "accepted") {
        console.log("[InstallPWA] PWA installation accepted")
        setIsInstalled(true)
        setDeferredPrompt(null)
      } else {
        console.log("[InstallPWA] PWA installation dismissed")
      }
    } catch (error) {
      console.error("[InstallPWA] Error during installation:", error)
    }
  }

  // Don't show if already installed
  if (isInstalled) {
    console.log("[InstallPWA] Not showing button - app is installed")
    return null
  }

  // Don't show if not supported
  if (!isSupported) {
    console.log("[InstallPWA] Not showing button - PWA not supported")
    return null
  }

  // If showOnlyOnController is true, only show on controller page
  if (showOnlyOnController && !isController) {
    return null
  }

  return (
    <Button
      onClick={handleInstall}
      variant="outline"
      size="sm"
      className="gap-2 text-xs hover:bg-blue-500/10 hover:text-blue-400"
      title={deferredPrompt ? "Click to install as desktop/mobile app" : "Click for installation instructions"}
    >
      <Download className="h-3 w-3" />
      <span className="hidden sm:inline">Install</span>
    </Button>
  )
}
