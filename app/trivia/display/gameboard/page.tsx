"use client"

import { useEffect, useState, useRef, Suspense, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import {
  sessionsApi,
  episodesApi,
  getMediaUrl,
  setHostToken,
  getHostSessionTokenBridge,
  ApiClientError,
} from "@/lib/api-client"
import { useSessionStatusWebSocket } from "@/hooks/use-session-status-websocket"
import { DEFAULT_RULES } from "@/lib/constants"
import dynamic from "next/dynamic"
const MeshGradient = dynamic(() => import("@paper-design/shaders-react").then(mod => mod.MeshGradient), { ssr: false })
import { TeamAvatar } from "@/components/game/team-avatar"
import { getAvatarValue } from "@/lib/frontend-avatars"
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

const OPTIMISTIC_GAMEBOARD_STATES: GameState[] = [
  "lobby",
  "welcome",
  "rules",
  "get_ready",
  "announced",
  "video_playing",
  "options_revealed",
  "timer_running",
  "timer_ended",
  "answer_reveal",
  "break",
  "completed",
]

const isGameStateValue = (value: unknown): value is GameState => {
  return typeof value === "string" && OPTIMISTIC_GAMEBOARD_STATES.includes(value as GameState)
}

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

// Typewriter text — reveals characters one by one with a blinking cursor
function TypewriterText({ text, className, speed = 35 }: { text: string; className?: string; speed?: number }) {
  const [visibleChars, setVisibleChars] = useState(0)
  const prevTextRef = useRef(text)

  useEffect(() => {
    // Reset when text changes
    if (text !== prevTextRef.current) {
      setVisibleChars(0)
      prevTextRef.current = text
    }

    if (visibleChars >= text.length) return

    const timer = setInterval(() => {
      setVisibleChars(prev => {
        if (prev >= text.length) {
          clearInterval(timer)
          return prev
        }
        return prev + 1
      })
    }, speed)

    return () => clearInterval(timer)
  }, [text, visibleChars, speed])

  const isComplete = visibleChars >= text.length

  return (
    <span className={className}>
      {text.slice(0, visibleChars)}
      {!isComplete && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
          className="inline-block w-[3px] h-[1em] bg-purple-400 ml-1 align-middle"
        />
      )}
    </span>
  )
}

function getTextSizeClass(text: string): string {
  const length = text.length

  if (length < 100) {
    return "text-2xl lg:text-5xl leading-relaxed"
  }
  if (length < 180) {
    return "text-xl lg:text-4xl leading-normal"
  }
  if (length < 280) {
    return "text-lg lg:text-3xl leading-snug"
  }
  if (length < 400) {
    return "text-base lg:text-2xl leading-tight"
  }

  return "text-sm lg:text-xl leading-tight"
}

function mergeQuestionFields(primary: Question | null, fallback: Question | null): Question | null {
  if (!primary) return fallback
  if (!fallback) return primary

  return {
    ...primary,
    Category: primary.Category?.trim() ? primary.Category : fallback.Category,
    QuestionText: primary.QuestionText?.trim() ? primary.QuestionText : fallback.QuestionText,
    CorrectAnswer: primary.CorrectAnswer?.trim() ? primary.CorrectAnswer : fallback.CorrectAnswer,
    Options: Array.isArray(primary.Options) && primary.Options.length > 0 ? primary.Options : fallback.Options,
    QuestionVideoUrl: primary.QuestionVideoUrl || fallback.QuestionVideoUrl,
    AnswerVideoUrl: primary.AnswerVideoUrl || fallback.AnswerVideoUrl,
    Notes: Array.isArray(primary.Notes) && primary.Notes.length > 0 ? primary.Notes : fallback.Notes,
  }
}

function GameBoardContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session")
  const roomCodeFromQuery = searchParams.get("room")

  const [episode, setEpisode] = useState<EpisodeWithRounds | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [sessionStatus, setSessionStatus] = useState<SessionStatusResponse | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resolvedRoomCode, setResolvedRoomCode] = useState<string | null>(roomCodeFromQuery)
  const [roomResolveAttempted, setRoomResolveAttempted] = useState(false)
  const [hostAuthHydrated, setHostAuthHydrated] = useState(false)
  const {
    status: realtimeStatus,
    lastEvent: realtimeEvent,
    isConnected: isRealtimeConnected,
  } = useSessionStatusWebSocket(resolvedRoomCode, {
    enabled: !!resolvedRoomCode,
  })
  const [isMuted, setIsMuted] = useState(false)
  const [isBoardActivated, setIsBoardActivated] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [fullscreenLeaderboard, setFullscreenLeaderboard] = useState(false)
  const [revealedRanks, setRevealedRanks] = useState<number[]>([])
  const [optimisticGameboardUpdate, setOptimisticGameboardUpdate] = useState<{
    actionId: string
    gameState: GameState
    currentRound: number | null
    currentQuestion: number | null
    question: Question | null
    expiresAt: number
  } | null>(null)
  const [controllerQuestionFallback, setControllerQuestionFallback] = useState<{
    currentRound: number | null
    currentQuestion: number | null
    question: Question
  } | null>(null)
  const [controllerBrandingFallback, setControllerBrandingFallback] = useState<{
    sponsorshipImagePath: string | null
    sponsorshipVideoPath: string | null
    episodeTitle: string | null
  } | null>(null)

  // Track sequential option reveal with local animation state
  const [revealedOptions, setRevealedOptions] = useState<string[]>([])
  const prevGameStateRef = useRef<GameState | null>(null)
  const prevQuestionIdRef = useRef<string | null>(null)
  const prevBoardCursorRef = useRef<string | null>(null)
  const episodeAuthRetryKeyRef = useRef<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const rulesVideoRef = useRef<HTMLVideoElement>(null)
  const sponsorVideoRef = useRef<HTMLVideoElement>(null)

  const attemptMediaPlay = useCallback((mediaElement: HTMLVideoElement | null) => {
    if (!mediaElement) return
    const playPromise = mediaElement.play()
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        // Ignore autoplay policy errors until activation click happens.
      })
    }
  }, [])

  const handleActivateBoard = useCallback(() => {
    setIsBoardActivated(true)
    window.setTimeout(() => {
      attemptMediaPlay(videoRef.current)
      attemptMediaPlay(rulesVideoRef.current)
      attemptMediaPlay(sponsorVideoRef.current)
    }, 80)
  }, [attemptMediaPlay])

  // Video frame visibility — toggled by controller
  const [videoFrameHidden, setVideoFrameHidden] = useState(false)

  // Delayed question text reveal after video starts
  const [questionTextRevealed, setQuestionTextRevealed] = useState(false)
  const [isFlipping, setIsFlipping] = useState(false)

  // Buffer page — shown after last question before ending game
  const [bufferPageVisible, setBufferPageVisible] = useState(false)

  useEffect(() => {
    setResolvedRoomCode(roomCodeFromQuery)
    setRoomResolveAttempted(false)
  }, [roomCodeFromQuery, sessionId])

  useEffect(() => {
    setHostAuthHydrated(false)
    setControllerBrandingFallback(null)

    if (!sessionId) {
      setHostAuthHydrated(true)
      return
    }

    const bridgedHostToken = getHostSessionTokenBridge(sessionId)
    if (bridgedHostToken) {
      setHostToken(bridgedHostToken)
    }

    setHostAuthHydrated(true)
  }, [sessionId])

  // Bootstrap status once per session to warm room code + optional metadata (rules/category).
  useEffect(() => {
    if (!sessionId) {
      setError("No session ID provided. Add ?session=<id> to URL")
      return
    }

    if (roomResolveAttempted) return

    setRoomResolveAttempted(true)

    const resolveRoomCode = async () => {
      try {
        const status = await sessionsApi.status(sessionId)
        setResolvedRoomCode(status.RoomCode)
        setSessionStatus((prev) => ({
          ...(prev ?? status),
          ...status,
        }))
        setSession(status)
        setError(null)
      } catch (err) {
        console.error("Failed to bootstrap session status:", err)
      }
    }

    void resolveRoomCode()
  }, [sessionId, roomResolveAttempted])

  useEffect(() => {
    if (!realtimeStatus) return

    setSessionStatus((prev) => ({
      ...(prev ?? realtimeStatus),
      ...realtimeStatus,
    }))
    setSession(realtimeStatus)
    setError(null)
  }, [realtimeStatus])

  // Derived from server state with optimistic controller override for viewer-only updates.
  const gameState = optimisticGameboardUpdate?.gameState || sessionStatus?.GameState || null

  // Reset buffer page when game state changes (e.g. question reset)
  useEffect(() => {
    if (gameState !== "answer_reveal") {
      setBufferPageVisible(false)
    }
  }, [gameState])
  const effectiveCurrentRound = optimisticGameboardUpdate?.currentRound ?? sessionStatus?.CurrentRound ?? null
  const effectiveCurrentQuestion = optimisticGameboardUpdate?.currentQuestion ?? sessionStatus?.CurrentQuestion ?? null
  const timerRemaining = sessionStatus?.TimerRemaining ?? null
  const timerTotal = sessionStatus?.TimerTotal ?? null

  // Also reset buffer when host navigates to a different question cursor.
  useEffect(() => {
    const cursorKey = `${effectiveCurrentRound ?? "none"}:${effectiveCurrentQuestion ?? "none"}:${currentQuestion?.IDQuestion ?? "none"}`
    const prevCursorKey = prevBoardCursorRef.current

    if (prevCursorKey && prevCursorKey !== cursorKey) {
      setBufferPageVisible(false)
    }

    prevBoardCursorRef.current = cursorKey
  }, [effectiveCurrentRound, effectiveCurrentQuestion, currentQuestion?.IDQuestion])

  // WS payload includes question data in realtime updates; normalize it as fallback
  const statusQuestion = useMemo(() => {
    const rawQuestion = (sessionStatus as (SessionStatusResponse & { question?: unknown }) | null)?.question
    if (!rawQuestion || typeof rawQuestion !== "object") return null

    const raw = rawQuestion as Record<string, unknown>
    const rawOptions = raw.Options ?? raw.options
    const options = Array.isArray(rawOptions)
      ? rawOptions.filter((value): value is string => typeof value === "string")
      : null

    const rawQuestionType = raw.QuestionType ?? raw.question_type
    const questionType: Question["QuestionType"] =
      rawQuestionType === "multiple_choice" ||
        rawQuestionType === "true_false" ||
        rawQuestionType === "open_ended"
        ? rawQuestionType
        : options?.length === 2 && options.every((opt) => opt === "True" || opt === "False")
          ? "true_false"
          : "multiple_choice"

    return {
      IDQuestion: typeof raw.IDQuestion === "string" ? raw.IDQuestion : "",
      IDRound: typeof raw.IDRound === "string" ? raw.IDRound : "",
      QuestionOrder: typeof raw.QuestionOrder === "number"
        ? raw.QuestionOrder
        : (effectiveCurrentQuestion ?? 0),
      Category: typeof raw.Category === "string"
        ? raw.Category
        : typeof raw.category === "string"
          ? raw.category
          : null,
      QuestionText: typeof raw.QuestionText === "string"
        ? raw.QuestionText
        : typeof raw.question_text === "string"
          ? raw.question_text
          : "",
      QuestionType: questionType,
      CorrectAnswer: typeof raw.CorrectAnswer === "string"
        ? raw.CorrectAnswer
        : typeof raw.correct_answer === "string"
          ? raw.correct_answer
          : "",
      Options: options,
      QuestionVideoUrl: typeof raw.QuestionVideoUrl === "string"
        ? raw.QuestionVideoUrl
        : typeof raw.question_video_url === "string"
          ? raw.question_video_url
          : null,
      AnswerVideoUrl: typeof raw.AnswerVideoUrl === "string"
        ? raw.AnswerVideoUrl
        : typeof raw.answer_video_url === "string"
          ? raw.answer_video_url
          : null,
      TimerSecondsOverride: typeof raw.TimerSecondsOverride === "number" ? raw.TimerSecondsOverride : null,
      ScoringModeOverride: null,
      Notes: null,
    } as Question
  }, [sessionStatus, effectiveCurrentQuestion])

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
    if (effectiveCurrentRound !== null && effectiveCurrentQuestion !== null) {
      const round = episode.rounds.find(r => r.RoundNumber === effectiveCurrentRound)
      if (round) {
        const nextQ = round.questions.find(q => q.QuestionOrder === (effectiveCurrentQuestion + 1))
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
  }, [currentQuestion, episode, effectiveCurrentRound, effectiveCurrentQuestion])

  // Keep leaderboard and teams in sync when pushed state changes.
  useEffect(() => {
    if (!sessionId || !sessionStatus) return

    const syncFromStatus = async () => {
      try {
        const [lb, teamsData] = await Promise.all([
          sessionsApi.leaderboard(sessionId),
          sessionsApi.teams(sessionId),
        ])

        setLeaderboard(lb)
        setTeams(teamsData)
      } catch (err) {
        console.error("Realtime sync error:", err)
      }
    }

    void syncFromStatus()
  }, [
    sessionId,
    sessionStatus?.Status,
    sessionStatus?.CurrentRound,
    sessionStatus?.CurrentQuestion,
    sessionStatus?.GameState,
    sessionStatus?.team_count,
  ])

  // Team joins/leaves can come as separate websocket events from status updates.
  useEffect(() => {
    if (!sessionId || !realtimeEvent) return

    const eventName = typeof realtimeEvent.event === "string" ? realtimeEvent.event.toLowerCase() : ""
    if (!eventName.includes("team")) return

    void sessionsApi
      .teams(sessionId)
      .then((teamsData) => {
        setTeams(teamsData)
      })
      .catch((err) => {
        console.error("Team event sync error:", err)
      })
  }, [sessionId, realtimeEvent])

  // Fallback: keep lobby teams fresh even when status frames are sparse.
  useEffect(() => {
    if (!sessionId) return

    const shouldPollTeams = !isRealtimeConnected || !sessionStatus || sessionStatus.Status === "lobby"
    if (!shouldPollTeams) return

    const pollTeams = async () => {
      try {
        const teamsData = await sessionsApi.teams(sessionId)
        setTeams(teamsData)
      } catch (err) {
        console.error("Teams fallback poll error:", err)
      }
    }

    void pollTeams()
    const interval = window.setInterval(() => {
      void pollTeams()
    }, 1000)

    return () => window.clearInterval(interval)
  }, [sessionId, sessionStatus?.Status, isRealtimeConnected])

  useEffect(() => {
    if (!hostAuthHydrated || !sessionStatus?.IDEpisode) return
    if (episode?.IDEpisode === sessionStatus.IDEpisode) return

    const loadEpisode = async () => {
      try {
        const ep = await episodesApi.get(sessionStatus.IDEpisode)
        setEpisode(ep)
        episodeAuthRetryKeyRef.current = null
      } catch (err) {
        const statusCode = err instanceof ApiClientError ? err.status : null
        const retryKey = `${sessionStatus.IDEpisode}:${statusCode ?? "unknown"}`

        const shouldRetryAuth =
          (statusCode === 401 || statusCode === 403) &&
          sessionId !== null &&
          episodeAuthRetryKeyRef.current !== retryKey

        if (shouldRetryAuth) {
          episodeAuthRetryKeyRef.current = retryKey

          const bridgedHostToken = getHostSessionTokenBridge(sessionId)
          if (bridgedHostToken) {
            setHostToken(bridgedHostToken)
            try {
              const retryEpisode = await episodesApi.get(sessionStatus.IDEpisode)
              setEpisode(retryEpisode)
              return
            } catch (retryErr) {
              if (process.env.NODE_ENV !== "production") {
                console.debug("[Gameboard] Episode retry failed", retryErr)
              }
            }
          }
        }

        if (process.env.NODE_ENV !== "production") {
          console.debug("[Gameboard] Episode details unavailable for display client", {
            statusCode,
            hasSessionId: !!sessionId,
          })
        }
      }
    }

    void loadEpisode()
  }, [hostAuthHydrated, sessionStatus?.IDEpisode, episode?.IDEpisode, sessionId])

  useEffect(() => {
    if (effectiveCurrentRound === null || effectiveCurrentQuestion === null) {
      setControllerQuestionFallback(null)
      return
    }

    setControllerQuestionFallback((previous) => {
      if (!previous) return previous
      if (
        previous.currentRound === effectiveCurrentRound &&
        previous.currentQuestion === effectiveCurrentQuestion
      ) {
        return previous
      }
      return null
    })
  }, [effectiveCurrentRound, effectiveCurrentQuestion])

  useEffect(() => {
    const optimisticQuestion = optimisticGameboardUpdate?.question || null
    const controllerQuestion =
      controllerQuestionFallback &&
      controllerQuestionFallback.currentRound === effectiveCurrentRound &&
      controllerQuestionFallback.currentQuestion === effectiveCurrentQuestion
        ? controllerQuestionFallback.question
        : null
    const optimisticOrControllerQuestion = mergeQuestionFields(
      optimisticQuestion || controllerQuestion,
      controllerQuestion || optimisticQuestion
    )
    const fallbackQuestion = mergeQuestionFields(optimisticOrControllerQuestion, statusQuestion)

    if (effectiveCurrentRound === null || effectiveCurrentQuestion === null) {
      setCurrentQuestion(null)
      return
    }

    if (!episode) {
      setCurrentQuestion(fallbackQuestion)
      return
    }

    const round = episode.rounds.find((r) => r.RoundNumber === effectiveCurrentRound)
    if (!round) {
      setCurrentQuestion(fallbackQuestion)
      return
    }

    const question = round.questions.find((q) => q.QuestionOrder === effectiveCurrentQuestion)
    setCurrentQuestion(mergeQuestionFields(question || null, fallbackQuestion))
  }, [
    controllerQuestionFallback,
    episode,
    effectiveCurrentRound,
    effectiveCurrentQuestion,
    optimisticGameboardUpdate?.question,
    statusQuestion,
  ])

  useEffect(() => {
    if (!optimisticGameboardUpdate) return

    const remainingMs = optimisticGameboardUpdate.expiresAt - Date.now()
    if (remainingMs <= 0) {
      setOptimisticGameboardUpdate(null)
      return
    }

    const timeoutId = window.setTimeout(() => {
      setOptimisticGameboardUpdate((previous) => {
        if (!previous) return previous
        return previous.actionId === optimisticGameboardUpdate.actionId ? null : previous
      })
    }, remainingMs)

    return () => window.clearTimeout(timeoutId)
  }, [optimisticGameboardUpdate])

  useEffect(() => {
    if (!optimisticGameboardUpdate || !sessionStatus) return

    const matchesState = sessionStatus.GameState === optimisticGameboardUpdate.gameState
    const matchesRound =
      optimisticGameboardUpdate.currentRound === null ||
      sessionStatus.CurrentRound === optimisticGameboardUpdate.currentRound
    const matchesQuestion =
      optimisticGameboardUpdate.currentQuestion === null ||
      sessionStatus.CurrentQuestion === optimisticGameboardUpdate.currentQuestion

    if (matchesState && matchesRound && matchesQuestion) {
      setOptimisticGameboardUpdate(null)
    }
  }, [
    optimisticGameboardUpdate,
    sessionStatus,
    sessionStatus?.CurrentRound,
    sessionStatus?.CurrentQuestion,
    sessionStatus?.GameState,
  ])

  // Listen for BroadcastChannel messages from controller
  useEffect(() => {
    if (!sessionId) return
    try {
      const bc = new BroadcastChannel(`trivitime-host-${sessionId}`)
      bc.onmessage = (event) => {
        const {
          type,
          rank,
          teams: incomingTeams,
          actionId,
          gameState: optimisticState,
          currentRound: optimisticRound,
          currentQuestion: optimisticQuestionNumber,
          question: optimisticQuestionPayload,
          sponsorshipImage,
          sponsorshipVideoUrl,
          episodeTitle,
          ttlMs,
        } = event.data || {}
        switch (type) {
          case "OPTIMISTIC_GAMEBOARD_UPDATE": {
            if (!isGameStateValue(optimisticState) || typeof actionId !== "string" || !actionId) {
              break
            }

            const parsedRound = typeof optimisticRound === "number" ? optimisticRound : null
            const parsedQuestion = typeof optimisticQuestionNumber === "number" ? optimisticQuestionNumber : null
            const parsedQuestionPayload =
              optimisticQuestionPayload && typeof optimisticQuestionPayload === "object"
                ? (optimisticQuestionPayload as Question)
                : null
            const boundedTtlMs =
              typeof ttlMs === "number" && Number.isFinite(ttlMs)
                ? Math.min(15000, Math.max(1500, ttlMs))
                : 7000

            setOptimisticGameboardUpdate({
              actionId,
              gameState: optimisticState,
              currentRound: parsedRound,
              currentQuestion: parsedQuestion,
              question: parsedQuestionPayload,
              expiresAt: Date.now() + boundedTtlMs,
            })
            if (parsedQuestionPayload) {
              setControllerQuestionFallback({
                currentRound: parsedRound,
                currentQuestion: parsedQuestion,
                question: parsedQuestionPayload,
              })
            }
            break
          }
          case "CLEAR_OPTIMISTIC_GAMEBOARD_UPDATE":
            if (typeof actionId !== "string" || !actionId) {
              break
            }
            setOptimisticGameboardUpdate((previous) => {
              if (!previous) return previous
              return previous.actionId === actionId ? null : previous
            })
            break
          case "SYNC_TEAMS":
            if (Array.isArray(incomingTeams)) {
              const normalizedTeams = incomingTeams
                .filter(
                  (candidate): candidate is Team =>
                    !!candidate &&
                    typeof candidate === "object" &&
                    typeof candidate.IDTeam === "string" &&
                    typeof candidate.IDGameSession === "string" &&
                    typeof candidate.TeamName === "string" &&
                    typeof candidate.JoinedAt === "string" &&
                    (
                      candidate.AvatarBlobPath === undefined ||
                      candidate.AvatarBlobPath === null ||
                      typeof candidate.AvatarBlobPath === "string"
                    ) &&
                    (
                      candidate.AvatarBase64 === undefined ||
                      candidate.AvatarBase64 === null ||
                      typeof candidate.AvatarBase64 === "string"
                    )
                )
                .map((candidate) => ({
                  ...candidate,
                  AvatarBlobPath: getAvatarValue(candidate),
                }))
              setTeams(normalizedTeams)
            }
            break
          case "SYNC_BRANDING": {
            const normalizedSponsorshipImage =
              typeof sponsorshipImage === "string" && sponsorshipImage.trim().length > 0
                ? sponsorshipImage
                : null
            const normalizedSponsorshipVideo =
              typeof sponsorshipVideoUrl === "string" && sponsorshipVideoUrl.trim().length > 0
                ? sponsorshipVideoUrl
                : null
            const normalizedEpisodeTitle =
              typeof episodeTitle === "string" && episodeTitle.trim().length > 0
                ? episodeTitle
                : null

            setControllerBrandingFallback((previous) => {
              if (
                previous?.sponsorshipImagePath === normalizedSponsorshipImage &&
                previous?.sponsorshipVideoPath === normalizedSponsorshipVideo &&
                previous?.episodeTitle === normalizedEpisodeTitle
              ) {
                return previous
              }

              return {
                sponsorshipImagePath: normalizedSponsorshipImage,
                sponsorshipVideoPath: normalizedSponsorshipVideo,
                episodeTitle: normalizedEpisodeTitle,
              }
            })
            break
          }
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
            attemptMediaPlay(rulesVideoRef.current)
            break
          case "RULES_VIDEO_PAUSE":
            rulesVideoRef.current?.pause()
            break
          case "RULES_VIDEO_RESTART":
            if (rulesVideoRef.current) {
              rulesVideoRef.current.currentTime = 0
              attemptMediaPlay(rulesVideoRef.current)
            }
            break
          case "QUESTION_VIDEO_PLAY":
            attemptMediaPlay(videoRef.current)
            break
          case "QUESTION_VIDEO_PAUSE":
            videoRef.current?.pause()
            break
          case "QUESTION_VIDEO_RESTART":
            if (videoRef.current) {
              videoRef.current.currentTime = 0
              attemptMediaPlay(videoRef.current)
            }
            break
          case "SPONSOR_VIDEO_PLAY":
            attemptMediaPlay(sponsorVideoRef.current)
            break
          case "SPONSOR_VIDEO_PAUSE":
            sponsorVideoRef.current?.pause()
            break
          case "SPONSOR_VIDEO_RESTART":
            if (sponsorVideoRef.current) {
              sponsorVideoRef.current.currentTime = 0
              attemptMediaPlay(sponsorVideoRef.current)
            }
            break
          case "TOGGLE_VIDEO_FRAME":
            setVideoFrameHidden(prev => !prev)
            break
          case "SHOW_BUFFER_PAGE":
            setBufferPageVisible(true)
            break
          case "EXIT_BUFFER_PAGE":
            setBufferPageVisible(false)
            break
        }
      }
      return () => bc.close()
    } catch {
      // BroadcastChannel not supported
    }
  }, [attemptMediaPlay, sessionId])

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

  const statusPayload = sessionStatus as (SessionStatusResponse & {
    current_category?: string | null
    question_category?: string | null
    category?: string | null
    rules_content?: unknown
    rules_video_url?: string | null
    sponsorship_image?: string | null
    sponsorship_video_url?: string | null
  }) | null

  const statusRulesContent = Array.isArray(sessionStatus?.RulesContent)
    ? sessionStatus.RulesContent.filter((rule): rule is string => typeof rule === "string")
    : Array.isArray(statusPayload?.rules_content)
      ? statusPayload.rules_content.filter((rule): rule is string => typeof rule === "string")
      : null
  const episodeRulesContent = Array.isArray(episode?.RulesContent)
    ? episode.RulesContent.filter((rule): rule is string => typeof rule === "string")
    : null
  const resolvedRulesContent =
    statusRulesContent?.length
      ? statusRulesContent
      : episodeRulesContent?.length
        ? episodeRulesContent
        : DEFAULT_RULES
  const resolvedRulesVideoPath =
    sessionStatus?.RulesVideoUrl || statusPayload?.rules_video_url || episode?.RulesVideoUrl || null
  const resolvedRulesVideoUrl = getMediaUrl(resolvedRulesVideoPath)
  const resolvedSponsorshipImagePath =
    controllerBrandingFallback?.sponsorshipImagePath ||
    sessionStatus?.SponsorshipImage ||
    statusPayload?.sponsorship_image ||
    episode?.SponsorshipImage ||
    null
  const resolvedSponsorshipImageUrl = getMediaUrl(resolvedSponsorshipImagePath)
  const resolvedSponsorshipVideoPath =
    controllerBrandingFallback?.sponsorshipVideoPath ||
    sessionStatus?.SponsorshipVideoUrl ||
    statusPayload?.sponsorship_video_url ||
    episode?.SponsorshipVideoUrl ||
    null
  const resolvedSponsorshipVideoUrl = getMediaUrl(resolvedSponsorshipVideoPath)

  // If rules screen is open but rules are still missing, retry public status API once more.
  useEffect(() => {
    if (!sessionId || gameState !== "rules") return
    if (statusRulesContent && statusRulesContent.length > 0) return

    const refreshRulesFromStatus = async () => {
      try {
        const status = await sessionsApi.status(sessionId)
        setSessionStatus((prev) => ({
          ...(prev ?? status),
          ...status,
        }))
        setSession((prev) => prev ?? status)
      } catch (err) {
        console.error("Failed to refresh rules from status API:", err)
      }
    }

    void refreshRulesFromStatus()
  }, [sessionId, gameState, statusRulesContent])

  // Get current category
  const statusCategory =
    sessionStatus?.CurrentCategory ||
    sessionStatus?.QuestionCategory ||
    sessionStatus?.Category ||
    statusPayload?.current_category ||
    statusPayload?.question_category ||
    statusPayload?.category ||
    null
  const currentCategory = currentQuestion?.Category || statusQuestion?.Category || statusCategory || "General"

  // Video visibility — derived from server GameState (no local toggle needed)
  const hasQuestionVideo = !!currentQuestion?.QuestionVideoUrl
  const hasAnswerVideo = !!currentQuestion?.AnswerVideoUrl
  const showQuestionVideo = hasQuestionVideo &&
    gameState !== "answer_reveal" &&
    (gameState === "video_playing" || gameState === "options_revealed" || gameState === "timer_running" || gameState === "timer_ended")
  const showAnswerVideo = hasAnswerVideo && gameState === "answer_reveal"
  const showAnyVideo = (showQuestionVideo || showAnswerVideo) && !videoFrameHidden
  const isShowingAnswer = gameState === "answer_reveal"
  const openEndedCorrectAnswer = currentQuestion?.QuestionType === "open_ended"
    ? currentQuestion.CorrectAnswer.trim()
    : ""

  // States that show question content (after announcement)
  const showQuestionContent = gameState === "video_playing" || gameState === "options_revealed" ||
    gameState === "timer_running" || gameState === "timer_ended" || gameState === "answer_reveal"

  // States that show options
  const showOptions = gameState === "options_revealed" || gameState === "timer_running" ||
    gameState === "timer_ended" || gameState === "answer_reveal"

  useEffect(() => {
    if (!showAnyVideo || !isBoardActivated) return

    const timeoutId = window.setTimeout(() => {
      attemptMediaPlay(videoRef.current)
    }, 120)

    return () => window.clearTimeout(timeoutId)
  }, [attemptMediaPlay, isBoardActivated, showAnyVideo, showAnswerVideo, showQuestionVideo])

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

      <AnimatePresence>
        {!isBoardActivated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[70] bg-gray-950/95 backdrop-blur-sm flex items-center justify-center p-6"
            role="button"
            tabIndex={0}
            onClick={handleActivateBoard}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                handleActivateBoard()
              }
            }}
          >
            <div className="text-center max-w-xl">
              <Image
                src="/trivi-time-logo.png"
                alt="Trivi Time"
                width={600}
                height={180}
                className="w-[75vw] max-w-[460px] h-auto drop-shadow-2xl mx-auto"
                priority
              />
              <p className="mt-10 font-display text-3xl lg:text-5xl font-bold text-white drop-shadow-md">
                Click anywhere to activate gameboard
              </p>
              <p className="mt-4 text-gray-300 text-base lg:text-lg">
                This enables video and sound autoplay for this page load.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* ==== TOP HEADER (NO BACKGROUND) ==== */}
        <div className="w-full z-50 flex items-start justify-between px-8 py-6 shrink-0">
          {/* Left: GATE Logo */}
          <div className="flex items-start">
            <img src="/gate-logo.png" alt="GATE" className="h-12 lg:h-16 object-contain drop-shadow-xl" />
          </div>

          {/* Center: Game State */}
          <div className="flex-1 flex justify-center mt-2">
            {!bufferPageVisible && (
              <div className="text-center">
                <p className={`text-2xl lg:text-4xl font-display font-bold tracking-wide ${gameState === "break" ? "text-yellow-400" :
                  isLobby ? "text-yellow-400" :
                    isCompleted ? "text-green-400" :
                      "text-purple-400"
                  } drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]`}>
                  {isLobby ? "Waiting for Players" : isCompleted ? "Game Complete" : getHeaderText()}
                </p>
              </div>
            )}
          </div>

          {/* Right: Sponsor Logo - MASSIVE */}
          <div className="flex items-start justify-end">
            <div className="h-28 lg:h-40 max-w-[280px] lg:max-w-[400px] flex items-start justify-end">
              <img src={resolvedSponsorshipImageUrl || "/gate-logo.png"} alt="Sponsor" className="max-h-full max-w-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]" />
            </div>
          </div>
        </div>

        {/* ==== MAIN CONTENT AREA ==== */}
        <div className="flex-1 flex flex-col p-4 xl:p-6 gap-4 overflow-hidden relative z-10">
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
                  <Image src="/trivi-time-logo.png" alt="Trivi Time" width={600} height={180} className="w-[40vw] max-w-[400px] h-auto drop-shadow-2xl" />
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
                              <TeamAvatar
                                avatarPath={getAvatarValue(t)}
                                teamName={t.TeamName}
                                teamId={t.IDTeam}
                                size="sm"
                              />
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
                    className="w-[70vw] max-w-[1000px]"
                  >
                    <Image src="/trivi-time-logo.png" alt="Trivi Time" width={1000} height={300} className="w-full h-auto drop-shadow-2xl" priority />
                  </motion.div>
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.9 }}
                    className="flex flex-col md:flex-row items-center justify-center gap-12 md:gap-24 mt-8"
                  >
                    <div className="flex flex-col items-center gap-4">
                      <span className="text-lg lg:text-xl text-white font-medium tracking-wider uppercase drop-shadow-sm">presented by</span>
                      <Image src="/gate-logo.png" alt="GATE" width={160} height={70} className="h-12 lg:h-16 w-auto drop-shadow-xl" />
                    </div>
                    {resolvedSponsorshipImageUrl && (
                      <div className="flex flex-col items-center gap-4">
                        <span className="text-xl lg:text-2xl text-white font-bold tracking-wider uppercase drop-shadow-md">sponsored by</span>
                        <div className="h-28 lg:h-40 max-w-[350px] lg:max-w-[500px] flex items-center justify-center">
                          <img src={resolvedSponsorshipImageUrl} alt="Sponsor" className="max-h-full max-w-full object-contain drop-shadow-2xl" />
                        </div>
                      </div>
                    )}
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
                className="flex-1 flex items-stretch justify-center min-h-0 pb-4"
              >
                {resolvedRulesVideoUrl ? (
                  /* Rules video: 16:9 LANDSCAPE — host records wide (16:9), object-cover fills perfectly */
                  <div className="w-full flex flex-row items-center gap-6 h-full min-h-0">
                    {/* Left — 16:9 Video Box, centered and perfectly fitted */}
                    <div className="flex-[3] min-w-0 min-h-0 flex items-center justify-center">
                      <div
                        className="rounded-2xl overflow-hidden shadow-2xl border border-gray-700/50 bg-black"
                        style={{ height: '100%', aspectRatio: '16 / 9', maxWidth: '100%' }}
                      >
                        <video
                          ref={rulesVideoRef}
                          src={resolvedRulesVideoUrl}
                          className="w-full h-full object-cover"
                          autoPlay
                          playsInline
                          onLoadedData={() => {
                            if (isBoardActivated) {
                              attemptMediaPlay(rulesVideoRef.current)
                            }
                          }}
                        />
                      </div>
                    </div>
                    {/* Right — Single column rules */}
                    <div className="flex-[2] min-w-0 overflow-y-auto flex flex-col">
                      <div className="flex items-center gap-3 mb-4 justify-center">
                        <h2 className="font-display text-4xl font-bold text-yellow-400 underline drop-shadow-md">RULES</h2>
                      </div>
                      <div className="space-y-1">
                        {resolvedRulesContent.map((rule, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.15 + i * 0.1 }}
                            className="py-1.5 px-2 flex items-start gap-3"
                          >
                            <span className="flex-shrink-0 font-display text-xl font-bold text-purple-400 drop-shadow-md">&gt;</span>
                            <p className="font-display text-lg text-white leading-snug drop-shadow-md">{rule}</p>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* No video — centered single column */
                  <div className="w-[90vw] mx-auto">
                    <div className="flex items-center gap-3 mb-4 justify-center">
                      <h2 className="font-display text-4xl font-bold text-yellow-400 underline drop-shadow-md">RULES</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                      {(() => {
                        const mid = Math.ceil(resolvedRulesContent.length / 2)
                        const leftCol = resolvedRulesContent.slice(0, mid)
                        const rightCol = resolvedRulesContent.slice(mid)
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
                                  <span className="flex-shrink-0 font-display text-xl font-bold text-purple-400 drop-shadow-md">&gt;</span>
                                  <p className="font-display text-lg text-white leading-snug drop-shadow-md">{rule}</p>
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
                                  <span className="flex-shrink-0 font-display text-xl font-bold text-purple-400 drop-shadow-md">&gt;</span>
                                  <p className="font-display text-lg text-white leading-snug drop-shadow-md">{rule}</p>
                                </motion.div>
                              ))}
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ==== GET READY STATE ==== */}
            {gameState === "get_ready" && !bufferPageVisible && (
              <motion.div
                key="get_ready"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="flex-1 flex items-center justify-center"
              >
                <div className="text-center">
                  <h2 className="font-display text-8xl lg:text-[12rem] leading-none font-bold text-white mb-6 drop-shadow-md">
                    Get Ready!
                  </h2>
                  <p className="text-xl text-gray-200 mb-8">Next question is coming up...</p>
                  <Image src="/trivi-time-logo.png" alt="Trivi Time" width={500} height={150} className="w-[30vw] max-w-[300px] h-auto drop-shadow-xl mx-auto" />
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
                className="flex-1 min-h-0 flex items-center justify-center"
              >
                <div className="w-full h-full max-w-7xl mx-auto flex flex-col gap-5 min-h-0">
                  {resolvedSponsorshipVideoUrl ? (
                    <>
                      {/* Break/sponsor video is 16:9 LANDSCAPE. */}
                      {/* Box sized to min(full width, available-height * 16/9) — always 16:9, no black bars. */}
                      <div className="flex-[7] min-h-0 w-full flex items-center justify-center">
                        <div
                          className="rounded-2xl border-2 border-yellow-500/40 overflow-hidden shadow-2xl bg-black"
                          style={{ width: '100%', aspectRatio: '16 / 9', maxHeight: '100%' }}
                        >
                          <video
                            ref={sponsorVideoRef}
                            src={resolvedSponsorshipVideoUrl}
                            className="w-full h-full object-cover"
                            muted={isMuted}
                            autoPlay
                            loop
                            playsInline
                            onLoadedData={() => {
                              if (isBoardActivated) {
                                attemptMediaPlay(sponsorVideoRef.current)
                              }
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex-[3] min-h-0 flex items-center justify-center">
                        <div className={`w-full max-w-5xl grid gap-4 ${resolvedSponsorshipImageUrl ? "grid-cols-1 md:grid-cols-12" : "grid-cols-1"}`}>
                          {resolvedSponsorshipImageUrl && (
                            <div className="md:col-span-8 rounded-2xl bg-gray-900/70 border border-yellow-500/30 p-5 flex flex-col items-center justify-center text-center shadow-[0_0_30px_rgba(250,175,0,0.15)]">
                              <span className="text-xs md:text-sm text-yellow-500/80 font-bold uppercase tracking-[0.3em] mb-4">Sponsored by</span>
                              <img src={resolvedSponsorshipImageUrl} alt="Sponsor" className="h-24 md:h-36 max-w-full object-contain drop-shadow-xl" />
                            </div>
                          )}

                          <div className={`${resolvedSponsorshipImageUrl ? 'md:col-span-4' : ''} rounded-2xl bg-gray-900/70 border border-gray-700 p-5 flex flex-col items-center justify-center text-center`}>
                            <span className="text-xs md:text-sm text-gray-400 uppercase tracking-[0.2em] mb-2">Presented by</span>
                            <img src="/gate-logo.png" alt="GATE" className="h-8 md:h-10 w-auto object-contain opacity-80" />
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center gap-6 text-center">
                      <motion.div
                        animate={{ y: [0, -8, 0] }}
                        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                      >
                        <Coffee className="h-20 w-20 text-yellow-400 mx-auto drop-shadow-lg" />
                      </motion.div>
                      <Image src="/trivi-time-logo.png" alt="Trivi Time" width={500} height={150} className="w-[35vw] max-w-[350px] h-auto drop-shadow-2xl mb-4" />
                      <h2 className="font-display text-6xl lg:text-8xl font-bold text-white drop-shadow-xl">
                        Break Time
                      </h2>

                      <div className={`w-full max-w-5xl grid gap-4 ${resolvedSponsorshipImageUrl ? "grid-cols-1 md:grid-cols-12" : "grid-cols-1"}`}>
                        {resolvedSponsorshipImageUrl && (
                          <div className="md:col-span-8 rounded-2xl bg-gray-900/70 border border-yellow-500/30 p-5 flex flex-col items-center justify-center text-center shadow-[0_0_30px_rgba(250,175,0,0.15)]">
                            <span className="text-xs md:text-sm text-yellow-500/80 font-bold uppercase tracking-[0.3em] mb-4">Sponsored by</span>
                            <img src={resolvedSponsorshipImageUrl} alt="Sponsor" className="h-24 md:h-36 max-w-full object-contain drop-shadow-xl" />
                          </div>
                        )}

                        <div className={`${resolvedSponsorshipImageUrl ? 'md:col-span-4' : ''} rounded-2xl bg-gray-900/70 border border-gray-700 p-5 flex flex-col items-center justify-center text-center`}>
                          <span className="text-xs md:text-sm text-gray-400 uppercase tracking-[0.2em] mb-2">Presented by</span>
                          <img src="/gate-logo.png" alt="GATE" className="h-8 md:h-10 w-auto object-contain opacity-80" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ==== ANNOUNCED STATE ==== */}
            {gameState === "announced" && (
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
                    className="text-6xl lg:text-7xl font-bold text-purple-400 uppercase tracking-widest mb-6 drop-shadow-md"
                  >
                    Round {effectiveCurrentRound}
                  </motion.p>
                  <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="font-display text-[12vw] xl:text-[200px] leading-none font-bold text-white mb-8 whitespace-nowrap drop-shadow-md"
                  >
                    Question {effectiveCurrentQuestion}
                  </motion.p>
                  <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-5xl lg:text-7xl font-semibold text-gray-300 drop-shadow-md"
                  >
                    {currentCategory}
                  </motion.p>
                </div>
              </motion.div>
            )}

            {/* ==== QUESTION CONTENT (video_playing, options_revealed, timer_running, timer_ended, answer_reveal) ==== */}
            {showQuestionContent && currentQuestion && !bufferPageVisible && (
              <motion.div
                key="question-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col gap-3 lg:gap-4 min-h-0"
              >
                {/* Video + Question — Side-by-side layout */}
                <motion.div
                  layout
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="flex-1 flex gap-4 min-h-0"
                >
                  {/* Video Frame — 9:16 PORTRAIT frame. Host must record in portrait (9:16). */}
                  {/* Frame height = parent flex height. Width auto-derived from 9:16 aspect ratio. */}
                  {/* object-cover fills the exact 9:16 box — zero black bars. */}
                  <AnimatePresence>
                    {showAnyVideo && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="flex-shrink-0 h-full overflow-hidden"
                        style={{ aspectRatio: '9 / 16', perspective: '1000px' }}
                      >
                        <motion.div
                          className="w-full h-full rounded-2xl overflow-hidden bg-black border border-gray-800"
                          animate={isFlipping ? { rotateX: [0, 90, 0] } : { rotateX: 0 }}
                          transition={{ duration: 0.6, ease: "easeInOut" }}
                          style={{ transformStyle: "preserve-3d" }}
                        >
                          <video
                            ref={videoRef}
                            key={showAnswerVideo ? "answer-video" : "question-video"}
                            src={getMediaUrl(showAnswerVideo ? currentQuestion.AnswerVideoUrl : currentQuestion.QuestionVideoUrl)!}
                            className="w-full h-full object-cover"
                            muted={isMuted}
                            autoPlay
                            playsInline
                            preload="auto"
                            onLoadedData={() => {
                              if (isBoardActivated) {
                                attemptMediaPlay(videoRef.current)
                              }
                            }}
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
                          <h2 className={`font-display font-bold text-white text-center max-w-full break-words whitespace-pre-wrap ${getTextSizeClass(currentQuestion.QuestionText)}`}>
                            <TypewriterText text={currentQuestion.QuestionText} speed={35} />
                          </h2>
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
                <div className={`flex-shrink-0 max-h-[34vh] xl:max-h-[38vh] pr-1 ${isShowingAnswer ? 'overflow-visible' : 'overflow-y-auto'}`}>
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
                            <div className={`grid gap-2 lg:gap-3 ${currentQuestion.Options.length <= 4 ? 'grid-cols-2' : 'grid-cols-2 xl:grid-cols-3'}`}>
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
                                        animate={isCorrect ? {
                                          opacity: 1, y: 0,
                                          scale: [1, 1.05, 1.05, 1.05, 1],
                                          x: [0, 0, -3, 3, -3, 3, 0, 0],
                                        } : { opacity: 1, y: 0, scale: 1 }}
                                        transition={isCorrect ? {
                                          opacity: { duration: 0.3 },
                                          y: { type: "spring", stiffness: 300, damping: 25 },
                                          scale: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
                                          x: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
                                        } : { type: "spring", stiffness: 300, damping: 25 }}
                                        className={`p-2.5 lg:p-3 rounded-xl border-2 transition-colors duration-300 ${isCorrect
                                          ? 'border-green-500 bg-green-600/50 backdrop-blur-sm shadow-lg shadow-green-500/30'
                                          : 'border-gray-700 bg-gray-800/80 hover:border-gray-600'
                                          }`}
                                      >
                                        <div className="flex items-center gap-2 lg:gap-3">
                                          <span className={`w-8 h-8 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center font-display font-bold text-base lg:text-xl flex-shrink-0 ${isCorrect ? 'bg-green-500 text-white' : 'bg-purple-600/30 text-purple-400'
                                            }`}>
                                            {letter}
                                          </span>
                                          <span className="font-display text-base lg:text-xl font-semibold text-white flex-1 text-center leading-tight break-words">{option}</span>
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
                            <div className="grid grid-cols-2 gap-3 lg:gap-4">
                              {["True", "False"].map((option, i) => {
                                const isCorrect = isShowingAnswer && option === currentQuestion.CorrectAnswer
                                const isRevealed = revealedOptions.includes(option) || revealedOptions.length >= 2 ||
                                  gameState !== "options_revealed"

                                return (
                                  <AnimatePresence key={option}>
                                    {isRevealed && (
                                      <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={isCorrect ? {
                                          opacity: 1, y: 0,
                                          scale: [1, 1.05, 1.05, 1.05, 1],
                                          x: [0, 0, -3, 3, -3, 3, 0, 0],
                                        } : { opacity: 1, y: 0 }}
                                        transition={isCorrect ? {
                                          opacity: { delay: i * 0.1 },
                                          y: { delay: i * 0.1 },
                                          scale: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
                                          x: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
                                        } : { delay: i * 0.1 }}
                                        className={`p-3 lg:p-6 rounded-xl border-2 text-center transition-colors duration-300 ${isCorrect
                                          ? 'flex-shrink-0 p-4 lg:p-6 rounded-xl bg-green-900/60 backdrop-blur-sm border-2 border-green-500 text-center shadow-lg shadow-green-500/30'
                                          : 'border-gray-700 bg-gray-800/80'
                                          }`}
                                      >
                                        <span className={`font-display text-xl lg:text-5xl drop-shadow-md font-bold ${isCorrect ? 'text-green-400/80' : option === 'True' ? 'text-blue-400' : 'text-red-400'
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
                    openEndedCorrectAnswer ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex-shrink-0 p-4 lg:p-6 rounded-xl bg-green-900/60 backdrop-blur-sm border-2 border-green-500 text-center shadow-lg shadow-green-500/30"
                      >
                        <motion.div
                          animate={{
                            scale: [1, 1.05, 1.05, 1.05, 1],
                            x: [0, 0, -3, 3, -3, 3, 0, 0],
                          }}
                          transition={{
                            duration: 1.8,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        >
                          <span className="text-xs lg:text-sm text-white uppercase tracking-wider">Correct Answer</span>
                          <p className="text-xl lg:text-5xl drop-shadow-md font-display text-green-400/80 mt-2 break-words">
                            {openEndedCorrectAnswer}
                          </p>
                        </motion.div>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex-shrink-0 p-4 lg:p-6 rounded-xl bg-gray-900/70 backdrop-blur-sm border border-yellow-500/40 text-center"
                      >
                        <p className="text-base lg:text-2xl font-display text-yellow-300">See the host screen for the answer.</p>
                      </motion.div>
                    )
                  )}
                </div>
              </motion.div>
            )}

            {/* ==== BUFFER PAGE STATE ==== */}
            {bufferPageVisible && (
              <motion.div
                key="buffer_page"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="flex-1 flex items-center justify-center"
              >
                <div className="text-center">
                  <h2 className="font-display text-6xl lg:text-[10rem] leading-none font-bold text-white mb-6 drop-shadow-md">
                    Tallying Up The Scores!
                  </h2>
                  <div className="flex gap-3 justify-center mt-8">
                    {[0, 1, 2, 3, 4].map(i => (
                      <motion.div
                        key={i}
                        className="w-4 h-4 rounded-full bg-yellow-400"
                        animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ==== ACTIVE BUT NO QUESTION YET ==== */}
            {sessionStatus?.Status === "active" && !currentQuestion && !["welcome", "rules", "get_ready", "announced", "video_playing", "options_revealed", "timer_running", "timer_ended", "answer_reveal", "break", "lobby", "completed"].includes(gameState || "") && (
              <motion.div
                key="no-question"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex items-center justify-center"
              >
                <div className="text-center">
                  <Clock className="h-24 w-24 text-purple-400 mx-auto mb-6 animate-pulse drop-shadow-md" />
                  <h2 className="font-display text-6xl lg:text-8xl font-bold text-white mb-4 drop-shadow-md">
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
                className="flex-1 min-h-0 w-full flex flex-col items-center justify-evenly py-4"
              >
                <div className="text-center shrink-0">
                  <h2 className="font-display text-[8vw] lg:text-[6rem] leading-none font-extrabold text-white mb-2 drop-shadow-md">
                    Game Over!
                  </h2>
                  {leaderboard?.entries[0] && (
                    <p className="text-[3vw] lg:text-3xl text-gray-200">
                      Winner:{" "}
                      <span className="text-yellow-400 font-bold">
                        {leaderboard.entries[0].TeamName}
                      </span>
                      <span className="text-gray-200 ml-3">
                        ({leaderboard.entries[0].TotalScore} pts)
                      </span>
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-center shrink min-h-0 w-full mt-4 lg:mt-8">
                  <p className="font-display text-[10vw] lg:text-[8rem] leading-none font-black text-white tracking-wider uppercase drop-shadow-md mb-6 lg:mb-10 text-center">
                    Thanks for Playing!
                  </p>

                  <div className="flex flex-row items-end justify-center gap-6 lg:gap-16 w-full max-w-7xl shrink min-h-0">
                    {/* Left QR */}
                    <div className="flex flex-col items-center shrink min-h-0 min-w-0">
                      <div className="bg-white p-2 lg:p-4 rounded-2xl shadow-xl shrink min-h-0 flex items-center justify-center">
                        <img src="/google-QR.png" alt="Leave a Google Review" className="max-h-[18vh] lg:max-h-[25vh] w-auto object-contain" />
                      </div>
                      <span className="font-display text-[2.5vw] lg:text-4xl font-bold text-amber-300 drop-shadow-md mt-3 lg:mt-5 whitespace-nowrap">Leave a Review</span>
                    </div>

                    {/* Center Logo */}
                    <div className="flex flex-col items-center justify-center shrink min-h-0 px-2 lg:px-8">
                      <div className="flex items-center justify-center shrink min-h-0">
                        <img src="/trivi-time-logo.png" alt="Trivi Time" className="max-h-[12vh] lg:max-h-[16vh] w-auto object-contain drop-shadow-2xl" />
                      </div>
                      <span className="font-display text-[2.5vw] lg:text-4xl font-bold text-transparent select-none drop-shadow-none mt-3 lg:mt-5">Trivi Time</span> {/* Invisible alignment text */}
                    </div>

                    {/* Right QR */}
                    <div className="flex flex-col items-center shrink min-h-0 min-w-0">
                      <div className="bg-white p-2 lg:p-4 rounded-2xl shadow-xl shrink min-h-0 flex items-center justify-center">
                        <img src="/website-QR.png" alt="Visit website" className="max-h-[18vh] lg:max-h-[25vh] w-auto object-contain" />
                      </div>
                      <span className="font-display text-[2.5vw] lg:text-4xl font-bold text-lime-300 drop-shadow-md mt-3 lg:mt-5 whitespace-nowrap">More Games</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ==== BOTTOM BAR: Round/Question info only during active (QR removed once game commences) ==== */}
        {sessionStatus?.Status === "active" && (
          <div className="flex items-center justify-center px-6 py-3 bg-gray-900/80 backdrop-blur border-t border-gray-800">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>Round {effectiveCurrentRound}</span>
              <span className="text-gray-600">•</span>
              <span>Q{effectiveCurrentQuestion}</span>
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
                          avatarPath={getAvatarValue(entry)}
                          teamName={entry.TeamName}
                          teamId={entry.IDTeam}
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
                <h1 className="font-display text-5xl lg:text-7xl font-bold bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 bg-clip-text text-transparent drop-shadow-md">
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
                              className={`flex items-center gap-4 p-5 rounded-2xl border-2 shadow-lg ${isTop3 ? bgColors[entry.Rank - 1] : "bg-gray-800/60 border-gray-700/50"
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
                                avatarPath={getAvatarValue(entry)}
                                teamName={entry.TeamName}
                                teamId={entry.IDTeam}
                                size="lg"
                              />
                              <div className="flex-1 min-w-0">
                                <p className={`font-display text-2xl font-bold truncate ${isTop3 ? "text-white" : "text-gray-200"}`}>
                                  {entry.TeamName}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <span className={`font-display text-3xl font-bold ${isTop3 ? rankColors[entry.Rank - 1] : "text-purple-400"}`}>
                                  {entry.TotalScore}
                                </span>
                                <p className="text-xs text-gray-500 uppercase tracking-wider">pts</p>
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
