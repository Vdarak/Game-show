"use client"

import { useEffect } from "react"
import { motion } from "framer-motion"
import { useGameState } from "@/hooks/use-game-state"
import { AnimatedNumber } from "@/components/game/animated-number"
import { StrikeIndicator } from "@/components/game/strike-indicator"
import { formatScore } from "@/lib/game-utils"
import { getTheme, applyTheme } from "@/lib/themes"

export default function UnifiedTeamDisplay() {
  const { state } = useGameState()
  const teams = state.teams || []

  // Auto-fullscreen on load
  useEffect(() => {
    const enterFullscreen = () => {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch((err) => {
          console.log("[v0] Fullscreen request failed:", err)
        })
      }
    }

    const timer = setTimeout(enterFullscreen, 1000)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && document.fullscreenElement) {
        document.exitFullscreen()
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    return () => {
      clearTimeout(timer)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  return (
    <div className="fixed inset-0 grid grid-cols-2 grid-rows-2 bg-gray-950">
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
                className="mb-6"
              >
                <div
                  className="mb-2 h-2 w-32 rounded-full"
                  style={{ backgroundColor: theme.accentColor }}
                />
                <h2
                  className="text-5xl font-bold tracking-wide"
                  style={{ color: theme.textColor }}
                >
                  {team.name}
                </h2>
                <div
                  className="mt-2 h-2 w-32 rounded-full"
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
                {team.currentRoundScore > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 text-2xl font-semibold"
                    style={{ color: theme.accentColor }}
                  >
                    Round: +{formatScore(team.currentRoundScore)}
                  </motion.div>
                )}
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
