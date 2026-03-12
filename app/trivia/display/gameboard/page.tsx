"use client"

import { useEffect, useState, useRef, Suspense, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import { sessionsApi, episodesApi, getMediaUrl } from "@/lib/api-client"
import { DEFAULT_RULES } from "@/lib/constants"
import { MeshGradient } from "@paper-design/shaders-react"
import { TeamAvatar } from "@/components/game/team-avatar"
import {
  Loader2,
  Trophy,
  Clock,
  Users,
  Medal,
  Coffee,
  Zap,
  Smartphone,
  Target,
  Timer,
} from "lucide-react"
import type {
  Session,
  SessionStatusResponse,
  LeaderboardResponse,
  Question,
  EpisodeWithRounds,
  Team,
  GameState,
} from "@/lib/api-types"

// Animated score counter — smoothly counts up/down when score changes
function AnimatedScore({ score }: { score: number }) {
  const [display, setDisplay] = useState(score)
  const prevRef = useRef(score)

  useEffect(() => {
    const from = prevRef.current
    const to = score
    prevRef.current = score
    if (from === to) return

    const duration = 600
    const start = performance.now()

    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from + (to - from) * eased))
      if (progress < 1) requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  }, [score])

  return (
    <div className="font-display text-xl font-bold text-purple-400 flex-shrink-0 tabular-nums">
      {display}
    </div>
  )
}

function GameBoardContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session")

  const [episode, setEpisode] = useState<EpisodeWithRounds | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [sessionStatus, setSessionStatus] = useState<SessionStatusResponse | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [fullscreenLeaderboard, setFullscreenLeaderboard] = useState(false)
  const [revealedRanks, setRevealedRanks] = useState<number[]>([])

  // Track sequential option reveal with local animation state
  const [revealedOptions, setRevealedOptions] = useState<string[]>([])
  const prevGameStateRef = useRef<GameState | null>(null)
  const prevQuestionIdRef = useRef<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const rulesVideoRef = useRef<HTMLVideoElement>(null)

  // Video frame visibility — toggled by controller
  const [videoFrameHidden, setVideoFrameHidden] = useState(false)

  // Delayed question text reveal after video starts
  const [questionTextRevealed, setQuestionTextRevealed] = useState(false)
  const [isFlipping, setIsFlipping] = useState(false)

  // Derived from server state
  const gameState = sessionStatus?.GameState || null
  const timerRemaining = sessionStatus?.TimerRemaining ?? null
  const timerTotal = sessionStatus?.TimerTotal ?? null

  // Generate QR code URL
  const roomCode = sessionStatus?.RoomCode || session?.RoomCode || ""
  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/play/join?code=${roomCode}`
      : ""
  const qrCodeUrl = roomCode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}&bgcolor=111827&color=ffffff`
    : ""

  // Sequential option reveal animation when entering options_revealed state
  useEffect(() => {
    // Reset options when question changes
    if (currentQuestion?.IDQuestion !== prevQuestionIdRef.current) {
      prevQuestionIdRef.current = currentQuestion?.IDQuestion || null
      setRevealedOptions([])
      setQuestionTextRevealed(false)
    }

    // Trigger sequential reveal when transitioning TO options_revealed
    if (
      gameState === "options_revealed" &&
      prevGameStateRef.current !== "options_revealed" &&
      currentQuestion?.Options
    ) {
      setRevealedOptions([])
      currentQuestion.Options.forEach((opt: string, i: number) => {
        setTimeout(() => {
          setRevealedOptions(prev => [...prev, opt])
        }, (i + 1) * 700) // 700ms stagger
      })
    }

    // Delayed question text reveal when entering video_playing
    if (
      gameState === "video_playing" &&
      prevGameStateRef.current !== "video_playing"
    ) {
      setQuestionTextRevealed(false)
      const timer = setTimeout(() => setQuestionTextRevealed(true), 3000)
      prevGameStateRef.current = gameState
      return () => clearTimeout(timer)
    }

    // Reveal question immediately for non-video states
    if (gameState && gameState !== "video_playing" && !questionTextRevealed) {
      setQuestionTextRevealed(true)
    }

    // X-axis flip animation when transitioning to answer_reveal
    if (
      gameState === "answer_reveal" &&
      prevGameStateRef.current !== "answer_reveal" &&
      currentQuestion?.AnswerVideoUrl
    ) {
      setIsFlipping(true)
      setTimeout(() => setIsFlipping(false), 600)
    }

    prevGameStateRef.current = gameState
  }, [gameState, currentQuestion])

  // Preload upcoming question videos to prevent freezing
  const preloadedVideosRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!currentQuestion || !episode) return

    const videosToPreload: string[] = []

    // Preload current question's videos
    if (currentQuestion.QuestionVideoUrl) {
      const url = getMediaUrl(currentQuestion.QuestionVideoUrl)
      if (url) videosToPreload.push(url)
    }
    if (currentQuestion.AnswerVideoUrl) {
      const url = getMediaUrl(currentQuestion.AnswerVideoUrl)
      if (url) videosToPreload.push(url)
    }

    // Also preload the NEXT question's videos
    if (sessionStatus?.CurrentRound && sessionStatus?.CurrentQuestion) {
      const round = episode.rounds.find(r => r.RoundNumber === sessionStatus.CurrentRound)
      if (round) {
        const nextQ = round.questions.find(q => q.QuestionOrder === (sessionStatus.CurrentQuestion! + 1))
        if (nextQ?.QuestionVideoUrl) {
          const url = getMediaUrl(nextQ.QuestionVideoUrl)
          if (url) videosToPreload.push(url)
        }
        if (nextQ?.AnswerVideoUrl) {
          const url = getMediaUrl(nextQ.AnswerVideoUrl)
          if (url) videosToPreload.push(url)
        }
      }
    }

    // Prefetch each video via hidden <link rel="prefetch"> or fetch API
    videosToPreload.forEach(url => {
      if (preloadedVideosRef.current.has(url)) return
      preloadedVideosRef.current.add(url)

      const link = document.createElement("link")
      link.rel = "prefetch"
      link.as = "video"
      link.href = url
      document.head.appendChild(link)
    })
  }, [currentQuestion, episode, sessionStatus?.CurrentRound, sessionStatus?.CurrentQuestion])

  // Poll for updates — faster during timer_running
  useEffect(() => {
    if (!sessionId) {
      setError("No session ID provided. Add ?session=<id> to URL")
      return
    }

    const fetchData = async () => {
      try {
        const [status, lb, teamsData] = await Promise.all([
          sessionsApi.status(sessionId),
          sessionsApi.leaderboard(sessionId),
          sessionsApi.teams(sessionId),
        ])

        setSessionStatus(status)
        setSession(status)
        setLeaderboard(lb)
        setTeams(teamsData)

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
      } catch (err) {
        console.error("Poll error:", err)
      }
    }

    fetchData()
    // Poll faster during timer_running for smooth countdown
    const pollInterval = gameState === "timer_running" ? 1000 : 2000
    const interval = setInterval(fetchData, pollInterval)
    return () => clearInterval(interval)
  }, [sessionId, episode, gameState])

  // Listen for BroadcastChannel messages from controller
  useEffect(() => {
    if (!sessionId) return
    try {
      const bc = new BroadcastChannel(`trivitime-host-${sessionId}`)
      bc.onmessage = (event) => {
        const { type, rank } = event.data || {}
        switch (type) {
          case "TOGGLE_LEADERBOARD":
            setShowLeaderboard(prev => !prev)
            break
          case "SHOW_FULLSCREEN_LEADERBOARD":
            setFullscreenLeaderboard(true)
            setRevealedRanks([])
            break
          case "REVEAL_RANK":
            if (typeof rank === "number") {
              setRevealedRanks(prev => prev.includes(rank) ? prev : [...prev, rank])
              try {
                const audio = new Audio("/sounds/point-reveal.wav")
                audio.play()
              } catch { /* ignore autoplay errors */ }
            }
            break
          case "EXIT_FULLSCREEN_LEADERBOARD":
            setFullscreenLeaderboard(false)
            setRevealedRanks([])
            break
          case "RULES_VIDEO_PLAY":
            rulesVideoRef.current?.play()
            break
          case "RULES_VIDEO_PAUSE":
            rulesVideoRef.current?.pause()
            break
          case "RULES_VIDEO_RESTART":
            if (rulesVideoRef.current) {
              rulesVideoRef.current.currentTime = 0
              rulesVideoRef.current.play()
            }
            break
          case "QUESTION_VIDEO_PLAY":
            videoRef.current?.play()
            break
          case "QUESTION_VIDEO_PAUSE":
            videoRef.current?.pause()
            break
          case "QUESTION_VIDEO_RESTART":
            if (videoRef.current) {
              videoRef.current.currentTime = 0
              videoRef.current.play()
            }
            break
          case "TOGGLE_VIDEO_FRAME":
            setVideoFrameHidden(prev => !prev)
            break
        }
      }
      return () => bc.close()
    } catch {
      // BroadcastChannel not supported
    }
  }, [sessionId])

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

  const isLobby = gameState === "lobby" || sessionStatus?.Status === "lobby"
  const isCompleted = gameState === "completed" || sessionStatus?.Status === "completed"

  // Get sponsor info from episode - default to gate-logo.png
  const sponsorLogo = episode?.SponsorConfig?.logo || "/gate-logo.png"

  // Get current category
  const currentCategory = currentQuestion?.Category || "General"

  // Video visibility — derived from server GameState (no local toggle needed)
  const hasQuestionVideo = !!currentQuestion?.QuestionVideoUrl
  const hasAnswerVideo = !!currentQuestion?.AnswerVideoUrl
  const showQuestionVideo = hasQuestionVideo &&
    gameState !== "answer_reveal" &&
    (gameState === "video_playing" || gameState === "options_revealed" || gameState === "timer_running" || gameState === "timer_ended")
  const showAnswerVideo = hasAnswerVideo && gameState === "answer_reveal"
  const showAnyVideo = (showQuestionVideo || showAnswerVideo) && !videoFrameHidden
  const isShowingAnswer = gameState === "answer_reveal"

  // States that show question content (after announcement)
  const showQuestionContent = gameState === "video_playing" || gameState === "options_revealed" ||
    gameState === "timer_running" || gameState === "timer_ended" || gameState === "answer_reveal"

  // States that show options
  const showOptions = gameState === "options_revealed" || gameState === "timer_running" ||
    gameState === "timer_ended" || gameState === "answer_reveal"

  // Determine category/header text based on state
  const getHeaderText = () => {
    switch (gameState) {
      case "welcome": return "Welcome"
      case "rules": return "How to Play"
      case "get_ready": return "Get Ready!"
      case "break": return "Break Time"
      case "announced": return currentCategory
      default: return currentCategory
    }
  }

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
      <div className="absolute inset-0 z-0 pointer-events-none">
        <MeshGradient
          colors={["#06fafe", "#1adb00", "#bb00ff", "#003dcc"]}
          distortion={0.24}
          swirl={0.49}
          grainMixer={0}
          grainOverlay={0}
          speed={0.85}
          scale={0.94}
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* ==== TOP BAR ==== */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-900/90 backdrop-blur border-b border-gray-800">
          <div className="flex items-center">
            <img src={sponsorLogo} alt="Sponsor" className="h-10 object-contain" />
          </div>

          <div className="flex-1 flex justify-center">
            <div className="text-center">
              <p className={`text-xl font-display font-bold ${gameState === "break" ? "text-yellow-400" :
                isLobby ? "text-yellow-400" :
                  isCompleted ? "text-green-400" :
                    "text-purple-400"
                }`}>
                {isLobby ? "Waiting for Players" : isCompleted ? "Game Complete" : getHeaderText()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
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
                <div className="flex flex-col items-center gap-8 lg:gap-12 flex-1">
                  <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16 flex-1 justify-center">
                    {roomCode && (
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-gray-900 p-4 rounded-2xl border border-gray-800 shadow-2xl"
                      >
                        <img src={qrCodeUrl} alt="Scan to join" className="w-48 h-48 lg:w-64 lg:h-64" />
                        <p className="text-center text-gray-300 text-sm mt-3">Scan to Play</p>
                      </motion.div>
                    )}
                    <div className="text-center">
                      <p className="text-gray-200 text-lg mb-2">Enter code to join:</p>
                      <p className="font-display text-5xl lg:text-6xl text-purple-400 tracking-[0.3em] mb-4">
                        {roomCode}
                      </p>
                    </div>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="w-full max-w-4xl bg-gray-950/70 backdrop-blur-lg rounded-2xl p-4 border border-gray-700"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="h-5 w-5 text-gray-200" />
                      <span className="text-sm text-gray-200">
                        {teams.length} {teams.length === 1 ? "team" : "teams"} joined
                      </span>
                    </div>
                    {teams.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        <AnimatePresence>
                          {teams.map((t, index) => (
                            <motion.div
                              key={t.IDTeam}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: index * 0.05 }}
                              className="px-3 py-1.5 rounded-full text-sm flex items-center gap-2 bg-gray-800 text-gray-300"
                            >
                              <TeamAvatar avatarPath={t.AvatarBlobPath} teamName={t.TeamName} size="sm" />
                              <span className="truncate max-w-[120px]">{t.TeamName}</span>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm">Waiting for teams to join...</p>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* ==== WELCOME STATE ==== */}
            {gameState === "welcome" && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="flex-1 flex items-center justify-center"
              >
                <div className="text-center flex flex-col items-center gap-6">
                  <motion.div
                    initial={{ y: 40, opacity: 0, scale: 0.8 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, type: "spring", stiffness: 200, damping: 15 }}
                    className="w-[50vw] max-w-[700px]"
                  >
                    <Image src="/trivi-time-logo.png" alt="Trivi Time" width={700} height={200} className="w-full h-auto drop-shadow-2xl" priority />
                  </motion.div>
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.9 }}
                    className="flex flex-col items-center gap-2 mt-2"
                  >
                    <span className="text-lg lg:text-xl text-white font-medium tracking-wider uppercase">presented by</span>
                    <Image src="/gate-logo.png" alt="GATE" width={120} height={56} className="h-10 lg:h-14 w-auto" />
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* ==== RULES STATE ==== */}
            {gameState === "rules" && (
              <motion.div
                key="rules"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                className="flex-1 flex items-center justify-center"
              >
                {/* Use dynamic rules from episode, or fallback to DEFAULT_RULES */}
                {(() => {
                  const rulesContent = episode?.RulesContent?.length ? episode.RulesContent : DEFAULT_RULES
                  const hasVideo = !!episode?.RulesVideoUrl

                  return (
                    <div className={`${hasVideo ? "w-[90vw] flex flex-col items-center gap-4 max-h-full overflow-hidden" : "w-[90vw] mx-auto"}`}>
                      {/* Video Section (if available) — stacked above rules */}
                      {hasVideo && (
                        <div className="flex-shrink-0 w-full flex justify-center">
                          <video
                            ref={rulesVideoRef}
                            src={getMediaUrl(episode?.RulesVideoUrl)!}
                            className="max-h-[35vh] w-auto object-contain rounded-xl border border-gray-700"
                            autoPlay
                            playsInline
                          />
                        </div>
                      )}

                      {/* Rules Text Section */}
                      <div className={`${hasVideo ? "w-full overflow-y-auto max-h-[45vh]" : "w-full"}`}>
                        <div className="flex items-center gap-3 mb-4 justify-center">
                          <h2 className="font-display text-4xl font-bold text-yellow-400 underline" style={{ textShadow: '2px 2px 6px rgba(0,0,0,0.7)' }}>RULES</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                          {(() => {
                            const mid = Math.ceil(rulesContent.length / 2)
                            const leftCol = rulesContent.slice(0, mid)
                            const rightCol = rulesContent.slice(mid)
                            return (
                              <>
                                <div className="space-y-1">
                                  {leftCol.map((rule, i) => (
                                    <motion.div
                                      key={i}
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: 0.15 + i * 0.1 }}
                                      className="py-1.5 px-2 flex items-start gap-3"
                                    >
                                      <span className="flex-shrink-0 font-display text-xl font-bold text-purple-400" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>&gt;</span>
                                      <p className="font-display text-lg text-white leading-snug" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.7)' }}>{rule}</p>
                                    </motion.div>
                                  ))}
                                </div>
                                <div className="space-y-1">
                                  {rightCol.map((rule, i) => (
                                    <motion.div
                                      key={i + mid}
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: 0.15 + (i + mid) * 0.1 }}
                                      className="py-1.5 px-2 flex items-start gap-3"
                                    >
                                      <span className="flex-shrink-0 font-display text-xl font-bold text-purple-400" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>&gt;</span>
                                      <p className="font-display text-lg text-white leading-snug" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.7)' }}>{rule}</p>
                                    </motion.div>
                                  ))}
                                </div>
                              </>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </motion.div>
            )}

            {/* ==== GET READY STATE ==== */}
            {gameState === "get_ready" && (
              <motion.div
                key="get_ready"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="flex-1 flex items-center justify-center"
              >
                <div className="text-center">
                  <h2 className="font-display text-6xl lg:text-8xl font-bold text-white mb-4">
                    Get Ready!
                  </h2>
                  <p className="text-xl text-gray-200">Next question is coming up...</p>
                </div>
              </motion.div>
            )}

            {/* ==== BREAK STATE ==== */}
            {gameState === "break" && (
              <motion.div
                key="break"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex items-center justify-center"
              >
                <div className="text-center">
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                  >
                    <Coffee className="h-20 w-20 text-yellow-400 mx-auto mb-6" />
                  </motion.div>
                  <h2 className="font-display text-6xl lg:text-8xl font-bold text-white mb-4">
                    Break Time
                  </h2>
                  <p className="text-xl text-gray-200">Sit tight — we&apos;ll be right back!</p>
                </div>
              </motion.div>
            )}

            {/* ==== ANNOUNCED STATE ==== */}
            {gameState === "announced" && currentQuestion && (
              <motion.div
                key="announce"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="flex-1 flex items-center justify-center"
              >
                <div className="text-center">
                  <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-2xl text-purple-400 uppercase tracking-[0.3em] mb-4"
                  >
                    Round {sessionStatus?.CurrentRound}
                  </motion.p>
                  <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="font-display text-6xl lg:text-8xl font-bold text-white mb-4"
                  >
                    Question {sessionStatus?.CurrentQuestion}
                  </motion.p>
                  {currentQuestion.Category && (
                    <motion.p
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      className="text-xl text-gray-400"
                    >
                      {currentQuestion.Category}
                    </motion.p>
                  )}
                </div>
              </motion.div>
            )}

            {/* ==== QUESTION CONTENT (video_playing, options_revealed, timer_running, timer_ended, answer_reveal) ==== */}
            {showQuestionContent && currentQuestion && (
              <motion.div
                key="question-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col gap-4"
              >
                {/* Video + Question — Side-by-side layout */}
                <motion.div
                  layout
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="flex-1 flex gap-4 min-h-0"
                >
                  {/* Video Frame — single element, src swaps between question/answer */}
                  <AnimatePresence>
                    {showAnyVideo && (
                      <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: "35%", opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="flex-shrink-0 overflow-hidden"
                        style={{ perspective: "1000px" }}
                      >
                        <motion.div
                          className="h-full rounded-2xl overflow-hidden bg-black border border-gray-800 flex items-center justify-center"
                          animate={isFlipping ? { rotateX: [0, 90, 0] } : { rotateX: 0 }}
                          transition={{ duration: 0.6, ease: "easeInOut" }}
                          style={{ transformStyle: "preserve-3d" }}
                        >
                          <video
                            ref={videoRef}
                            key={showAnswerVideo ? "answer-video" : "question-video"}
                            src={getMediaUrl(showAnswerVideo ? currentQuestion.AnswerVideoUrl : currentQuestion.QuestionVideoUrl)!}
                            className="w-full h-full object-contain"
                            muted={isMuted}
                            autoPlay
                            playsInline
                            preload="auto"
                          />
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Question Text Frame — delayed reveal with typewriter animation */}
                  <motion.div
                    layout
                    className="flex-1 flex flex-col gap-4 min-w-0"
                  >
                    <AnimatePresence>
                      {questionTextRevealed && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5 }}
                          className="bg-gray-900/80 backdrop-blur rounded-2xl p-6 border border-gray-800 flex-1 flex items-center justify-center"
                        >
                          <motion.h2
                            className="font-display text-2xl lg:text-4xl font-bold text-white text-center leading-relaxed"
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                            style={{ overflow: "hidden", whiteSpace: "nowrap" }}
                          >
                            {currentQuestion.QuestionText}
                          </motion.h2>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </motion.div>

                {/* Timer Bar — always visible during question content */}
                <div className="flex-shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Clock className={`h-5 w-5 ${gameState === "timer_ended" ? 'text-red-400' : timerRemaining !== null && timerRemaining <= 5 ? 'text-red-400' : timerRemaining !== null && timerRemaining <= 10 ? 'text-yellow-400' : 'text-purple-400'}`} />
                      <span className={`font-display text-2xl font-bold tabular-nums ${gameState === "timer_ended" ? 'text-red-400' : 'text-white'}`}>
                        {gameState === "timer_ended" ? "TIME'S UP!" : gameState === "timer_running" ? `${timerRemaining ?? 0}s` : `${timerTotal ?? 0}s`}
                      </span>
                    </div>
                    <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${gameState === "timer_ended" || (timerRemaining !== null && timerRemaining <= 5)
                          ? 'bg-red-500'
                          : timerRemaining !== null && timerRemaining <= 10
                            ? 'bg-yellow-500'
                            : 'bg-purple-500'
                          }`}
                        animate={{ width: `${gameState === "timer_ended" ? 0 : gameState === "timer_running" && timerTotal && timerRemaining !== null ? (timerRemaining / timerTotal) * 100 : 100}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                </div>
                {/* Answer Options — Sequential Reveal */}
                {(() => {
                  const isTrueFalse = currentQuestion.QuestionType === "true_false" ||
                    (currentQuestion.Options?.length === 2 &&
                      currentQuestion.Options.every(o => ["True", "False"].includes(o)))
                  const isMCQ = currentQuestion.QuestionType === "multiple_choice" && !isTrueFalse

                  if (!showOptions) return null

                  return (
                    <>
                      {/* MCQ Grid — staggered reveal */}
                      {isMCQ && currentQuestion.Options && (
                        <div className="flex-shrink-0">
                          <div className={`grid gap-3 ${currentQuestion.Options.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                            {currentQuestion.Options.map((option, i) => {
                              const isCorrect = isShowingAnswer && option === currentQuestion.CorrectAnswer
                              const letter = String.fromCharCode(65 + i)
                              const isRevealed = revealedOptions.includes(option) ||
                                gameState !== "options_revealed" // Show all if past reveal phase

                              return (
                                <AnimatePresence key={i}>
                                  {isRevealed && (
                                    <motion.div
                                      initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                      className={`p-4 rounded-xl border-2 transition-colors duration-300 ${isCorrect
                                        ? 'border-green-500 bg-green-600/50 backdrop-blur-sm shadow-lg shadow-green-500/30'
                                        : 'border-gray-700 bg-gray-800/80 hover:border-gray-600'
                                        }`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <span className={`w-10 h-10 rounded-lg flex items-center justify-center font-display font-bold text-xl flex-shrink-0 ${isCorrect ? 'bg-green-500 text-white' : 'bg-purple-600/30 text-purple-400'
                                          }`}>
                                          {letter}
                                        </span>
                                        <span className="font-display text-xl font-semibold text-white flex-1 text-center">{option}</span>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* True/False */}
                      {isTrueFalse && (
                        <div className="flex-shrink-0">
                          <div className="grid grid-cols-2 gap-4">
                            {["True", "False"].map((option, i) => {
                              const isCorrect = isShowingAnswer && option === currentQuestion.CorrectAnswer
                              const isRevealed = revealedOptions.includes(option) || revealedOptions.length >= 2 ||
                                gameState !== "options_revealed"

                              return (
                                <AnimatePresence key={option}>
                                  {isRevealed && (
                                    <motion.div
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: i * 0.1 }}
                                      className={`p-6 rounded-xl border-2 text-center transition-colors duration-300 ${isCorrect
                                        ? 'border-green-500 bg-green-600/50 backdrop-blur-sm shadow-lg shadow-green-500/30'
                                        : 'border-gray-700 bg-gray-800/80'
                                        }`}
                                    >
                                      <span className={`font-display text-2xl font-bold ${isCorrect ? 'text-green-400' : option === 'True' ? 'text-blue-400' : 'text-red-400'
                                        }`}>
                                        {option}
                                      </span>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )
                })()}

                {/* Open Ended - Show answer box */}
                {currentQuestion.QuestionType === "open_ended" && isShowingAnswer && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex-shrink-0 p-6 rounded-xl bg-green-800/40 backdrop-blur-sm border-2 border-green-500 text-center shadow-lg shadow-green-500/30"
                  >
                    <span className="text-sm text-green-400 uppercase tracking-wider">Correct Answer</span>
                    <p className="text-3xl font-bold text-white mt-2">
                      {currentQuestion.CorrectAnswer}
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ==== ACTIVE BUT NO QUESTION YET ==== */}
            {sessionStatus?.Status === "active" && !currentQuestion && !["welcome", "rules", "get_ready", "break", "lobby"].includes(gameState || "") && (
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
                  <p className="text-gray-200">Next question loading...</p>
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

        {/* ==== BOTTOM BAR: QR Code always visible during active ==== */}
        {sessionStatus?.Status === "active" && (
          <div className="flex items-center justify-between px-6 py-3 bg-gray-900/80 backdrop-blur border-t border-gray-800">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>Round {sessionStatus?.CurrentRound}</span>
              <span className="text-gray-600">•</span>
              <span>Q{sessionStatus?.CurrentQuestion}</span>
            </div>
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
      <AnimatePresence>
        {gameState !== "welcome" && showLeaderboard && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "auto", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="hidden lg:flex bg-gray-900/90 backdrop-blur border-l border-gray-800 flex-col relative z-10 overflow-hidden"
          >
            <div className="w-72 xl:w-80 flex flex-col h-full">
              <div className="p-5 border-b border-gray-800">
                <h3 className="font-display text-2xl font-bold text-white flex items-center gap-2">
                  <Trophy className="h-8 w-8 text-yellow-400" />
                  Leaderboard
                </h3>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {leaderboard?.entries.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No scores submitted yet</p>
                  </div>
                ) : (
                  leaderboard?.entries.map((entry) => {
                    const isTop3 = entry.Rank <= 3
                    const rankColors = ["text-yellow-400", "text-gray-300", "text-amber-600"]

                    return (
                      <motion.div
                        key={entry.IDTeam}
                        layout
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className={`flex items-center gap-3 p-3 rounded-lg mb-2 ${isTop3
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
                        </div>
                        <AnimatedScore score={entry.TotalScore} />
                      </motion.div>
                    )
                  })
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==== FULLSCREEN LEADERBOARD REVEAL OVERLAY ==== */}
      <AnimatePresence>
        {fullscreenLeaderboard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-gray-950 flex flex-col"
          >
            {/* Background */}
            <div className="absolute inset-0 z-0 pointer-events-none">
              <MeshGradient
                colors={["#06fafe", "#1adb00", "#bb00ff", "#003dcc"]}
                distortion={0.24}
                swirl={0.49}
                grainMixer={0}
                grainOverlay={0}
                speed={0.85}
                scale={0.94}
                style={{ width: "100%", height: "100%" }}
              />
            </div>

            {/* Header */}
            <div className="relative z-10 flex items-center justify-center py-8">
              <motion.div
                initial={{ y: -30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center"
              >
                <h1 className="font-display text-5xl lg:text-7xl font-bold bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 bg-clip-text text-transparent drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]" style={{ textShadow: '0 4px 12px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.4)' }}>
                  Leaderboard
                </h1>
              </motion.div>
            </div>

            {/* Rankings List */}
            <div className="relative z-10 flex-1 overflow-auto px-8 lg:px-24 pb-8">
              <div className="max-w-3xl mx-auto space-y-3">
                {leaderboard?.entries
                  .slice()
                  .sort((a, b) => a.Rank - b.Rank)
                  .map((entry) => {
                    const isRevealed = revealedRanks.includes(entry.Rank)
                    const isTop3 = entry.Rank <= 3
                    const rankColors = ["text-yellow-400", "text-gray-300", "text-amber-600"]
                    const bgColors = [
                      "bg-yellow-500/15 border-yellow-500/30",
                      "bg-gray-400/10 border-gray-400/20",
                      "bg-amber-600/10 border-amber-600/20",
                    ]

                    return (
                      <div key={entry.IDTeam} className="relative">
                        <AnimatePresence>
                          {isRevealed ? (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8, y: 20 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              transition={{ type: "spring", stiffness: 200, damping: 20 }}
                              className={`flex items-center gap-4 p-5 rounded-2xl border-2 shadow-[0_8px_32px_rgba(0,0,0,0.5),0_4px_12px_rgba(0,0,0,0.3)] ${isTop3 ? bgColors[entry.Rank - 1] : "bg-gray-800/60 border-gray-700/50"
                                }`}
                            >
                              <div className="w-14 text-center flex-shrink-0">
                                {isTop3 ? (
                                  <Medal className={`h-8 w-8 mx-auto ${rankColors[entry.Rank - 1]}`} />
                                ) : (
                                  <span className="text-2xl font-display font-bold text-gray-400">#{entry.Rank}</span>
                                )}
                              </div>
                              <TeamAvatar
                                avatarPath={entry.AvatarBlobPath}
                                teamName={entry.TeamName}
                                size="lg"
                              />
                              <div className="flex-1 min-w-0">
                                <p className={`font-display text-2xl font-bold truncate ${isTop3 ? "text-white" : "text-gray-200"}`} style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                                  {entry.TeamName}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <span className={`font-display text-3xl font-bold ${isTop3 ? rankColors[entry.Rank - 1] : "text-purple-400"}`} style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                                  {entry.TotalScore}
                                </span>
                                <p className="text-xs text-gray-500 uppercase tracking-wider" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>pts</p>
                              </div>
                            </motion.div>
                          ) : (
                            <motion.div
                              className="flex items-center gap-4 p-5 rounded-2xl border-2 border-gray-800/50 bg-gray-900/40"
                            >
                              <div className="w-14 text-center flex-shrink-0">
                                <span className="text-2xl font-display font-bold text-gray-600">#{entry.Rank}</span>
                              </div>
                              <div className="flex-1 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-800 animate-pulse" />
                                <div className="h-6 bg-gray-800 rounded-lg animate-pulse" style={{ width: "40%" }} />
                              </div>
                              <div className="w-16 h-8 bg-gray-800 rounded-lg animate-pulse" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
