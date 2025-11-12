"use client"

import { useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useGameState } from "@/hooks/use-game-state"
import { WrongAnswerAnimation } from "@/components/game/wrong-answer-animation"

export default function GameBoardPage() {
  const { state, clearWrongAnswerTrigger } = useGameState()

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

    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  // Clear wrong answer trigger after animation completes
  useEffect(() => {
    if (state.wrongAnswerTriggered) {
      const timer = setTimeout(() => {
        clearWrongAnswerTrigger()
      }, 2300)
      return () => clearTimeout(timer)
    }
  }, [state.wrongAnswerTriggered, clearWrongAnswerTrigger])

  const { currentQuestion } = state

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-4 text-white sm:p-8 overflow-hidden">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src="/videos/background.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black/40 z-[1]" />

      {/* Header - GATE Logo, Popular Consensus Title, Sponsor Logo */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 py-3 sm:px-8 sm:py-4">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between gap-4 rounded-2xl border-4 border-orange-500 bg-gradient-to-r from-teal-600 via-emerald-500 to-teal-600 px-4 py-2 shadow-2xl sm:px-6 sm:py-3">
            {/* Left - GATE Logo */}
            <div className="flex-shrink-0">
              <div className="h-12 w-24 sm:h-16 sm:w-32">
                <img
                  src="/gate-logo.png"
                  alt="GATE"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>

            {/* Center - Popular Consensus Title */}
            <div className="flex-1 text-center">
              <h1
                className="font-display text-2xl font-black uppercase tracking-wider text-orange-500 sm:text-4xl md:text-5xl"
                style={{
                  textShadow: '3px 3px 0px #000, -1px -1px 0px #000, 1px -1px 0px #000, -1px 1px 0px #000, 4px 4px 8px rgba(0,0,0,0.5)',
                  WebkitTextStroke: '2px #000',
                  paintOrder: 'stroke fill',
                }}
              >
                Popular Consensus
              </h1>
            </div>

            {/* Right - Sponsor Logo */}
            <div className="flex-shrink-0">
              {state.sponsorLogo ? (
                <div className="h-12 w-24 rounded-lg bg-white/90 p-1 sm:h-16 sm:w-32">
                  <img
                    src={state.sponsorLogo}
                    alt="Sponsor"
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : (
                <div className="h-12 w-24 rounded-lg border-2 border-dashed border-white/30 bg-white/10 sm:h-16 sm:w-32" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Decorative border effect */}
      <div className="absolute inset-0 pointer-events-none z-[2]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-1 bg-gradient-to-r from-transparent via-teal-400 to-transparent blur-md opacity-40" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-1 bg-gradient-to-r from-transparent via-teal-400 to-transparent blur-md opacity-40" />
      </div>

      {/* Top Section - Question */}
      <div className="relative z-10 mb-8 mt-24 w-full max-w-5xl sm:mt-28">
        <div className="rounded-lg border-4 border-teal-500 bg-gradient-to-r from-indigo-950 to-purple-950 p-6 shadow-2xl">
          <AnimatePresence mode="wait">
            {currentQuestion ? (
              <motion.h1
                key={currentQuestion.id}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ type: "spring", stiffness: 100 }}
                className="text-center font-display text-2xl font-bold uppercase leading-tight text-white sm:text-4xl md:text-5xl"
              >
                {currentQuestion.text}
              </motion.h1>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-lg text-gray-300 sm:text-xl"
              >
                Waiting for question...
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Answers Board - Family Feud Style - Conditional Layout */}
      <div className="relative z-10 w-full max-w-5xl">
        {currentQuestion ? (
          currentQuestion.answers.length < 6 ? (
            /* Single Column for < 6 answers */
            <div className="flex flex-col gap-2 sm:gap-3">
              {currentQuestion.answers.map((answer, index) => (
                <motion.div
                  key={answer.id}
                  initial={{ opacity: 0.3, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05, type: "spring", stiffness: 200 }}
                >
                  <div className="relative overflow-hidden rounded-lg border-4 border-teal-500 bg-gradient-to-r from-cyan-700 to-teal-700 p-4 shadow-lg">
                    {/* Rank number on left */}
                    <div className="absolute left-0 top-0 bottom-0 flex items-center justify-center w-16 bg-cyan-900/50 border-r-4 border-teal-500 font-display text-3xl font-bold text-teal-200 sm:w-20 sm:text-4xl">
                      {index + 1}
                    </div>

                    {/* Answer content - centered */}
                    <div className="ml-16 flex items-center justify-center gap-4 sm:ml-20">
                      <div className="flex-1 text-center h-8 sm:h-10 flex items-center justify-center">
                        <AnimatePresence mode="wait">
                          {answer.revealed ? (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ type: "spring", stiffness: 150, damping: 20 }}
                              className="font-display text-xl font-bold text-white uppercase tracking-wide sm:text-3xl line-clamp-2"
                            >
                              {answer.text}
                            </motion.div>
                          ) : (
                            <div className="w-full h-8 sm:h-10 bg-gradient-to-r from-cyan-600 to-teal-600 rounded animate-pulse" />
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Points on right */}
                      {state.showSurveyTotals && (
                        <div className="flex-shrink-0">
                          <AnimatePresence mode="wait">
                            {answer.revealed ? (
                              <motion.div
                                initial={{ x: 100, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 150, damping: 20 }}
                                className="font-display text-2xl font-bold text-teal-200 sm:text-3xl"
                              >
                                {answer.points}
                              </motion.div>
                            ) : (
                              <div className="w-16 h-8 bg-gradient-to-r from-cyan-600 to-teal-600 rounded animate-pulse sm:w-20" />
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            /* Two Columns for 6+ answers */
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {/* Column 1: Answers 1-5 */}
              <div className="flex flex-col gap-2 sm:gap-3">
                {currentQuestion.answers.slice(0, 5).map((answer, index) => (
                  <motion.div
                    key={answer.id}
                    initial={{ opacity: 0.3, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05, type: "spring", stiffness: 200 }}
                  >
                    <div className="relative overflow-hidden rounded-lg border-4 border-teal-500 bg-gradient-to-r from-cyan-700 to-teal-700 p-4 shadow-lg">
                      {/* Rank number on left */}
                      <div className="absolute left-0 top-0 bottom-0 flex items-center justify-center w-16 bg-cyan-900/50 border-r-4 border-teal-500 font-display text-3xl font-bold text-teal-200 sm:w-20 sm:text-4xl">
                        {index + 1}
                      </div>

                      {/* Answer content - hidden until revealed */}
                      <div className="ml-16 flex items-center justify-between gap-4 sm:ml-20">
                        <div className="flex-1 min-w-0">
                          <AnimatePresence mode="wait">
                            {answer.revealed ? (
                              <motion.div
                                initial={{ x: -100, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 150, damping: 20 }}
                                className="font-display text-xl font-bold text-white uppercase tracking-wide sm:text-3xl truncate"
                              >
                                {answer.text}
                              </motion.div>
                            ) : (
                              <div className="h-8 sm:h-10 bg-gradient-to-r from-cyan-600 to-teal-600 rounded animate-pulse" />
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Points on right */}
                        {state.showSurveyTotals && (
                          <div className="flex-shrink-0">
                            <AnimatePresence mode="wait">
                              {answer.revealed ? (
                                <motion.div
                                  initial={{ x: 100, opacity: 0 }}
                                  animate={{ x: 0, opacity: 1 }}
                                  transition={{ type: "spring", stiffness: 150, damping: 20 }}
                                  className="font-display text-2xl font-bold text-teal-200 sm:text-3xl"
                                >
                                  {answer.points}
                                </motion.div>
                              ) : (
                                <div className="w-16 h-8 bg-gradient-to-r from-cyan-600 to-teal-600 rounded animate-pulse sm:w-20" />
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {/* Column 2: Answers 6-10 */}
              <div className="flex flex-col gap-2 sm:gap-3">
                {currentQuestion.answers.slice(5, 10).map((answer, index) => (
                  <motion.div
                    key={answer.id}
                    initial={{ opacity: 0.3, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (index + 5) * 0.05, type: "spring", stiffness: 200 }}
                  >
                    <div className="relative overflow-hidden rounded-lg border-4 border-teal-500 bg-gradient-to-r from-cyan-700 to-teal-700 p-4 shadow-lg">
                      {/* Rank number on left */}
                      <div className="absolute left-0 top-0 bottom-0 flex items-center justify-center w-16 bg-cyan-900/50 border-r-4 border-teal-500 font-display text-3xl font-bold text-teal-200 sm:w-20 sm:text-4xl">
                        {index + 6}
                      </div>

                      {/* Answer content - hidden until revealed */}
                      <div className="ml-16 flex items-center justify-between gap-4 sm:ml-20">
                        <div className="flex-1 min-w-0 h-8 sm:h-10 flex items-center">
                          <AnimatePresence mode="wait">
                            {answer.revealed ? (
                              <motion.div
                                initial={{ x: -100, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 150, damping: 20 }}
                                className="font-display text-xl font-bold text-white uppercase tracking-wide sm:text-3xl truncate line-clamp-1"
                              >
                                {answer.text}
                              </motion.div>
                            ) : (
                              <div className="w-full h-8 sm:h-10 bg-gradient-to-r from-cyan-600 to-teal-600 rounded animate-pulse" />
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Points on right */}
                        {state.showSurveyTotals && (
                          <div className="flex-shrink-0">
                            <AnimatePresence mode="wait">
                              {answer.revealed ? (
                                <motion.div
                                  initial={{ x: 100, opacity: 0 }}
                                  animate={{ x: 0, opacity: 1 }}
                                  transition={{ type: "spring", stiffness: 150, damping: 20 }}
                                  className="font-display text-2xl font-bold text-teal-200 sm:text-3xl"
                                >
                                  {answer.points}
                                </motion.div>
                              ) : (
                                <div className="w-16 h-8 bg-gradient-to-r from-cyan-600 to-teal-600 rounded animate-pulse sm:w-20" />
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )
        ) : (
          <div className="text-center text-lg text-gray-400 sm:text-xl">No question loaded</div>
        )}
      </div>

      {/* Footer Text */}
      {state.footerText && (
        <div className="absolute bottom-4 left-0 right-0 z-20 px-4">
          <div className="text-center text-sm text-white/80 sm:text-base">
            {state.footerText}
          </div>
        </div>
      )}

      {/* Wrong Answer Animation */}
      <WrongAnswerAnimation trigger={state.wrongAnswerTriggered} />
    </div>
  )
}
