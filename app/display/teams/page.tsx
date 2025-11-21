"use client"

import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useGameState } from "@/hooks/use-game-state"
import { AnimatedNumber } from "@/components/game/animated-number"
import { StrikeIndicator } from "@/components/game/strike-indicator"
import { DitherBackground } from "@/components/game/dither-background"
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
            key={`${team.id}-${team.theme}`}
            className="relative flex flex-col items-center justify-center overflow-hidden border border-gray-800 p-8"
            style={{
              background: theme.backgroundPattern
                ? `${theme.backgroundColor} ${theme.backgroundPattern}`
                : theme.backgroundColor,
              fontFamily: theme.fontFamily,
            }}
          >
            {/* Dither Background - positioned behind everything */}
            <div className="absolute inset-0 z-0 pointer-events-none">
              <DitherBackground
                colorBack="#00000000"
                colorFront="#dd7c0dff"
                speed={0.1}
                shape="wave"
                type="4x4"
                pxSize={1}
                scale={1.13}
              />
            </div>

            {/* Video Background */}
            {theme.backgroundVideo && (
              <video
                key={`video-${team.id}-${team.theme}`}
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover z-0"
              >
                <source src={theme.backgroundVideo} type="video/mp4" />
              </video>
            )}

            {/* Overlay for video backgrounds to ensure content is readable */}
            {theme.backgroundVideo && (
              <div 
                className={`absolute inset-0 z-[1] ${
                  team.theme === 'valentine' ? 'bg-black/10' : 'bg-black/20'
                }`} 
              />
            )}

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
                key={`deco-1-${team.id}-${team.theme}`}
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
                key={`deco-2-${team.id}-${team.theme}`}
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

            {/* YOU'RE OUT Overlay for 3 strikes */}
            <AnimatePresence>
              {team.strikes === 3 && (
                <>
                  {/* Dark overlay - fades out */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 1, 0] }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 3,
                      times: [0, 0.2, 0.6, 1],
                      ease: "easeInOut",
                    }}
                    className="absolute inset-0 z-40 bg-black/70 backdrop-blur-md pointer-events-none"
                  />
                  
                  {/* YOU'RE OUT text - positioned below score */}
                  <motion.div
                    initial={{ 
                      scale: 0.5, 
                      rotate: -15, 
                      opacity: 0,
                      y: -80,
                    }}
                    animate={{
                      scale: [0.5, 1.15, 0.75, 0.5],
                      rotate: [-15, 5, 0, 0],
                      opacity: [0, 1, 1, 1],
                      y: [-80, -80, 0, 0],
                    }}
                    transition={{
                      duration: 3,
                      times: [0, 0.2, 0.6, 1],
                      ease: "easeOut",
                    }}
                    className="absolute z-50 left-1/2 top-2/3 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  >
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)] whitespace-nowrap">
                      YOU'RE OUT!
                    </h1>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

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
                  className="text-6xl sm:text-7xl font-bold tracking-wide whitespace-nowrap"
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
                  theme={team.theme}
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
