"use client"

import { useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useGameState } from "@/hooks/use-game-state"
import { AnswerCard } from "@/components/game/answer-card"
import { StrikeIndicator } from "@/components/game/strike-indicator"
import { AnimatedNumber } from "@/components/game/animated-number"

export default function GameBoardPage() {
  const { state } = useGameState()

  // Auto-fullscreen on load
  useEffect(() => {
    const enterFullscreen = () => {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch((err) => {
          console.log("[v0] Fullscreen request failed:", err)
        })
      }
    }

    // Delay to allow user interaction
    const timer = setTimeout(enterFullscreen, 1000)

    // Exit fullscreen on Escape
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

  const { currentQuestion, teams, strikes } = state

  // Determine grid layout based on number of answers
  const getGridLayout = (answerCount: number) => {
    if (answerCount <= 4) return "grid-cols-2"
    if (answerCount === 5) return "grid-cols-2"
    return "grid-cols-2"
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-black text-white">
      {/* Background ambient animation */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-10">
        <motion.div
          className="absolute -left-1/4 -top-1/4 h-1/2 w-1/2 rounded-full bg-blue-500 blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -right-1/4 -bottom-1/4 h-1/2 w-1/2 rounded-full bg-purple-500 blur-3xl"
          animate={{
            x: [0, -100, 0],
            y: [0, -50, 0],
          }}
          transition={{ duration: 25, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
      </div>

      {/* Top Section - Question */}
      <div className="relative z-10 flex h-[15vh] items-center justify-center bg-gradient-to-b from-gray-900 to-transparent px-4 sm:h-[20vh] sm:px-8">
        <AnimatePresence mode="wait">
          {currentQuestion ? (
            <motion.h1
              key={currentQuestion.id}
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              transition={{ type: "spring", stiffness: 100 }}
              className="text-center text-2xl font-bold leading-tight sm:text-4xl md:text-5xl lg:text-6xl"
            >
              {currentQuestion.text}
            </motion.h1>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-xl text-gray-500 sm:text-2xl md:text-4xl"
            >
              Waiting for question...
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Middle Section - Answers Board */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-4 sm:px-8 sm:py-6 md:px-12 md:py-8">
        {currentQuestion ? (
          <div
            className={`grid w-full max-w-6xl gap-3 sm:gap-4 md:gap-6 ${getGridLayout(currentQuestion.answers.length)}`}
          >
            {currentQuestion.answers.map((answer, index) => (
              <motion.div
                key={answer.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1, type: "spring" }}
              >
                <AnswerCard rank={index + 1} text={answer.text} points={answer.points} revealed={answer.revealed} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center text-lg text-gray-600 sm:text-xl md:text-2xl">No question loaded</div>
        )}
      </div>

      {/* Bottom Section - Scores and Strikes */}
      <div className="relative z-10 flex h-auto min-h-[15vh] flex-col items-center justify-between gap-4 bg-gradient-to-t from-gray-900 to-transparent px-4 py-4 sm:h-[20vh] sm:flex-row sm:px-8 sm:py-0 md:px-12">
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-6">
          {teams.slice(0, 2).map((team) => (
            <motion.div
              key={team.id}
              className="flex items-center gap-2 rounded-lg px-4 py-2 sm:gap-4 sm:px-6 sm:py-3 md:px-8 md:py-4"
              style={{
                backgroundColor: team.color,
                boxShadow: `0 0 30px ${team.color}60`,
              }}
              animate={{
                boxShadow: [`0 0 30px ${team.color}60`, `0 0 50px ${team.color}80`, `0 0 30px ${team.color}60`],
              }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
            >
              <span className="text-sm font-bold sm:text-base md:text-xl">{team.name}:</span>
              <AnimatedNumber value={team.score} color="#FFFFFF" size="massive" />
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-2 sm:gap-4">
          <div className="text-base font-bold uppercase tracking-wider text-red-500 sm:text-xl md:text-2xl">
            Strikes
          </div>
          <StrikeIndicator count={strikes} animated size="large" />
        </div>

        <div className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-6">
          {teams.slice(2, 4).map((team) => (
            <motion.div
              key={team.id}
              className="flex items-center gap-2 rounded-lg px-4 py-2 sm:gap-4 sm:px-6 sm:py-3 md:px-8 md:py-4"
              style={{
                backgroundColor: team.color,
                boxShadow: `0 0 30px ${team.color}60`,
              }}
              animate={{
                boxShadow: [`0 0 30px ${team.color}60`, `0 0 50px ${team.color}80`, `0 0 30px ${team.color}60`],
              }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
            >
              <span className="text-sm font-bold sm:text-base md:text-xl">{team.name}:</span>
              <AnimatedNumber value={team.score} color="#FFFFFF" size="massive" />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Victory animation overlay */}
      <AnimatePresence>
        {currentQuestion && currentQuestion.answers.every((ans) => ans.revealed) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/50"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 100 }}
              className="text-8xl font-bold text-yellow-400"
              style={{ textShadow: "0 0 40px #FFD70080" }}
            >
              ALL REVEALED!
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
