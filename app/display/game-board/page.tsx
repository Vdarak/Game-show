"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useGameState } from "@/hooks/use-game-state"
import { getVideoFromIndexedDB } from "@/lib/video-storage"
import { WrongAnswerAnimation } from "@/components/game/wrong-answer-animation"
import { WelcomeScreen } from "@/components/game/welcome-screen"
import { RulesScreen } from "@/components/game/rules-screen"
import { SponsorVideoScreen } from "@/components/game/sponsor-video-screen"
import { LightningRoundScreen } from "@/components/game/lightning-round-screen"
import { LightningRoundRulesScreen } from "@/components/game/lightning-round-rules-screen"
import { EndingScreen } from "@/components/game/ending-screen"

export default function GameBoardPage() {
  const { state, clearWrongAnswerTrigger, videoEnded } = useGameState()
  const [animatingBoxIndex, setAnimatingBoxIndex] = useState<number>(-1)
  const [sponsorVideoData, setSponsorVideoData] = useState<string | null>(null)
  
  // Get current survey footer text
  const currentFooterText = state.surveyFooterTexts[state.currentQuestionIndex] || ""

  // Load sponsor video from IndexedDB when available
  useEffect(() => {
    if (state.hasSponsorVideo) {
      getVideoFromIndexedDB().then(video => {
        setSponsorVideoData(video)
      })
    } else {
      setSponsorVideoData(null)
    }
  }, [state.hasSponsorVideo])

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

  // Trigger sequential answer box animations when entering preview state
  useEffect(() => {
    if (
      state.orchestration.microState === "preview" && 
      state.orchestration.macroState === "questions" &&
      state.currentQuestion
    ) {
      // Reset animation
      setAnimatingBoxIndex(-1)
      
      // Get total number of answers
      const totalAnswers = state.currentQuestion.answers.length
      
      // Start sequential animation after a small delay
      const startTimer = setTimeout(() => {
        let currentIndex = 0
        
        const animateNextBox = () => {
          if (currentIndex < totalAnswers) {
            setAnimatingBoxIndex(currentIndex)
            currentIndex++
            setTimeout(animateNextBox, 250) // 250ms between each box
          }
        }
        
        animateNextBox()
      }, 300)
      
      return () => clearTimeout(startTimer)
    } else if (
      state.orchestration.microState === "reveal-question" || 
      state.orchestration.microState === "playing"
    ) {
      // Show all boxes immediately when revealing question
      setAnimatingBoxIndex(9999) // Large number to show all
    }
  }, [
    state.orchestration.microState, 
    state.orchestration.macroState, 
    state.currentQuestionIndex,
    state.currentQuestion
  ])

  const { currentQuestion, orchestration } = state

  // Define answer type
  type AnswerType = {
    id: string
    text: string
    points: number
    revealed: boolean
  }

  // Helper to render an answer box
  const renderAnswerBox = (answer: AnswerType, index: number, isPreview: boolean) => {
    const isVisible = index <= animatingBoxIndex
    const shouldAnimate = isPreview && index === animatingBoxIndex
    
    return (
      <motion.div
        key={`${state.currentQuestionIndex}-${answer.id}`}
        initial={{ x: -200, opacity: 0 }}
        animate={isVisible ? { x: 0, opacity: 1 } : { x: -200, opacity: 0 }}
        transition={{ 
          type: "spring", 
          stiffness: 120,
          damping: 25,
          duration: 0.4
        }}
      >
        <div className="relative overflow-hidden rounded-lg border-4 border-orange-500 bg-gradient-to-r from-cyan-700 to-teal-700 p-4 shadow-lg">
          {/* Rank number on left */}
          <div className="absolute left-0 top-0 bottom-0 flex items-center justify-center w-16 bg-cyan-900/50 border-r-4 border-teal-500 font-display text-3xl font-bold text-teal-200 sm:w-20 sm:text-4xl">
            {index + 1}
          </div>

          {/* Answer content */}
          <div className="ml-16 flex items-center justify-between gap-4 sm:ml-20">
            <div className="flex-1 min-w-0 h-8 sm:h-10 flex items-center justify-center">
              <AnimatePresence mode="wait">
                {!isPreview && answer.revealed ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 150, damping: 20 }}
                    className="font-display text-xl font-bold text-white uppercase tracking-wide sm:text-3xl truncate"
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
                  {!isPreview && answer.revealed ? (
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
    )
  }

  // Render based on orchestration state
  if (orchestration.macroState === "welcome") {
    return <WelcomeScreen />
  }

  if (orchestration.macroState === "rules") {
    return <RulesScreen />
  }

  if (orchestration.macroState === "lightning-round-rules") {
    return <LightningRoundRulesScreen sponsorLogo1={state.lightningRulesSponsorLogo1} sponsorLogo2={state.lightningRulesSponsorLogo2} />
  }

  if (orchestration.macroState === "lightning-round") {
    return (
      <LightningRoundScreen 
        contestant1={state.lightningRound.contestant1}
        contestant2={state.lightningRound.contestant2}
        revealTrigger={state.lightningRound.revealTrigger}
        currentRevealingContestant={state.lightningRound.currentContestant}
        currentRevealingAnswerIndex={state.lightningRound.currentRevealingAnswerIndex}
        timerActive={state.lightningRound.timerActive}
        timerSeconds={state.lightningRound.timerSeconds}
        timerStartTime={state.lightningRound.timerStartTime}
        showTimer={state.lightningRound.showTimer}
      />
    )
  }

  if (orchestration.macroState === "final") {
    return (
      <EndingScreen
        sponsorName={state.sponsorName}
        sponsorLogo={state.sponsorLogo || undefined}
        chibiImage={state.chibiImage}
      />
    )
  }

  // Show sponsor video when triggered
  if (orchestration.microState === "sponsor-video" && sponsorVideoData) {
    const handleVideoEnd = () => {
      videoEnded()
    }
    
    return (
      <SponsorVideoScreen 
        videoUrl={sponsorVideoData} 
        sponsorLogo={state.sponsorLogo} 
        footerText={currentFooterText}
        onVideoEnd={handleVideoEnd}
      />
    )
  }
  
  const isPreviewMode = orchestration.microState === "preview"
  const showQuestion = orchestration.microState === "reveal-question" || orchestration.microState === "playing"
  
  // Use currentQuestion for display as it has the revealed state
  const displayQuestion = state.currentQuestion

  // Main game board (questions macro state)
  return (
    <div className="relative h-screen w-screen flex flex-col items-center justify-center p-4 text-white sm:p-8 overflow-x-hidden overflow-y-hidden">
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
        <div className="mx-auto max-w-[90vw]">
          <div className="flex items-center justify-between gap-4 rounded-2xl border-4 border-orange-500 bg-gradient-to-r from-teal-600 via-emerald-500 to-teal-600 px-4 py-2 shadow-2xl sm:px-6 sm:py-3">
            {/* Left - GATE Logo */}
            <div className="flex-shrink-0">
              <div className="h-16 w-32 sm:h-24 sm:w-48">
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
                <div className="h-16 w-32 rounded-lg bg-white/90 p-1 sm:h-24 sm:w-48">
                  <img
                    src={state.sponsorLogo}
                    alt="Sponsor"
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : (
                <div className="h-16 w-32 rounded-lg border-2 border-dashed border-white/30 bg-white/10 sm:h-24 sm:w-48" />
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
      <div className="relative z-10 mb-8 mt-24 w-full max-w-[90vw] sm:mt-28">
        <AnimatePresence mode="wait">
          {orchestration.microState === "reveal-question" && currentQuestion ? (
            <motion.div
              key={`question-${currentQuestion.id}`}
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              className="rounded-lg border-4 border-teal-500 bg-gradient-to-r from-indigo-950 to-purple-950 p-6 shadow-2xl"
            >
              <h1 className="text-center font-display text-2xl font-bold uppercase leading-tight text-white sm:text-4xl md:text-5xl">
                {currentQuestion.text}
              </h1>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Answers Board - Family Feud Style */}
      <div className="relative z-10 w-full max-w-[90vw]">
        {displayQuestion ? (
          displayQuestion.answers.length < 6 ? (
            /* Single Column for < 6 answers */
            <div className="flex flex-col gap-2 sm:gap-3">
              {displayQuestion.answers.map((answer, index) => renderAnswerBox(answer, index, isPreviewMode))}
            </div>
          ) : (
            /* Two Columns for 6+ answers */
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="flex flex-col gap-2 sm:gap-3">
                {displayQuestion.answers.slice(0, 5).map((answer, index) => renderAnswerBox(answer, index, isPreviewMode))}
              </div>
              <div className="flex flex-col gap-2 sm:gap-3">
                {displayQuestion.answers.slice(5, 10).map((answer, index) => renderAnswerBox(answer, index + 5, isPreviewMode))}
              </div>
            </div>
          )
        ) : (
          <div className="text-center text-lg text-gray-400 sm:text-xl">No question loaded</div>
        )}
      </div>

      {/* Footer Text */}
      <AnimatePresence>
        {orchestration.showFooter && currentFooterText && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="absolute bottom-0 z-20 px-4"
          >
            <div className="max-w-[80vw] min-w-[40vw] rounded-2xl border-4 border-orange-500 bg-gradient-to-r from-teal-600 via-emerald-500 to-teal-600 px-6 py-4 shadow-2xl text-center text-lg font-bold text-white sm:text-2xl tracking-wide">
              {currentFooterText}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wrong Answer Animation */}
      <WrongAnswerAnimation trigger={state.wrongAnswerTriggered} />
    </div>
  )
}
