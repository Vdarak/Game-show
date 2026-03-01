"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { NetworkIndicator } from "@/components/pwa/network-indicator"
import { motion } from "framer-motion"
import { Play, Zap, Sparkles, Trophy } from "lucide-react"

export default function Home() {
  const router = useRouter()

  const handleStartGame = () => {
    router.push("/controller")
  }

  const handleStartTrivia = () => {
    router.push("/trivia")
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
        className="mb-12 text-center"
      >
        <h1 className="mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text font-display text-6xl font-bold text-transparent">
          YOUR GAMES
        </h1>
      </motion.div>

      {/* Game Selection Cards */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {/* Popular Consensus Card */}
        <Card 
          onClick={handleStartGame}
          className="group relative cursor-pointer overflow-hidden border-2 border-blue-500/50 bg-gradient-to-br from-blue-900/30 to-purple-900/30 p-8 backdrop-blur transition-all hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/50"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="relative z-10 text-center">
            <Play className="mx-auto mb-4 h-12 w-12 text-blue-400 transition-transform group-hover:scale-110" />
            <h2 className="mb-2 font-display text-2xl font-bold text-white">Popular Consensus</h2>
            <p className="font-display text-sm text-gray-400">
              Survey-style game with answer reveals, teams, and lightning rounds.
            </p>
          </div>
        </Card>

        {/* Trivi-Time Card */}
        <Card 
          onClick={handleStartTrivia}
          className="group relative cursor-pointer overflow-hidden border-2 border-purple-500/50 bg-gradient-to-br from-purple-900/30 to-pink-900/30 p-8 backdrop-blur transition-all hover:border-purple-400 hover:shadow-lg hover:shadow-purple-500/50"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="relative z-10 text-center">
            <Trophy className="mx-auto mb-4 h-12 w-12 text-purple-400 transition-transform group-hover:scale-110" />
            <h2 className="mb-2 font-display text-2xl font-bold text-white">Trivi-Time</h2>
            <p className="font-display text-sm text-gray-400">
              Live multiplayer trivia with phone-based answer submission and leaderboards.
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
