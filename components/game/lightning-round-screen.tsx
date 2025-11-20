"use client"

import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion"
import { useEffect, useState } from "react"

interface LightningAnswer {
  id: string
  text: string
  points: number
  revealed: boolean
  pointsRevealed: boolean
}

interface LightningContestant {
  name: string
  answers: LightningAnswer[]
  totalPoints: number
}

interface LightningRoundScreenProps {
  contestant1: LightningContestant
  contestant2: LightningContestant
  revealTrigger?: number
  currentRevealingContestant?: 1 | 2
  currentRevealingAnswerIndex?: number
  timerActive?: boolean
  timerSeconds?: number
  timerStartTime?: number | null
  showTimer?: boolean
}

function AnimatedPoints({ value, revealed }: { value: number; revealed: boolean }) {
  const spring = useSpring(0, { duration: 1500 })
  const display = useTransform(spring, (current) => Math.round(current))
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const unsubscribe = display.onChange(setDisplayValue)
    return unsubscribe
  }, [display])

  useEffect(() => {
    if (revealed) {
      spring.set(value)
    } else {
      spring.set(0)
      setDisplayValue(0)
    }
  }, [value, revealed, spring])

  if (!revealed) {
    return (
      <p className="text-4xl sm:text-5xl font-black text-yellow-300">
        ---
      </p>
    )
  }

  return (
    <p className="text-4xl sm:text-5xl font-black text-yellow-300">
      {displayValue}
    </p>
  )
}

function CombinedTotalPoints({ contestant1, contestant2 }: { contestant1: LightningContestant; contestant2: LightningContestant }) {
  // Calculate total from revealed points only
  const totalPoints = 
    contestant1.answers.filter(a => a.pointsRevealed).reduce((sum, a) => sum + a.points, 0) +
    contestant2.answers.filter(a => a.pointsRevealed).reduce((sum, a) => sum + a.points, 0)

  const spring = useSpring(0, { duration: 1000 })
  const display = useTransform(spring, (current) => Math.round(current))
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const unsubscribe = display.onChange(setDisplayValue)
    return unsubscribe
  }, [display])

  useEffect(() => {
    spring.set(totalPoints)
  }, [totalPoints, spring])

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="flex flex-col items-center justify-center bg-gradient-to-b from-orange-600 to-red-600 border-4 border-yellow-400 rounded-lg px-6 py-3 shadow-2xl"
    >
      <p className="text-xs sm:text-sm font-bold text-white mb-1 uppercase tracking-wider">Combined Total</p>
      <p className="text-4xl sm:text-6xl font-black text-yellow-300"
        style={{
          textShadow: '3px 3px 0px #000, -1px -1px 0px #000',
          WebkitTextStroke: '1px #000',
          paintOrder: 'stroke fill',
        }}
      >
        {displayValue}
      </p>
    </motion.div>
  )
}

