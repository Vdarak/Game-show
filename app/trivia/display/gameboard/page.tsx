"use client"

import { useEffect, useState, useRef, Suspense } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSearchParams } from "next/navigation"
import { sessionsApi, episodesApi } from "@/lib/api-client"
import { DitherBackground } from "@/components/game/dither-background"
import { TeamAvatar } from "@/components/game/team-avatar"
import {
  Loader2,
  Trophy,
  Clock,
  Users,
  Medal,
  Volume2,
  VolumeX,
} from "lucide-react"
import type {
  Session,
  SessionStatusResponse,
  LeaderboardResponse,
  Question,
  EpisodeWithRounds,
} from "@/lib/api-types"

function GameBoardContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session")

  const [episode, setEpisode] = useState<EpisodeWithRounds | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [sessionStatus, setSessionStatus] = useState<SessionStatusResponse | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null)
  const [teamCount, setTeamCount] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [totalTime, setTotalTime] = useState<number>(20)
  const [error, setError] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [showVideo, setShowVideo] = useState(true)
  const [showAnswer, setShowAnswer] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const answerVideoRef = useRef<HTMLVideoElement>(null)
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null)

  // Generate QR code URL
  const roomCode = sessionStatus?.RoomCode || session?.RoomCode || ""
  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/play/join?code=${roomCode}`
      : ""
  const qrCodeUrl = roomCode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}&bgcolor=111827&color=ffffff`
    : ""

  // Listen for host commands via BroadcastChannel
  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      broadcastChannelRef.current = new BroadcastChannel(`trivitime-host-${sessionId}`)
      broadcastChannelRef.current.onmessage = (event) => {
        const { type, payload } = event.data || {}
        if (type === "SHOW_ANSWER") {
          setShowAnswer(payload === true)
        } else if (type === "TOGGLE_ANSWER") {
          setShowAnswer((prev) => !prev)
        } else if (type === "TOGGLE_VIDEO") {
          setShowVideo((prev) => !prev)
        }
      }
    } catch (err) {
      console.log("BroadcastChannel not supported")
    }

    return () => {
      broadcastChannelRef.current?.close()
    }
  }, [sessionId])

  // Reset showAnswer when question changes
  useEffect(() => {
    setShowAnswer(false)
  }, [currentQuestion?.IDQuestion])

  // Poll for updates
  useEffect(() => {
    if (!sessionId) {
      setError("No session ID provided. Add ?session=<id> to URL")
      return
    }

    const fetchData = async () => {
      try {
        const [status, lb, teams] = await Promise.all([
          sessionsApi.status(sessionId),
          sessionsApi.leaderboard(sessionId),
          sessionsApi.teams(sessionId),
        ])

        setSessionStatus(status)
        setSession(status)
        setLeaderboard(lb)
        setTeamCount(teams.length)

        // Load episode if not loaded
        if (status.IDEpisode && !episode) {
          try {
            const ep = await episodesApi.get(status.IDEpisode)
            setEpisode(ep)
          } catch {
            // May not have auth for this
          }
        }

        // Get current question from episode
        if (episode && status.CurrentRound !== null && status.CurrentQuestion !== null) {
          const round = episode.rounds.find((r) => r.RoundNumber === status.CurrentRound)
          if (round) {
            const question = round.questions.find((q) => q.QuestionOrder === status.CurrentQuestion)
            setCurrentQuestion(question || null)
          }
        }

        // Calculate timer
        if (status.QuestionStartedAt && status.Status === "active") {
          const started = new Date(status.QuestionStartedAt).getTime()
          const now = Date.now()
          const elapsed = Math.floor((now - started) / 1000)
          
          // Get timer from current round or question
          let timerSeconds = 20
          if (episode && status.CurrentRound !== null) {
            const round = episode.rounds.find((r) => r.RoundNumber === status.CurrentRound)
            if (round) {
              timerSeconds = round.TimerSeconds
              if (currentQuestion?.TimerSecondsOverride) {
                timerSeconds = currentQuestion.TimerSecondsOverride
              }
            }
          }
          
          setTotalTime(timerSeconds)
          const remaining = Math.max(0, timerSeconds - elapsed)
          setTimeRemaining(remaining)
        }
      } catch (err) {
        console.error("Poll error:", err)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 2000)
    return () => clearInterval(interval)
  }, [sessionId, episode, currentQuestion])

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return

    const timer = setInterval(() => {
      setTimeRemaining((prev) => (prev !== null && prev > 0 ? prev - 1 : 0))
    }, 1000)

    return () => clearInterval(timer)
  }, [timeRemaining])

  // Handle fullscreen and keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") {
        if (document.fullscreenElement) {
          document.exitFullscreen()
        } else {
          document.documentElement.requestFullscreen()
        }
      }
      if (e.key === "m" || e.key === "M") {
        setIsMuted((prev) => !prev)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  const isLobby = sessionStatus?.Status === "lobby"
  const isActive = sessionStatus?.Status === "active"
  const isCompleted = sessionStatus?.Status === "completed"

  // Get sponsor info from episode - default to gate-logo.png
  const sponsorLogo = episode?.SponsorConfig?.logo || "/gate-logo.png"

  // Get current category
  const currentCategory = currentQuestion?.Category || "General"

  // Check if there's a video to show
  const hasQuestionVideo = currentQuestion?.QuestionVideoUrl && !showAnswer
  const hasAnswerVideo = showAnswer && currentQuestion?.AnswerVideoUrl
  const hasVideo = hasQuestionVideo || hasAnswerVideo

  if (error) {
    return (
      <div className="fixed inset-0 bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl">{error}</p>
          <p className="text-gray-500 text-sm mt-2">
            Usage: /trivia/display/gameboard?session=SESSION_ID
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-950 flex">
      {/* Background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-10">
        <DitherBackground
          colorBack="#00000000"
          colorFront={isCompleted ? "#FFD700" : "#6C5CE7"}
          speed={0.02}
          shape="wave"
          type="4x4"
          pxSize={3}
          scale={1}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* ==== TOP BAR: Sponsor Logo (left) | Category | GATE Logo (right) ==== */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-900/90 backdrop-blur border-b border-gray-800">
          {/* Sponsor Logo (Left) */}
          <div className="flex items-center">
            <img src={sponsorLogo} alt="Sponsor" className="h-10 object-contain" />
          </div>

          {/* Category Section */}
          <div className="flex-1 flex justify-center">
            {isActive && (
              <div className="text-center">
                <span className="text-xs text-gray-500 uppercase tracking-wider">Category</span>
                <p className="text-xl font-display font-bold text-purple-400">{currentCategory}</p>
              </div>
            )}
            {isLobby && (
              <div className="text-center">
                <span className="text-xs text-gray-500 uppercase tracking-wider">Status</span>
                <p className="text-xl font-display font-bold text-yellow-400">Waiting for Players</p>
              </div>
            )}
            {isCompleted && (
              <div className="text-center">
                <span className="text-xs text-gray-500 uppercase tracking-wider">Status</span>
                <p className="text-xl font-display font-bold text-green-400">Game Complete</p>
              </div>
            )}
          </div>

          {/* GATE Logo (Right) + Info */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              {isActive && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <span>Round {sessionStatus?.CurrentRound}</span>
                  <span className="text-gray-600">•</span>
                  <span>Q{sessionStatus?.CurrentQuestion}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-500">
                <Users className="h-4 w-4" />
                <span>{teamCount} teams</span>
              </div>
            </div>
            <img src="/gate-logo.png" alt="GATE" className="h-10 object-contain" />
          </div>
        </div>

        {/* ==== MAIN CONTENT AREA ==== */}
        <div className="flex-1 flex flex-col p-6 gap-4 overflow-hidden">
          <AnimatePresence mode="wait">
            {/* ==== LOBBY STATE ==== */}
            {isLobby && (
              <motion.div
                key="lobby"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex-1 flex items-center justify-center"
              >
                <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
                  {/* QR Code */}
                  {roomCode && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-2xl"
                    >
                      <img
                        src={qrCodeUrl}
                        alt="Scan to join"
                        className="w-48 h-48 lg:w-64 lg:h-64"
                      />
                      <p className="text-center text-gray-500 text-sm mt-3">Scan to Play</p>
                    </motion.div>
                  )}

                  {/* Join Info */}
                  <div className="text-center">
                    <p className="text-gray-400 text-lg mb-2">Enter code to join:</p>
                    <p className="font-display text-5xl lg:text-6xl text-purple-400 tracking-[0.3em] mb-6">
                      {roomCode}
                    </p>
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <Users className="h-6 w-6" />
                      <span className="text-2xl">{teamCount} teams joined</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ==== ACTIVE QUESTION STATE ==== */}
            {isActive && currentQuestion && (
              <motion.div
                key="question"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col gap-4"
              >
                {/* Video Section (toggleable) */}
                {showVideo && hasVideo && (
                  <div className="flex-shrink-0">
                    <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-h-[40vh]">
                      {hasQuestionVideo && (
                        <video
                          ref={videoRef}
                          src={currentQuestion.QuestionVideoUrl!}
                          className="w-full h-full object-contain"
                          controls
                          muted={isMuted}
                          autoPlay
                        />
                      )}
                      {hasAnswerVideo && (
                        <video
                          ref={answerVideoRef}
                          src={currentQuestion.AnswerVideoUrl!}
                          className="w-full h-full object-contain"
                          controls
                          muted={isMuted}
                          autoPlay
                        />
                      )}
                      {/* Audio Toggle */}
                      <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="absolute bottom-4 right-4 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                      >
                        {isMuted ? (
                          <VolumeX className="h-5 w-5 text-white" />
                        ) : (
                          <Volume2 className="h-5 w-5 text-white" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Timer Bar */}
                {timeRemaining !== null && (
                  <div className="flex-shrink-0">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Clock className={`h-5 w-5 ${timeRemaining <= 5 ? 'text-red-400' : timeRemaining <= 10 ? 'text-yellow-400' : 'text-purple-400'}`} />
                        <span className="font-display text-2xl font-bold tabular-nums text-white">
                          {timeRemaining}s
                        </span>
                      </div>
                      <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${
                            timeRemaining <= 5
                              ? 'bg-red-500'
                              : timeRemaining <= 10
                              ? 'bg-yellow-500'
                              : 'bg-purple-500'
                          }`}
                          initial={{ width: '100%' }}
                          animate={{ width: `${(timeRemaining / totalTime) * 100}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Question Text */}
                <div className={`bg-gray-900/80 backdrop-blur rounded-2xl p-6 border border-gray-800 ${!showVideo || !hasVideo ? 'flex-1 flex items-center justify-center' : ''}`}>
                  <h2 className="font-display text-2xl lg:text-5xl font-bold text-white text-center">
                    {currentQuestion.QuestionText}
                  </h2>
                </div>

                {/* Answer Options Grid (A-F layout like wireframe) */}
                {currentQuestion.QuestionType === "multiple_choice" && currentQuestion.Options && (
                  <div className="flex-shrink-0">
                    <div className={`grid gap-3 ${currentQuestion.Options.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                      {currentQuestion.Options.map((option, i) => {
                        const isCorrect = showAnswer && option === currentQuestion.CorrectAnswer
                        const letter = String.fromCharCode(65 + i)
                        
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={`p-4 rounded-xl border-2 transition-all ${
                              isCorrect
                                ? 'border-green-500 bg-green-500/20 shadow-lg shadow-green-500/20'
                                : 'border-gray-700 bg-gray-800/80 hover:border-gray-600'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className={`w-10 h-10 rounded-lg flex items-center justify-center font-display font-bold text-xl ${
                                isCorrect ? 'bg-green-500 text-white' : 'bg-purple-600/30 text-purple-400'
                              }`}>
                                {letter}
                              </span>
                              <span className="font-display text-xl font-semibold text-white flex-1">{option}</span>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* True/False Options */}
                {currentQuestion.QuestionType === "true_false" && (
                  <div className="flex-shrink-0">
                    <div className="grid grid-cols-2 gap-4">
                      {["True", "False"].map((option, i) => {
                        const isCorrect = showAnswer && option === currentQuestion.CorrectAnswer
                        
                        return (
                          <motion.div
                            key={option}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={`p-6 rounded-xl border-2 text-center transition-all ${
                              isCorrect
                                ? 'border-green-500 bg-green-500/20 shadow-lg shadow-green-500/20'
                                : 'border-gray-700 bg-gray-800/80'
                            }`}
                          >
                            <span className={`font-display text-2xl font-bold ${
                              isCorrect ? 'text-green-400' : option === 'True' ? 'text-blue-400' : 'text-red-400'
                            }`}>
                              {option}
                            </span>
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Open Ended - Show answer box */}
                {currentQuestion.QuestionType === "open_ended" && showAnswer && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex-shrink-0 p-6 rounded-xl bg-green-500/20 border-2 border-green-500 text-center"
                  >
                    <span className="text-sm text-green-400 uppercase tracking-wider">Correct Answer</span>
                    <p className="text-3xl font-bold text-white mt-2">
                      {currentQuestion.CorrectAnswer}
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ==== ACTIVE BUT NO QUESTION ==== */}
            {isActive && !currentQuestion && (
              <motion.div
                key="no-question"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex items-center justify-center"
              >
                <div className="text-center">
                  <Clock className="h-16 w-16 text-purple-400 mx-auto mb-4 animate-pulse" />
                  <h2 className="font-display text-3xl font-bold text-white mb-2">
                    Get Ready!
                  </h2>
                  <p className="text-gray-400">Next question loading...</p>
                </div>
              </motion.div>
            )}

            {/* ==== COMPLETED STATE ==== */}
            {isCompleted && (
              <motion.div
                key="completed"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex items-center justify-center"
              >
                <div className="text-center">
                  <Trophy className="h-24 w-24 text-yellow-400 mx-auto mb-6" />
                  <h2 className="font-display text-5xl font-bold text-white mb-4">
                    Game Over!
                  </h2>
                  {leaderboard?.entries[0] && (
                    <p className="text-2xl text-gray-400">
                      Winner:{" "}
                      <span className="text-yellow-400 font-bold">
                        {leaderboard.entries[0].TeamName}
                      </span>
                      <span className="text-gray-500 ml-2">
                        ({leaderboard.entries[0].TotalScore} pts)
                      </span>
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ==== BOTTOM BAR: QR Code always visible ==== */}
        {isActive && (
          <div className="flex items-center justify-end px-6 py-3 bg-gray-900/80 backdrop-blur border-t border-gray-800">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-gray-500">Join the game</p>
                <p className="font-display text-lg text-purple-400 tracking-wider">{roomCode}</p>
              </div>
              {qrCodeUrl && (
                <img
                  src={qrCodeUrl}
                  alt="Scan to join"
                  className="w-16 h-16 rounded-lg border border-gray-700"
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* ==== LEADERBOARD SIDEBAR ==== */}
      <div className="hidden lg:flex w-72 xl:w-80 bg-gray-900/90 backdrop-blur border-l border-gray-800 flex-col relative z-10">
        <div className="p-4 border-b border-gray-800">
          <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-400" />
            Leaderboard
          </h3>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {leaderboard?.entries.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No teams yet</p>
            </div>
          ) : (
            leaderboard?.entries.map((entry, index) => {
              const isTop3 = entry.Rank <= 3
              const rankColors = ["text-yellow-400", "text-gray-300", "text-amber-600"]

              return (
                <motion.div
                  key={entry.IDTeam}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center gap-3 p-3 rounded-lg mb-2 ${
                    isTop3
                      ? "bg-yellow-500/10 border border-yellow-500/20"
                      : "bg-gray-800/50"
                  }`}
                >
                  <div className="w-8 text-center flex-shrink-0">
                    {isTop3 ? (
                      <Medal className={`h-5 w-5 mx-auto ${rankColors[entry.Rank - 1]}`} />
                    ) : (
                      <span className="text-gray-500 font-medium">#{entry.Rank}</span>
                    )}
                  </div>
                  <TeamAvatar
                    avatarPath={entry.AvatarBlobPath}
                    teamName={entry.TeamName}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{entry.TeamName}</p>
                    {entry.RoundScore > 0 && (
                      <p className="text-xs text-green-400">+{entry.RoundScore} this round</p>
                    )}
                  </div>
                  <div className="font-display text-xl font-bold text-purple-400 flex-shrink-0">
                    {entry.TotalScore}
                  </div>
                </motion.div>
              )
            })
          )}
        </div>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="absolute bottom-4 left-4 text-gray-600 text-xs space-y-1 z-10">
        <p>F = Fullscreen</p>
        <p>M = Mute</p>
      </div>
    </div>
  )
}

export default function GameBoardPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 bg-gray-950 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      }
    >
      <GameBoardContent />
    </Suspense>
  )
}
