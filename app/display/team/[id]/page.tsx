"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useGameState } from "@/hooks/use-game-state"
import { AnimatedNumber } from "@/components/game/animated-number"
import { formatScore } from "@/lib/game-utils"
import { useParams } from "next/navigation"
import { Maximize2 } from "lucide-react"

export default function TeamDisplayPage() {
  const params = useParams()
  const teamId = params.id as string
  const { state } = useGameState()
  const { strikes, currentQuestion } = state
  const [isFullscreen, setIsFullscreen] = useState(false)

  const team = state.teams.find((t) => t.id === teamId)

  // Keyboard handlers for fullscreen toggle (F to toggle, Escape to exit)
  useEffect(() => {
    const toggleFullscreen = () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      } else {
        document.documentElement.requestFullscreen().catch(() => {})
      }
    }

    // Keyboard handler
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }

      if (e.key === "f" || e.key === "F") {
        e.preventDefault()
        toggleFullscreen()
      }
    }

    // Listen for fullscreen changes
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("fullscreenchange", handleFullscreenChange)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  if (!team) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
        <div className="text-4xl">Team not found</div>
      </div>
    )
  }

  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden text-white"
      style={{
        background: `linear-gradient(to bottom, ${team.color}dd, ${team.color}88)`,
      }}
    >
      {/* Fullscreen toggle button - only visible in windowed mode */}
      <AnimatePresence>
        {!isFullscreen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={() => {
              document.documentElement.requestFullscreen().catch(() => {})
            }}
            aria-label="Enter Fullscreen"
            className="absolute right-4 top-4 z-50 flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/20"
          >
            <Maximize2 className="h-4 w-4" />
            <span className="hidden sm:inline">Fullscreen</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Background decorative patterns */}
      <div className="pointer-events-none absolute inset-0 opacity-10">
        <motion.div
          className="absolute left-0 top-0 h-96 w-96 rounded-full"
          style={{ backgroundColor: team.color }}
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 15, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 right-0 h-96 w-96 rounded-full"
          style={{ backgroundColor: team.color }}
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -50, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
      </div>

      {/* Floating particles */}
      <div className="pointer-events-none absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-2 w-2 rounded-full"
            style={{
              backgroundColor: team.color,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Number.POSITIVE_INFINITY,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Top Section - Team Name */}
      <div className="relative z-10 flex h-[20vh] items-center justify-center border-b-4 border-white/20 px-4 sm:h-[25vh] sm:px-8">
        <motion.div
          className="text-center"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100 }}
        >
          <div
            className="mb-2 h-1 w-full rounded-full sm:mb-4 sm:h-2"
            style={{
              backgroundColor: team.color,
              boxShadow: `0 0 20px ${team.color}`,
            }}
          />
          <h1
            className="text-4xl font-bold uppercase tracking-wider sm:text-6xl md:text-7xl lg:text-9xl"
            style={{ textShadow: "0 4px 20px #00000050" }}
          >
            {team.name}
          </h1>
        </motion.div>
      </div>

      {/* Middle Section - Main Score */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4">
        <motion.div
          className="rounded-2xl bg-white/10 px-8 py-6 backdrop-blur-sm sm:rounded-3xl sm:px-12 sm:py-8 md:px-16 md:py-12"
          style={{
            boxShadow: `0 0 60px ${team.color}40, inset 0 0 60px ${team.color}20`,
          }}
          animate={{
            boxShadow: [
              `0 0 60px ${team.color}40, inset 0 0 60px ${team.color}20`,
              `0 0 80px ${team.color}60, inset 0 0 80px ${team.color}30`,
              `0 0 60px ${team.color}40, inset 0 0 60px ${team.color}20`,
            ],
          }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
        >
          <div className="flex flex-col items-center">
            <div className="mb-2 text-xl font-bold uppercase tracking-wider text-white/80 sm:mb-4 sm:text-2xl md:text-3xl">
              SCORE
            </div>
            <AnimatedNumber value={team.score} color="#FFFFFF" size="massive" />
          </div>
        </motion.div>

        {/* Current Round Score */}
        <AnimatePresence>
          {team.currentRoundScore > 0 && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="mt-4 rounded-xl bg-green-500 px-4 py-2 sm:mt-8 sm:rounded-2xl sm:px-8 sm:py-4"
              style={{ boxShadow: "0 0 30px #10B98160" }}
            >
              <div className="text-2xl font-bold sm:text-3xl md:text-4xl">
                This Round: +{formatScore(team.currentRoundScore)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Section - Stats */}
      <div className="relative z-10 flex h-[20vh] flex-col items-center justify-center gap-2 border-t-4 border-white/20 px-4 sm:h-[25vh] sm:gap-4 sm:px-8">
        <div className="flex flex-wrap justify-center gap-4 text-base sm:gap-8 sm:text-xl md:gap-12 md:text-2xl">
          <div className="text-center">
            <div className="font-bold">Strikes</div>
            <div className="text-2xl sm:text-3xl md:text-4xl">{strikes}</div>
          </div>
          {currentQuestion && (
            <div className="text-center">
              <div className="font-bold">Current Question</div>
              <div className="text-sm opacity-70 sm:text-base md:text-xl">
                {currentQuestion.text.substring(0, 40)}...
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confetti effect on large score gains */}
      <AnimatePresence>
        {team.currentRoundScore >= 20 && (
          <div className="pointer-events-none absolute inset-0 z-20">
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute h-3 w-3"
                style={{
                  backgroundColor: ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1"][i % 4],
                  left: `${Math.random() * 100}%`,
                  top: "-10%",
                }}
                initial={{ y: 0, opacity: 1, rotate: 0 }}
                animate={{
                  y: window.innerHeight + 100,
                  opacity: 0,
                  rotate: 360,
                }}
                transition={{
                  duration: 2 + Math.random(),
                  delay: Math.random() * 0.5,
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