export function LightningRoundScreen({
  contestant1,
  contestant2,
  revealTrigger = 0,
  currentRevealingContestant = 1,
  currentRevealingAnswerIndex = -1,
  timerActive = false,
  timerSeconds = 25,
  timerStartTime = null,
  showTimer = false,
}: LightningRoundScreenProps) {
  const [timeRemaining, setTimeRemaining] = useState(timerSeconds)
  
  // Check if all answers are revealed for each contestant
  const allAnswersRevealed1 = contestant1.answers.every(a => a.revealed)
  const allAnswersRevealed2 = contestant2.answers.every(a => a.revealed)

  // Timer countdown
  useEffect(() => {
    if (timerActive && timerStartTime) {
      const interval = setInterval(() => {
        const elapsed = (Date.now() - timerStartTime) / 1000
        const remaining = Math.max(0, timerSeconds - elapsed)
        setTimeRemaining(Math.ceil(remaining))
        
        if (remaining <= 0) {
          clearInterval(interval)
        }
      }, 100)
      
      return () => clearInterval(interval)
    } else {
      setTimeRemaining(timerSeconds)
    }
  }, [timerActive, timerStartTime, timerSeconds])

  const getTimerColor = () => {
    if (timeRemaining > 10) return "text-green-400"
    if (timeRemaining > 5) return "text-yellow-400"
    return "text-red-500"
  }

  const renderAnswerBox = (answer: LightningAnswer, rank: number, isRevealed: boolean, contestant: number) => {
    return (
      <motion.div
        key={answer.id}
        initial={{ x: -200, opacity: 0 }}
        animate={isRevealed ? { x: 0, opacity: 1 } : { x: -200, opacity: 0 }}
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
            {rank}
          </div>

          {/* Answer content */}
          <div className="ml-16 flex items-center justify-between gap-4 sm:ml-20">
            <div className="flex-1 min-w-0 h-8 sm:h-10 flex items-center justify-center">
              <AnimatePresence mode="wait">
                {isRevealed ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 150, damping: 20 }}
                    className="font-display text-xl font-bold text-white uppercase tracking-wide sm:text-3xl truncate"
                  >
                    {answer.text || "CONTESTANT " + contestant + " RESPONSES"}
                  </motion.div>
                ) : (
                  <div className="w-full h-8 sm:h-10 bg-gradient-to-r from-cyan-600 to-teal-600 rounded animate-pulse" />
                )}
              </AnimatePresence>
            </div>

            {/* Points on right */}
            <div className="flex-shrink-0">
              <AnimatePresence mode="wait">
                {isRevealed && answer.pointsRevealed ? (
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
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="relative h-screen w-screen flex flex-col overflow-x-hidden overflow-y-hidden">
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

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60 z-[1]" />

      {/* Header */}
      <div className="relative z-10 px-4 py-4 sm:py-6">
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

            {/* Center - Title, Timer and Combined Total */}
            <div className="flex-1 text-center">
              <h1
                className="font-display text-xl font-black uppercase tracking-wider text-orange-500 sm:text-3xl md:text-4xl mb-2"
                style={{
                  textShadow: '3px 3px 0px #000, -1px -1px 0px #000, 1px -1px 0px #000, -1px 1px 0px #000, 4px 4px 8px rgba(0,0,0,0.5)',
                  WebkitTextStroke: '2px #000',
                  paintOrder: 'stroke fill',
                }}
              >
                Popularity Speed Round
              </h1>
              
              {/* Timer and Combined Total Row */}
              <div className="flex items-center justify-center gap-4 sm:gap-6 mt-2">
                {/* Timer Display */}
                {showTimer && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="inline-block"
                  >
                    <div className={`text-5xl sm:text-6xl font-black ${getTimerColor()} transition-colors duration-300`}
                      style={{
                        textShadow: '4px 4px 0px #000, -2px -2px 0px #000, 2px -2px 0px #000, -2px 2px 0px #000',
                        WebkitTextStroke: '2px #000',
                        paintOrder: 'stroke fill',
                      }}
                    >
                      {timeRemaining}
                    </div>
                  </motion.div>
                )}
                
                {/* Combined Total - Now in header */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="inline-flex flex-col items-center justify-center bg-gradient-to-b from-orange-600 to-red-600 border-4 border-yellow-400 rounded-lg px-4 py-2 sm:px-6 sm:py-3 shadow-2xl"
                >
                  <p className="text-xs sm:text-sm font-bold text-white mb-1 uppercase tracking-wider">Combined Total</p>
                  <p className="text-3xl sm:text-5xl font-black text-yellow-300"
                    style={{
                      textShadow: '3px 3px 0px #000, -1px -1px 0px #000',
                      WebkitTextStroke: '1px #000',
                      paintOrder: 'stroke fill',
                    }}
                  >
                    {(() => {
                      const totalPoints = 
                        contestant1.answers.filter(a => a.pointsRevealed).reduce((sum, a) => sum + a.points, 0) +
                        contestant2.answers.filter(a => a.pointsRevealed).reduce((sum, a) => sum + a.points, 0)
                      return totalPoints
                    })()}
                  </p>
                </motion.div>
              </div>
            </div>

            {/* Right - GATE Logo */}
            <div className="flex-shrink-0">
              <div className="h-16 w-32 sm:h-24 sm:w-48">
                <img
                  src="/gate-logo.png"
                  alt="GATE"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Two Player Grid */}
      <div className="relative z-10 flex-1 px-4 py-6">
        <div className="mx-auto h-full max-w-[90vw]">
          <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Contestant 1 */}
            <div className="flex flex-col">
              {/* Contestant 1 Header */}
              <div className="mb-4">
                <div className="rounded-lg border-4 border-blue-400 bg-blue-900/90 shadow-xl overflow-hidden">
                  <div className="flex items-center justify-center p-3">
                    <h3
                      className="text-2xl sm:text-3xl md:text-4xl font-black text-yellow-400 uppercase text-center"
                      style={{
                        textShadow: '2px 2px 0px #000, -1px -1px 0px #000',
                        WebkitTextStroke: '1.5px #000',
                        paintOrder: 'stroke fill',
                      }}
                    >
                      {contestant1.name}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Contestant 1 Answers */}
              <div className="flex-1 flex flex-col gap-2 sm:gap-3">
                {contestant1.answers.map((answer, index) => 
                  renderAnswerBox(answer, index + 1, answer.revealed, 1)
                )}
              </div>
            </div>

            {/* Contestant 2 */}
            <div className="flex flex-col">
              {/* Contestant 2 Header */}
              <div className="mb-4">
                <div className="rounded-lg border-4 border-blue-400 bg-blue-900/90 shadow-xl overflow-hidden">
                  <div className="flex items-center justify-center p-3">
                    <h3
                      className="text-2xl sm:text-3xl md:text-4xl font-black text-yellow-400 uppercase text-center"
                      style={{
                        textShadow: '2px 2px 0px #000, -1px -1px 0px #000',
                        WebkitTextStroke: '1.5px #000',
                        paintOrder: 'stroke fill',
                      }}
                    >
                      {contestant2.name}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Contestant 2 Answers */}
              <div className="flex-1 flex flex-col gap-2 sm:gap-3">
                {contestant2.answers.map((answer, index) => 
                  renderAnswerBox(answer, index + 1, answer.revealed, 2)
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
