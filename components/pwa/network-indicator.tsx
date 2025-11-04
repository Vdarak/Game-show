"use client"

import { useNetworkStatus } from "@/hooks/use-network-status"
import { Wifi, WifiOff } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export function NetworkIndicator() {
  const { isOnline } = useNetworkStatus()

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2"
      >
        {isOnline ? (
          <div className="flex items-center gap-2 rounded-full bg-green-500/20 px-3 py-1 text-xs font-medium text-green-400">
            <Wifi className="h-3 w-3" />
            <span className="hidden sm:inline">Online</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-400">
            <WifiOff className="h-3 w-3" />
            <span className="hidden sm:inline">Local</span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
