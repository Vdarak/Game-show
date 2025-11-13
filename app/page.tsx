"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { NetworkIndicator } from "@/components/pwa/network-indicator"
import { motion } from "framer-motion"
import { Play, Zap, Sparkles } from "lucide-react"

export default function Home() {
  const router = useRouter()

  const handleStartGame = () => {
    router.push("/controller")
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="absolute right-4 top-4">
        <NetworkIndicator />
      </div>

      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-16 text-center"
      >
        <h1 className="mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text font-display text-6xl font-bold text-transparent">
          Popular Consensus
        </h1>
        <p className="font-display text-xl text-gray-400">Game Show Controller</p>
      </motion.div>

      {/* Main Game Card */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-md"
      >
        <Card 
          onClick={handleStartGame}
          className="group relative cursor-pointer overflow-hidden border-2 border-blue-500/50 bg-gradient-to-br from-blue-900/30 to-purple-900/30 p-8 backdrop-blur transition-all hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/50"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="relative z-10 text-center">
            <Play className="mx-auto mb-4 h-12 w-12 text-blue-400 transition-transform group-hover:scale-110" />
            <h2 className="mb-2 font-display text-2xl font-bold text-white">Start Popular Consensus</h2>
            <p className="font-display text-sm text-gray-400">
              Open the controller to set up the screens, logos, videos and questions.
            </p>
          </div>
        </Card>
      </motion.div>

      {/* Coming Soon Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-12 w-full max-w-2xl sm:grid-cols-2"
      >

        {/* Ghost Card 2 */}
        <Card className="relative overflow-hidden border-2 border-gray-700/50 bg-gray-800/30 p-6 backdrop-blur opacity-60">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-orange-500/5" />
          <div className="relative z-10 text-center">
            <Sparkles className="mx-auto mb-3 h-10 w-10 text-gray-500" />
            <h3 className="mb-2 font-display text-lg font-semibold text-gray-300">Custom Games</h3>
            <p className="font-display text-xs text-gray-500">Coming Soon</p>
          </div>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-8 text-center text-sm text-gray-500"
      >
        <p className="font-display">Works offline • Multi-screen support • Real-time sync</p>
      </motion.div>
    </div>
  )
}
