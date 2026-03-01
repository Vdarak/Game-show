"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { usePlayerSession } from "@/hooks/use-player-session"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Loader2,
  Send,
  Clock,
  CheckCircle2,
  Trophy,
  AlertTriangle,
  Zap,
} from "lucide-react"
import { DitherBackground } from "@/components/game/dither-background"
import { TeamAvatar } from "@/components/game/team-avatar"

export default function GamePage() {
  const router = useRouter()
  const {
    team,
    roomCode,
    gameSessionId,
    sessionStatus,
    currentQuestion,
    availableWagers,
    lastSubmission,
    hasSubmittedCurrentQuestion,
    leaderboard,
    isLoading,
    error,
    isInSession,
    isHydrated,
    refreshSessionStatus,
    refreshCurrentQuestion,
    refreshLeaderboard,
    submitAnswer,
    clearError,
  } = usePlayerSession()

  // Form state
  const [answer, setAnswer] = useState("")
  const [selectedWager, setSelectedWager] = useState<number | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [showLeaderboard, setShowLeaderboard] = useState(false)

  // Redirect if not in session (only after hydration)
  useEffect(() => {
    if (isHydrated && !isInSession) {
      router.push("/play/join")
    }
  }, [isHydrated, isInSession, router])

  // Poll for question updates
  useEffect(() => {
    if (!gameSessionId || !team) return

    const poll = async () => {
      const status = await refreshSessionStatus()
      
      // If session completed, show final leaderboard
      if (status?.Status === "completed") {
        setShowLeaderboard(true)
        await refreshLeaderboard()
        return
      }

      // If session is active, check for current question
      if (status?.Status === "active") {
        await refreshCurrentQuestion()
      }

      // If session back to lobby, go back
      if (status?.Status === "lobby") {
        router.push("/play/lobby")
      }
    }

    poll()
    const interval = setInterval(poll, 2000)
    return () => clearInterval(interval)
  }, [gameSessionId, team, refreshSessionStatus, refreshCurrentQuestion, refreshLeaderboard, router])

  // Timer countdown
  useEffect(() => {
    if (!currentQuestion?.QuestionStartedAt || !currentQuestion?.TimerSeconds) {
      setTimeRemaining(null)
      return
    }

    const calculateRemaining = () => {
      const startTime = new Date(currentQuestion.QuestionStartedAt).getTime()
      const elapsed = (Date.now() - startTime) / 1000
      const remaining = Math.max(0, currentQuestion.TimerSeconds - elapsed)
      return Math.ceil(remaining)
    }

    setTimeRemaining(calculateRemaining())

    const interval = setInterval(() => {
      const remaining = calculateRemaining()
      setTimeRemaining(remaining)

      if (remaining <= 0) {
        clearInterval(interval)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [currentQuestion?.QuestionStartedAt, currentQuestion?.TimerSeconds])

  // Reset form when question changes
  useEffect(() => {
    if (currentQuestion && !hasSubmittedCurrentQuestion) {
      setAnswer("")
      setSelectedWager(null)
    }
  }, [currentQuestion?.IDQuestion, hasSubmittedCurrentQuestion])

  // Pre-select first available wager
  useEffect(() => {
    if (availableWagers.length > 0 && selectedWager === null) {
      setSelectedWager(availableWagers[0])
    }
  }, [availableWagers, selectedWager])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    if (!answer.trim() || selectedWager === null) return

    try {
      await submitAnswer(answer.trim(), selectedWager)
    } catch {
      // Error handled by hook
    }
  }

  const handleOptionSelect = (option: string) => {
    setAnswer(option)
  }

  const isTimerLow = timeRemaining !== null && timeRemaining <= 10
  const isTimerCritical = timeRemaining !== null && timeRemaining <= 5
  const isTimerExpired = timeRemaining !== null && timeRemaining <= 0
  const canSubmit = !hasSubmittedCurrentQuestion && !isTimerExpired && answer.trim() && selectedWager !== null
  const totalTime = currentQuestion?.TimerSeconds || 20

  // Find team's rank
  const teamRank = useMemo(() => {
    if (!leaderboard || !team) return null
    const entry = leaderboard.entries.find((e) => e.IDTeam === team.IDTeam)
    return entry?.Rank || null
  }, [leaderboard, team])

  if (!team || !roomCode) {
    return (
      <div className="fixed inset-0 bg-gray-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  // Show final leaderboard
  if (showLeaderboard && leaderboard) {
    return (
      <div className="fixed inset-0 bg-gray-950 overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
          <DitherBackground
            colorBack="#00000000"
            colorFront="#FFD700"
            speed={0.05}
            shape="wave"
            type="4x4"
            pxSize={2}
            scale={1}
          />
        </div>

        <div className="relative z-10 flex flex-col min-h-screen p-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <Trophy className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
            <h1 className="font-display text-4xl font-bold text-white mb-2">
              Game Over!
            </h1>
            {teamRank && (
              <p className="text-xl text-purple-400">
                You placed #{teamRank}
              </p>
            )}
          </motion.div>

          <div className="flex-1 overflow-auto">
            <div className="space-y-2 max-w-md mx-auto">
              {leaderboard.entries.map((entry, index) => (
                <motion.div
                  key={entry.IDTeam}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center gap-4 p-4 rounded-xl ${
                    entry.IDTeam === team.IDTeam
                      ? "bg-purple-600/30 border border-purple-500/50"
                      : "bg-gray-900/60 border border-gray-800"
                  }`}
                >
                  <div className="text-2xl font-display font-bold text-white w-8 text-center">
                    {entry.Rank <= 3 ? ["🥇", "🥈", "🥉"][entry.Rank - 1] : `#${entry.Rank}`}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-white">{entry.TeamName}</div>
                  </div>
                  <div className="font-display text-2xl text-yellow-400">
                    {entry.TotalScore}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <Button
            onClick={() => router.push("/play/join")}
            className="mt-6 w-full max-w-md mx-auto"
          >
            Play Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-950 overflow-hidden">
      {/* Dither Background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
        <DitherBackground
          colorBack="#00000000"
          colorFront={isTimerLow ? "#EF4444" : "#6C5CE7"}
          speed={isTimerLow ? 0.15 : 0.05}
          shape="wave"
          type="4x4"
          pxSize={2}
          scale={1}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TeamAvatar avatarPath={team.AvatarBlobPath} teamName={team.TeamName} size="lg" />
            <span className="text-white font-semibold truncate max-w-[150px]">
              {team.TeamName}
            </span>
          </div>
          <div className="px-3 py-1 rounded-full bg-gray-800 text-gray-400 text-sm">
            {roomCode}
          </div>
        </div>

        {/* Timer Bar - Matching Gameboard Style */}
        {timeRemaining !== null && (
          <div className="mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Clock className={`h-5 w-5 ${
                  isTimerCritical ? 'text-red-400' : isTimerLow ? 'text-yellow-400' : 'text-purple-400'
                }`} />
                <span className={`font-display text-2xl font-bold tabular-nums ${
                  isTimerExpired ? 'text-red-400' : isTimerCritical ? 'text-red-400' : isTimerLow ? 'text-yellow-400' : 'text-white'
                }`}>
                  {isTimerExpired ? '0s' : `${timeRemaining}s`}
                </span>
              </div>
              <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${
                    isTimerCritical
                      ? 'bg-red-500'
                      : isTimerLow
                      ? 'bg-yellow-500'
                      : 'bg-purple-500'
                  }`}
                  initial={{ width: '100%' }}
                  animate={{ width: `${(timeRemaining / totalTime) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Question */}
        <AnimatePresence mode="wait">
          {currentQuestion ? (
            <motion.div
              key={currentQuestion.IDQuestion}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col"
            >
              {/* Category */}
              {currentQuestion.Category && (
                <div className="text-center mb-2">
                  <span className="text-xs text-purple-400 uppercase tracking-wider">
                    {currentQuestion.Category}
                  </span>
                </div>
              )}

              {/* Question Text - Matching Gameboard Typography */}
              <div className="bg-gray-900/60 backdrop-blur-lg rounded-xl p-4 border border-gray-800 mb-4">
                <p className="font-display text-xl font-bold text-white text-center leading-relaxed">
                  {currentQuestion.QuestionText}
                </p>
              </div>

              {/* Already submitted state */}
              {hasSubmittedCurrentQuestion && lastSubmission ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex-1 flex flex-col items-center justify-center"
                >
                  <CheckCircle2 className="h-16 w-16 text-green-400 mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Submitted!</h3>
                  <div className="bg-gray-900/60 rounded-xl p-4 border border-gray-800 w-full max-w-xs">
                    <div className="text-center">
                      <p className="text-gray-400 text-sm mb-1">Your Answer</p>
                      <p className="text-white font-semibold text-lg mb-3">
                        "{lastSubmission.AnswerText}"
                      </p>
                      <p className="text-gray-400 text-sm mb-1">Wagered</p>
                      <p className="text-yellow-400 font-display text-2xl">
                        {lastSubmission.WageredPoints} pts
                      </p>
                      {lastSubmission.TimedBonusAwarded > 0 && (
                        <div className="mt-2 flex items-center justify-center gap-1 text-green-400 text-sm">
                          <Zap className="h-4 w-4" />
                          +{lastSubmission.TimedBonusAwarded} speed bonus!
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm mt-4">
                    Waiting for next question...
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                  {/* Multiple Choice Options - Matching Gameboard Typography */}
                  {currentQuestion.QuestionType === "multiple_choice" &&
                    currentQuestion.Options && (
                      <div className="space-y-3 mb-4">
                        {currentQuestion.Options.map((option, index) => {
                          const letter = String.fromCharCode(65 + index)
                          return (
                            <motion.button
                              key={index}
                              type="button"
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleOptionSelect(option)}
                              disabled={isTimerExpired}
                              className={`w-full p-4 rounded-xl text-left transition-colors flex items-center gap-3 ${
                                answer === option
                                  ? "bg-purple-600 border-2 border-purple-400"
                                  : "bg-gray-800 border-2 border-gray-700 active:bg-gray-700"
                              } ${isTimerExpired ? "opacity-50" : ""}`}
                            >
                              <span className={`w-10 h-10 rounded-lg flex items-center justify-center font-display font-bold text-lg flex-shrink-0 ${
                                answer === option ? 'bg-purple-400 text-white' : 'bg-purple-600/30 text-purple-400'
                              }`}>
                                {letter}
                              </span>
                              <span className="font-display text-lg font-semibold text-white">{option}</span>
                            </motion.button>
                          )
                        })}
                      </div>
                    )}

                  {/* Open-ended Input */}
                  {(currentQuestion.QuestionType === "open_ended" ||
                    currentQuestion.QuestionType === "true_false") && (
                    <div className="mb-4">
                      <Input
                        type="text"
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        placeholder="Type your answer..."
                        disabled={isTimerExpired}
                        className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 h-14 text-lg"
                      />
                    </div>
                  )}

                  {/* Wager Selection - Larger Mobile-Friendly Buttons */}
                  <div className="mb-4">
                    <label className="text-sm text-gray-400 mb-3 block font-display">
                      Wager Points
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {availableWagers.map((wager) => (
                        <motion.button
                          key={wager}
                          type="button"
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSelectedWager(wager)}
                          disabled={isTimerExpired}
                          className={`py-4 px-6 rounded-xl font-display text-xl font-bold transition-colors ${
                            selectedWager === wager
                              ? "bg-yellow-500 text-black"
                              : "bg-gray-800 text-yellow-400 active:bg-gray-700"
                          } ${isTimerExpired ? "opacity-50" : ""}`}
                        >
                          {wager}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center gap-2 text-red-400 text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      {error}
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="mt-auto">
                    <Button
                      type="submit"
                      disabled={!canSubmit || isLoading}
                      className={`w-full h-14 text-lg ${
                        isTimerExpired
                          ? "bg-gray-700 text-gray-400"
                          : "bg-green-600 hover:bg-green-700 text-white"
                      }`}
                    >
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : isTimerExpired ? (
                        "Time Expired"
                      ) : (
                        <>
                          <Send className="mr-2 h-5 w-5" />
                          Submit Answer
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Clock className="h-16 w-16 text-purple-400 mb-4" />
              </motion.div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Waiting for Question
              </h3>
              <p className="text-gray-400 text-center">
                The host will reveal the next question soon
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
