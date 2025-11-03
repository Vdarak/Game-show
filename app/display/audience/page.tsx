"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useGameState } from "@/hooks/use-game-state"
import { StrikeIndicator } from "@/components/game/strike-indicator"
import { AnimatedNumber } from "@/components/game/animated-number"
import { formatScore } from "@/lib/game-utils"

type ViewMode = "comparison" | "question" | "stats"

export default function AudiencePage() {
  const { state } = useGameState()
  const { teams, strikes, currentQuestion, currentQuestionIndex, questions } = state
  const [viewMode, setViewMode] = useState<ViewMode>("comparison")

  useEffect(() => {
    const timer = setTimeout(() => {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {})
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setViewMode((prev) => {
        if (prev === "comparison") return "question"
        if (prev === "question") return "stats"
        return "comparison"
      })
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (strikes > 0) {
      setViewMode("comparison")
    }
  }, [strikes])

  const totalScore = teams.reduce((sum, team) => sum + team.score, 0)

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-br from-purple-900 via-blue-900 to-purple-900 text-white">
      {/* Animated background */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute left-0 top-0 h-full w-1/2 bg-gradient-to-r from-purple-600/20 to-transparent"
          animate={{ x: [-100, 100, -100] }}
          transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        />
        <motion.div
          className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-blue-600/20 to-transparent"
          animate={{ x: [100, -100, 100] }}
          transition={{ duration: 25, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        />
      </div>

      <AnimatePresence mode="wait">
        {viewMode === "comparison" && (
          <motion.div
            key="comparison"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative z-10 flex flex-1 flex-col"
          >
            <div className="grid h-[60vh] grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:gap-4 sm:p-6 md:h-[70vh] md:p-8">
              {teams.map((team) => (
                <motion.div
                  key={team.id}
                  className="flex flex-col items-center justify-center rounded-xl p-4 sm:rounded-2xl sm:p-6 md:p-8"
                  style={{ backgroundColor: `${team.color}dd` }}
                  animate={{
                    boxShadow: [
                      `inset 0 0 60px ${team.color}40`,
                      `inset 0 0 100px ${team.color}60`,
                      `inset 0 0 60px ${team.color}40`,
                    ],
                  }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                >
                  <h2 className="mb-2 text-2xl font-bold uppercase sm:mb-4 sm:text-3xl md:text-4xl">{team.name}</h2>
                  <AnimatedNumber value={team.score} color="#FFFFFF" size="large" />
                  {team.currentRoundScore > 0 && (
                    <div className="mt-1 text-base text-green-400 sm:mt-2 sm:text-xl md:text-2xl">
                      +{formatScore(team.currentRoundScore)}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-4 sm:gap-6 md:gap-8">
              <h3 className="text-2xl font-bold uppercase tracking-wider sm:text-3xl md:text-4xl lg:text-5xl">
                Current Strikes
              </h3>
              <StrikeIndicator count={strikes} animated size="large" />
              {strikes === 3 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-3xl font-bold text-red-500 sm:text-4xl md:text-5xl lg:text-6xl"
                  style={{ textShadow: "0 0 30px #EF444480" }}
                >
                  THREE STRIKES!
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {viewMode === "question" && (
          <motion.div
            key="question"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="relative z-10 flex flex-1 flex-col items-center justify-center p-4 sm:p-8 md:p-12"
          >
            <div className="mb-4 text-2xl font-bold uppercase tracking-wider text-yellow-400 sm:mb-6 sm:text-3xl md:mb-8 md:text-4xl">
              Current Question
            </div>
            {currentQuestion ? (
              <>
                <div className="mb-6 max-w-4xl text-center text-2xl font-bold leading-tight sm:mb-8 sm:text-4xl md:mb-12 md:text-5xl lg:text-6xl">
                  {currentQuestion.text}
                </div>
                <div className="grid w-full max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:gap-6">
                  {currentQuestion.answers.map((answer, index) => (
                    <motion.div
                      key={answer.id}
                      initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                      animate={{ opacity: answer.revealed ? 1 : 0.3, x: 0 }}
                      className="rounded-lg bg-white/10 px-4 py-2 backdrop-blur-sm sm:px-6 sm:py-3 md:px-8 md:py-4"
                    >
                      <div className="flex items-center justify-between gap-2 sm:gap-4">
                        <span className="text-xl font-bold sm:text-2xl md:text-3xl">{index + 1}.</span>
                        <span className="flex-1 text-base sm:text-xl md:text-2xl">
                          {answer.revealed ? answer.text : "?????"}
                        </span>
                        <span className="text-xl font-bold text-yellow-400 sm:text-2xl">
                          {answer.revealed ? answer.points : "?"}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-2xl text-gray-400 sm:text-3xl md:text-4xl">Waiting for question...</div>
            )}
          </motion.div>
        )}

        {viewMode === "stats" && (
          <motion.div
            key="stats"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 p-4 sm:gap-8 sm:p-8 md:gap-12 md:p-12"
          >
            <div className="text-2xl font-bold uppercase tracking-wider text-yellow-400 sm:text-3xl md:text-4xl lg:text-5xl">
              Game Statistics
            </div>
            <div className="grid w-full max-w-5xl grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6 md:gap-12">
              <div className="rounded-xl bg-white/10 p-4 text-center backdrop-blur-sm sm:rounded-2xl sm:p-6 md:p-8">
                <div className="mb-1 text-xl font-bold sm:mb-2 sm:text-2xl md:text-3xl">Round</div>
                <div className="text-4xl font-bold text-yellow-400 sm:text-5xl md:text-6xl lg:text-7xl">
                  {currentQuestionIndex + 1} / {questions.length}
                </div>
              </div>
              <div className="rounded-xl bg-white/10 p-4 text-center backdrop-blur-sm sm:rounded-2xl sm:p-6 md:p-8">
                <div className="mb-1 text-xl font-bold sm:mb-2 sm:text-2xl md:text-3xl">Total Points</div>
                <AnimatedNumber value={totalScore} color="#10B981" size="large" />
              </div>
              <div className="rounded-xl bg-white/10 p-4 text-center backdrop-blur-sm sm:rounded-2xl sm:p-6 md:p-8">
                <div className="mb-1 text-xl font-bold sm:mb-2 sm:text-2xl md:text-3xl">Questions Left</div>
                <div className="text-4xl font-bold text-blue-400 sm:text-5xl md:text-6xl lg:text-7xl">
                  {questions.length - currentQuestionIndex - 1}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
