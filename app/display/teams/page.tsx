"use client"

import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useGameState } from "@/hooks/use-game-state"
import { AnimatedNumber } from "@/components/game/animated-number"
import { StrikeIndicator } from "@/components/game/strike-indicator"
import { formatScore } from "@/lib/game-utils"
import { getTheme, applyTheme } from "@/lib/themes"
import { Maximize2, Minimize2 } from "lucide-react"

interface ScoreChangeToast {
  id: string
  teamId: string
  amount: number
  color: string
}

export default function UnifiedTeamDisplay() {
  const { state } = useGameState()
  const teams = state.teams || []
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [scoreToasts, setScoreToasts] = useState<ScoreChangeToast[]>([])
  const previousScoresRef = useRef<Map<string, number>>(new Map())

  // Track score changes and show toasts
  useEffect(() => {
    teams.forEach((team) => {
      const previousScore = previousScoresRef.current.get(team.id)
      
      if (previousScore !== undefined && previousScore !== team.score) {
        const difference = team.score - previousScore
        const theme = getTheme(team.theme)
        
        // Create new toast
        const toastId = `${team.id}-${Date.now()}`
        const newToast: ScoreChangeToast = {
          id: toastId,
          teamId: team.id,
          amount: difference,
          color: theme.primaryColor,
        }
        
        setScoreToasts(prev => [...prev, newToast])
        
        // Remove toast after 2 seconds
        setTimeout(() => {
          setScoreToasts(prev => prev.filter(t => t.id !== toastId))
        }, 2000)
      }
      
      previousScoresRef.current.set(team.id, team.score)
    })
  }, [teams])

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && document.fullscreenElement) {
        document.exitFullscreen()
      }
      if (e.key.toLowerCase() === "f") {
        toggleFullscreen()
      }
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.log("Fullscreen request failed:", err)
      })
    } else {
      document.exitFullscreen()
    }
  }

  return (
    <div className="fixed inset-0 grid grid-cols-2 grid-rows-2 bg-gray-950">
      {/* Fullscreen Button */}
      <button
        onClick={toggleFullscreen}
        className="absolute top-4 right-4 z-50 p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors invisible"
        title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
      >
        {isFullscreen ? (
          <Minimize2 className="w-6 h-6" />
        ) : (
          <Maximize2 className="w-6 h-6" />
        )}
      </button>

      {teams.map((team, index) => {
        const theme = getTheme(team.theme)
        
        return (
          <div
            key={team.id}
            className="relative flex flex-col items-center justify-center overflow-hidden border border-gray-800 p-8"
            style={{
              background: theme.backgroundPattern
                ? `${theme.backgroundColor} ${theme.backgroundPattern}`
                : theme.backgroundColor,
              fontFamily: theme.fontFamily,
            }}
          >
            {/* Score Change Toast for this team */}
            <div className="absolute left-8 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2 pointer-events-none">
              <AnimatePresence>
                {scoreToasts
                  .filter(toast => toast.teamId === team.id)
                  .map((toast) => (
                    <motion.div
                      key={toast.id}
                      initial={{ opacity: 0, x: -100 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      className="px-4 py-2 rounded-full text-white font-bold text-sm shadow-lg whitespace-nowrap"
                      style={{ backgroundColor: toast.color }}
                    >
                      {toast.amount > 0 ? '+' : ''}{toast.amount}
                    </motion.div>
                  ))}
              </AnimatePresence>
            </div>

            {/* Background decorative elements */}
            <div className="pointer-events-none absolute inset-0 opacity-10">
              <motion.div
                className="absolute left-0 top-0 h-64 w-64 rounded-full blur-3xl"
                style={{ backgroundColor: theme.primaryColor }}
                animate={{
                  scale: [1, 1.2, 1],
                  x: [0, 30, 0],
                  y: [0, 20, 0],
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute bottom-0 right-0 h-64 w-64 rounded-full blur-3xl"
                style={{ backgroundColor: theme.secondaryColor }}
                animate={{
                  scale: [1, 1.3, 1],
                  x: [0, -30, 0],
                  y: [0, -20, 0],
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>

            {/* Team Content */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center">
              {/* Team Name */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 flex flex-col items-center"
              >
                <div
                  className="mb-2 h-2 w-full rounded-full"
                  style={{ backgroundColor: theme.accentColor }}
                />
                <h2
                  className="text-5xl font-bold tracking-wide whitespace-nowrap"
                  style={{ color: theme.textColor }}
                >
                  {team.name}
                </h2>
                <div
                  className="mt-2 h-2 w-full rounded-full"
                  style={{ backgroundColor: theme.accentColor }}
                />
              </motion.div>

              {/* Score */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mb-8"
              >
                <div className="mb-4 text-xl opacity-70" style={{ color: theme.textColor }}>
                  Score
                </div>
                <AnimatedNumber 
                  value={team.score} 
                  color={theme.primaryColor}
                  size="massive"
                  className="font-bold"
                />
              </motion.div>

              {/* Strikes - Always show */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="mb-4"
              >
                <div className="mb-2 text-sm opacity-70" style={{ color: theme.textColor }}>
                  Strikes
                </div>
                <div className="scale-75">
                  <StrikeIndicator count={team.strikes} animated size="large" />
                </div>
              </motion.div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
