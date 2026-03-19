"use client"

import { useEffect, useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import Image from "next/image"
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
  Coffee,
  MonitorPlay,
  Eye,
  Target,
  Coins,
  Timer,
} from "lucide-react"
import dynamic from "next/dynamic"
const GrainGradient = dynamic(() => import("@paper-design/shaders-react").then(mod => mod.GrainGradient), { ssr: false })
import { TeamAvatar } from "@/components/game/team-avatar"
import { DEFAULT_RULES } from "@/lib/constants"
import { getAvatarValue } from "@/lib/frontend-avatars"
import type { GameState } from "@/lib/api-types"

export default function GamePage() {
  const router = useRouter()
  const {
    team,
    roomCode,
    gameSessionId,
    sessionStatus,
    rulesContent,
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
    refreshLeaderboard,
    submitAnswer,
    clearError,
  } = usePlayerSession()

  // Form state
  const [answer, setAnswer] = useState("")
  const [selectedWager, setSelectedWager] = useState<number | null>(null)

  // Derived from server state
  const gameState: GameState | null = sessionStatus?.GameState || null
  const timerRemaining = sessionStatus?.TimerRemaining ?? null
  const timerTotal = sessionStatus?.TimerTotal ?? null

  const isTimerLow = timerRemaining !== null && timerRemaining <= 10
  const isTimerCritical = timerRemaining !== null && timerRemaining <= 5
  const isTimerExpired = gameState === "timer_ended"
  const effectiveRulesContent =
    Array.isArray(sessionStatus?.RulesContent) && sessionStatus.RulesContent.length > 0
      ? sessionStatus.RulesContent
      : rulesContent.length > 0
        ? rulesContent
        : DEFAULT_RULES

  // Redirect if not in session (only after hydration)
  useEffect(() => {
    if (isHydrated && !isInSession) {
      router.push("/play/join")
    }
  }, [isHydrated, isInSession, router])

  // Bootstrap status once if websocket data is not available yet.
  useEffect(() => {
    if (!gameSessionId || sessionStatus) return
    void refreshSessionStatus()
  }, [gameSessionId, sessionStatus, refreshSessionStatus])

  // React to pushed session state updates.
  useEffect(() => {
    if (!gameSessionId || !team || !sessionStatus) return

    const syncFromStatus = async () => {
      if (sessionStatus.Status === "completed") {
        await refreshLeaderboard()
        return
      }

      if (sessionStatus.Status === "lobby") {
        router.push("/play/lobby")
      }
    }

    void syncFromStatus()
  }, [
    gameSessionId,
    team,
    sessionStatus?.Status,
    sessionStatus?.GameState,
    sessionStatus?.CurrentRound,
    sessionStatus?.CurrentQuestion,
    refreshLeaderboard,
    router,
  ])

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

  const isTimerActive = gameState === "timer_running"
  const canSubmit = !hasSubmittedCurrentQuestion && !isTimerExpired && isTimerActive && answer.trim() && selectedWager !== null

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

  // ===== COMPLETED STATE — Final Leaderboard =====
  if (sessionStatus?.Status === "completed") {
    return (
      <div className="fixed inset-0 bg-gray-950 overflow-y-auto h-[100dvh] w-full">
        <div className="fixed inset-0 z-0 pointer-events-none">
          <GrainGradient
            colors={["#002185", "#faaf00", "#089659"]}
            colorBack="#740fa3"
            shape="wave"
            softness={0.68}
            intensity={0}
            noise={0}
            speed={0.3}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
        <div className="relative z-10 flex flex-col min-h-[100dvh] p-4 sm:p-6 pb-12">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <h1 className="font-display text-4xl font-bold text-white mb-2">Game Over!</h1>
            {teamRank && <p className="text-xl text-purple-200">You placed #{teamRank}</p>}
          </motion.div>
          <div className="flex-1 overflow-auto">
            <div className="space-y-2 max-w-md mx-auto">
              {leaderboard?.entries.map((entry, index) => (
                <motion.div
                  key={entry.IDTeam}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center gap-4 p-4 rounded-xl ${entry.IDTeam === team.IDTeam
                    ? "bg-purple-600/30 border border-purple-500/50"
                    : "bg-gray-950/70 border border-gray-700"
                    }`}
                >
                  <div className="text-2xl font-display font-bold text-white w-8 text-center">
                    {entry.Rank <= 3 ? ["🥇", "🥈", "🥉"][entry.Rank - 1] : `#${entry.Rank}`}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-white">{entry.TeamName}</div>
                  </div>
                  <div className="font-display text-2xl text-yellow-400">{entry.TotalScore}</div>
                </motion.div>
              ))}
            </div>
          </div>
          <a
            href="https://search.google.com/local/writereview?placeid=ChIJS50c9a4Qk6gRDGkOsmNv2IY&source=g.page.m.dd._&laa=lu-desktop-reviews-dialog-review-solicitation"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 w-full max-w-md mx-auto block text-center px-6 py-3 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-black font-semibold text-lg transition-colors"
          >
            Leave a Review
          </a>
        </div>
      </div>
    )
  }

  // ===== PRE-QUESTION STATES (welcome, rules, get_ready, lobby, announced, break, video_playing) =====
  const isPreQuestionState = ["welcome", "rules", "get_ready", "lobby", "announced", "break", "video_playing"].includes(gameState || "")

  if (isPreQuestionState || (!currentQuestion && gameState !== "completed")) {
    const getPreQuestionContent = () => {
      switch (gameState) {
        case "welcome":
          return (
            <div className="text-center flex flex-col items-center gap-4">
              <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
                className="font-display text-xl sm:text-2xl font-semibold text-white tracking-wide">
                Welcome to
              </motion.p>
              <motion.div
                initial={{ y: 30, opacity: 0, scale: 0.8 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 200, damping: 15 }}
                className="w-[85vw] max-w-[500px]"
              >
                <Image src="/trivi-time-logo.png" alt="Trivi Time" width={500} height={150} className="w-full h-auto drop-shadow-2xl" priority />
              </motion.div>
              <motion.div
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="flex flex-row items-end justify-center gap-8 mt-4"
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs sm:text-sm text-white font-medium tracking-wider uppercase drop-shadow">presented by</span>
                  <Image src="/gate-logo.png" alt="GATE" width={80} height={28} className="h-6 sm:h-8 w-auto drop-shadow" />
                </div>
                {sessionStatus?.SponsorshipImage && (
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xs sm:text-sm text-white font-medium tracking-wider uppercase drop-shadow">sponsored by</span>
                    <img src={sessionStatus.SponsorshipImage} alt="Sponsor" className="h-6 sm:h-8 w-auto object-contain drop-shadow" />
                  </div>
                )}
              </motion.div>
            </div>
          )

        case "rules":
          return (
            <div className="w-[90vw] sm:w-[75vw] mx-auto">
              <div className="flex items-center gap-2 mb-2 justify-center">
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-yellow-400 underline drop-shadow-md">RULES</h2>
              </div>
              <div className="space-y-0">
                {effectiveRulesContent.map((rule, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.08 }}
                    className="py-1 px-1 flex items-start gap-2"
                  >
                    <span className="flex-shrink-0 font-display text-base sm:text-lg font-bold text-purple-400 drop-shadow-md">&gt;</span>
                    <p className="font-display text-sm sm:text-base text-white leading-snug drop-shadow-md">{rule}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          )

        case "get_ready":
          return (
            <div className="text-center">
              <h2 className="font-display text-6xl sm:text-[5rem] font-bold text-white mb-4 drop-shadow-md">Get Ready!</h2>
              <p className="text-gray-200">Next question is coming up...</p>
            </div>
          )

        case "announced":
          return (
            <div className="text-center">
              <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
                className="text-3xl sm:text-5xl text-purple-200 uppercase tracking-widest font-semibold mb-4 drop-shadow-md">
                Round {sessionStatus?.CurrentRound}
              </motion.p>
              <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
                className="font-display text-[15vw] sm:text-[7rem] leading-none font-bold text-white mb-4 whitespace-nowrap drop-shadow-md">
                Question {sessionStatus?.CurrentQuestion}
              </motion.p>
              {currentQuestion?.Category && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                  className="text-3xl sm:text-5xl font-semibold text-gray-300 drop-shadow-md">
                  {currentQuestion.Category}
                </motion.p>
              )}
            </div>
          )

        case "video_playing":
          return (
            <div className="text-center">
              <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 3 }}>
                <MonitorPlay className="h-16 w-16 text-blue-400 mx-auto mb-4" />
              </motion.div>
              <h2 className="font-display text-3xl font-bold text-white mb-2">Watch the Screen!</h2>
              <p className="text-gray-200">A video is playing on the gameboard</p>
            </div>
          )

        case "break":
          if (sessionStatus?.SponsorshipVideoUrl || sessionStatus?.SponsorshipImage) {
            return (
              <div className="text-center flex flex-col items-center gap-6">
                <h2 className="font-display text-3xl font-bold text-yellow-400 drop-shadow-md">
                  A word from our sponsors
                </h2>
                {sessionStatus.SponsorshipImage && (
                  <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/20 shadow-xl">
                    <img src={sessionStatus.SponsorshipImage} alt="Sponsor" className="h-24 w-auto object-contain drop-shadow-xl" />
                  </div>
                )}
                {sessionStatus.SponsorshipVideoUrl && (
                  <p className="text-purple-300 mt-2 animate-pulse uppercase tracking-widest text-sm font-semibold">Watch the main screen!</p>
                )}
              </div>
            )
          }
          return (
            <div className="text-center">
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}>
                <Coffee className="h-16 w-16 text-yellow-400 mx-auto mb-4 drop-shadow-md" />
              </motion.div>
              <h2 className="font-display text-4xl font-bold text-white mb-2 drop-shadow-md">Break Time</h2>
              <p className="text-gray-200 drop-shadow-md">Sit tight — we&apos;ll be right back!</p>
            </div>
          )

        default:
          return (
            <div className="text-center">
              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                <Clock className="h-16 w-16 text-purple-400 mb-4 mx-auto" />
              </motion.div>
              <h3 className="font-display text-xl font-semibold text-white mb-2">Waiting for Question</h3>
              <p className="text-gray-200 text-center">The host will reveal the next question soon</p>
            </div>
          )
      }
    }

    return (
      <div className="fixed inset-0 bg-gray-950 overflow-y-auto h-[100dvh] w-full">
        <div className="fixed inset-0 z-0 pointer-events-none">
          <GrainGradient
            colors={["#002185", "#faaf00", "#089659"]}
            colorBack="#740fa3"
            shape="wave"
            softness={0.68}
            intensity={0}
            noise={0}
            speed={0.3}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
        <div className="relative z-10 flex flex-col min-h-[100dvh] p-4 sm:p-6 pb-12">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TeamAvatar
                avatarPath={getAvatarValue(team)}
                teamName={team.TeamName}
                teamId={team.IDTeam}
                size="lg"
                noFrame
              />
              <span className="text-white font-semibold truncate max-w-[150px]">{team.TeamName}</span>
            </div>
            <div className="px-3 py-1 rounded-full bg-gray-950/70 text-gray-200 text-sm">{roomCode}</div>
          </div>

          {/* State Content */}
          <div className="flex-1 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={gameState || "waiting"}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {getPreQuestionContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    )
  }

  // ===== QUESTION STATES (options_revealed, timer_running, timer_ended, answer_reveal) =====
  return (
    <div className="fixed inset-0 bg-gray-950 overflow-y-auto h-[100dvh] w-full">
      {/* Dither Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <GrainGradient
          colors={["#002185", "#faaf00", "#089659"]}
          colorBack="#740fa3"
          shape="wave"
          softness={0.68}
          intensity={0}
          noise={0}
          speed={0.3}
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-[100dvh] p-4 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TeamAvatar
              avatarPath={getAvatarValue(team)}
              teamName={team.TeamName}
              teamId={team.IDTeam}
              size="lg"
              noFrame
            />
            <span className="text-white font-semibold truncate max-w-[150px]">{team.TeamName}</span>
          </div>
          <div className="px-3 py-1 rounded-full bg-gray-800 text-gray-400 text-sm">{roomCode}</div>
        </div>

        {/* Timer Bar — from server */}
        {timerRemaining !== null && (gameState === "timer_running" || gameState === "timer_ended") && (
          <div className="mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Clock className={`h-5 w-5 ${isTimerExpired ? 'text-red-400' : isTimerCritical ? 'text-red-400' : isTimerLow ? 'text-yellow-400' : 'text-purple-400'}`} />
                <span className={`font-display text-2xl font-bold ${isTimerExpired ? 'text-red-400' : `tabular-nums ${isTimerCritical ? 'text-red-400' : isTimerLow ? 'text-yellow-400' : 'text-white'}`}`}>
                  {isTimerExpired ? "TIME'S UP!" : `${timerRemaining}s`}
                </span>
              </div>
              <div className="flex-1 h-3 bg-gray-950/70 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${isTimerExpired ? 'bg-red-500' : isTimerCritical ? 'bg-red-500' : isTimerLow ? 'bg-yellow-500' : 'bg-purple-500'}`}
                  animate={{ width: `${isTimerExpired ? 0 : timerTotal ? (timerRemaining / timerTotal) * 100 : 0}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Answer Reveal State */}
        {gameState === "answer_reveal" && currentQuestion && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col items-center justify-center"
          >
            <Eye className="h-12 w-12 text-green-400 mb-4" />
            <h3 className="font-display text-xl font-bold text-white mb-4">Answer Revealed</h3>
            <p className="text-gray-200 mb-4">Look at the gameboard for the correct answer!</p>
            {hasSubmittedCurrentQuestion && lastSubmission && (
              <div className="bg-gray-950/80 rounded-xl p-4 border border-gray-700 w-full max-w-xs text-center">
                <p className="text-sm text-gray-200 mb-1">Your Answer</p>
                <p className="text-lg font-semibold text-white">
                  &quot;{lastSubmission.AnswerText}&quot;
                </p>
                <p className="text-sm text-gray-300 mt-1">Wagered {lastSubmission.WageredPoints} pts</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Question */}
        {gameState !== "answer_reveal" && (
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
                    <span className="text-sm sm:text-base font-semibold text-purple-300 uppercase tracking-wider">
                      {currentQuestion.Category}
                    </span>
                  </div>
                )}

                {/* Question Text */}
                <div className="bg-gray-950/80 backdrop-blur-lg rounded-xl p-4 border border-gray-700 mb-4">
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
                    <h3 className="font-display text-xl font-bold text-white mb-2">Submitted!</h3>
                    <div className="bg-gray-950/80 rounded-xl p-4 border border-gray-700 w-full max-w-xs">
                      <div className="text-center">
                        <p className="text-gray-200 text-sm mb-1">Your Answer</p>
                        <p className="text-white font-semibold text-lg mb-3">&quot;{lastSubmission.AnswerText}&quot;</p>
                        <p className="text-gray-200 text-sm mb-1">Wagered</p>
                        <p className="text-yellow-400 font-display text-2xl">{lastSubmission.WageredPoints} pts</p>
                        {lastSubmission.TimedBonusAwarded > 0 && (
                          <div className="mt-2 flex items-center justify-center gap-1 text-green-400 text-sm">
                            <Zap className="h-4 w-4" />
                            +{lastSubmission.TimedBonusAwarded} speed bonus!
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-200 text-sm mt-4">Waiting for results...</p>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                    {(() => {
                      const isTrueFalse = currentQuestion.QuestionType === "true_false" ||
                        (currentQuestion.Options?.length === 2 &&
                          currentQuestion.Options.every(o => ["True", "False"].includes(o)))
                      const isMCQ = currentQuestion.QuestionType === "multiple_choice" && !isTrueFalse
                      const isOpenEnded = !isMCQ && !isTrueFalse

                      return (
                        <>
                          {/* Multiple Choice Options */}
                          {isMCQ && currentQuestion.Options && (
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
                                    className={`w-full p-4 rounded-xl text-left transition-colors flex items-center gap-3 ${answer === option
                                      ? "bg-purple-600 border-2 border-purple-400"
                                      : "bg-gray-950/70 border-2 border-gray-600 active:bg-gray-800"
                                      } ${isTimerExpired ? "opacity-50" : ""}`}
                                  >
                                    <span className={`w-10 h-10 rounded-lg flex items-center justify-center font-display font-bold text-lg flex-shrink-0 ${answer === option ? 'bg-purple-400 text-white' : 'bg-purple-600/30 text-purple-400'}`}>
                                      {letter}
                                    </span>
                                    <span className="font-display text-lg font-semibold text-white flex-1 text-center">{option}</span>
                                  </motion.button>
                                )
                              })}
                            </div>
                          )}

                          {/* True/False Buttons */}
                          {isTrueFalse && (
                            <div className="grid grid-cols-2 gap-3 mb-4">
                              {["True", "False"].map((opt) => (
                                <motion.button
                                  key={opt}
                                  type="button"
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleOptionSelect(opt)}
                                  disabled={isTimerExpired}
                                  className={`py-5 rounded-xl font-display text-xl font-bold transition-colors ${answer === opt
                                    ? opt === "True"
                                      ? "bg-green-600 border-2 border-green-400 text-white"
                                      : "bg-red-600 border-2 border-red-400 text-white"
                                    : "bg-gray-950/70 border-2 border-gray-600 text-gray-100 active:bg-gray-800"
                                    } ${isTimerExpired ? "opacity-50" : ""}`}
                                >
                                  {opt}
                                </motion.button>
                              ))}
                            </div>
                          )}

                          {/* Open-ended Input */}
                          {isOpenEnded && (
                            <div className="mb-4">
                              <Input
                                type="text"
                                value={answer}
                                onChange={(e) => setAnswer(e.target.value)}
                                placeholder="Type your answer..."
                                disabled={isTimerExpired}
                                className="bg-gray-950/90 border-gray-600 text-white placeholder:text-gray-400 h-14 text-lg"
                              />
                            </div>
                          )}
                        </>
                      )
                    })()}

                    {/* Wager Selection */}
                    <div className="mb-4">
                      <label className="text-sm text-gray-200 mb-3 block font-display">
                        Wager Points
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {availableWagers.map((wager) => (
                          <motion.button
                            key={wager}
                            type="button"
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSelectedWager(wager)}
                            disabled={isTimerExpired}
                            className={`py-3 px-4 rounded-xl font-display text-lg font-bold transition-colors ${selectedWager === wager
                              ? "bg-yellow-500 text-black"
                              : "bg-gray-950/70 text-yellow-400 active:bg-gray-800"
                              } ${isTimerExpired ? "opacity-50" : ""}`}
                          >
                            {wager}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Error — auto-dismissing toast */}
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center gap-2 text-red-400 text-sm"
                        >
                          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                          {error}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Submit Button */}
                    <div className="mt-auto">
                      <Button
                        type="submit"
                        disabled={!canSubmit || isLoading}
                        className={`w-full h-14 text-lg ${isTimerExpired
                          ? "bg-gray-700 text-gray-400"
                          : "bg-green-600 hover:bg-green-700 text-white"
                          }`}
                      >
                        {isLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : isTimerExpired ? (
                          "Time's Up"
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
                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                  <Clock className="h-16 w-16 text-purple-400 mb-4" />
                </motion.div>
                <h3 className="font-display text-xl font-semibold text-white mb-2">Waiting for Question</h3>
                <p className="text-gray-200 text-center">The host will reveal the next question soon</p>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
