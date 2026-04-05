"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useParams, useRouter } from "next/navigation"
import { hostLinksApi, sessionsApi, episodesApi, setHostToken, clearHostToken, getHostToken, ApiClientError } from "@/lib/api-client"
import { useSessionStatusWebSocket } from "@/hooks/use-session-status-websocket"
import { useSound } from "@/lib/use-sound"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { RoomCodePanel } from "@/components/game/room-code-panel"
import { LeaderboardPanel } from "@/components/game/leaderboard-panel"
import { IncomingAnswersPanel } from "@/components/game/incoming-answers-panel"
import { QuestionOrchestrationControls } from "@/components/game/question-orchestration-controls"
import { MacroPhaseBar } from "@/components/game/macro-phase-bar"
import { Toaster } from "@/components/ui/sonner"
import { getAvatarValue } from "@/lib/frontend-avatars"
import { toast } from "sonner"
import {
  Loader2,
  AlertCircle,
  Lock,
  Monitor,
  RefreshCw,
  Play,
  CheckCircle2,
  SkipBack,
  SkipForward,
} from "lucide-react"
import type {
  Session,
  SessionStatusResponse,
  LeaderboardResponse,
  Team,
  TeamResponse,
  Question,
  Round,
  RoundWithQuestions,
  EpisodeWithRounds,
  GradeOverrideItem,
} from "@/lib/api-types"

const HOST_LINK_STORAGE_PREFIX = "trivitime_host_link_session"

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const mergeDefined = <T extends object>(base: T, incoming: Partial<T>): T => {
  const merged: Record<string, unknown> = { ...(base as Record<string, unknown>) }
  for (const [key, value] of Object.entries(incoming as Record<string, unknown>)) {
    if (value !== undefined) {
      merged[key] = value
    }
  }
  return merged as T
}

const extractRealtimeQuestionId = (status: SessionStatusResponse | null): string | null => {
  if (!status || typeof status !== "object") return null
  const rawQuestion = (status as unknown as { question?: unknown }).question
  if (!rawQuestion || typeof rawQuestion !== "object") return null

  const idQuestion = (rawQuestion as Record<string, unknown>).IDQuestion
  if (typeof idQuestion === "string" && idQuestion.trim()) return idQuestion

  const idQuestionSnake = (rawQuestion as Record<string, unknown>).id_question
  if (typeof idQuestionSnake === "string" && idQuestionSnake.trim()) return idQuestionSnake

  return null
}

export default function HostTokenPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  const storageKey = `${HOST_LINK_STORAGE_PREFIX}:${token}`

  // PIN gate state
  const [pin, setPin] = useState("")
  const [isPinValidated, setIsPinValidated] = useState(false)
  const [pinError, setPinError] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  // Session state
  const [session, setSession] = useState<Session | null>(null)
  const [sessionStatus, setSessionStatus] = useState<SessionStatusResponse | null>(null)
  const [episode, setEpisode] = useState<EpisodeWithRounds | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [responses, setResponses] = useState<TeamResponse[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [currentRound, setCurrentRound] = useState<Round | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGrading, setIsGrading] = useState(false)
  const [isRestarting, setIsRestarting] = useState(false)
  const responsesGraceUntilRef = useRef<number>(0)
  const previousPollingGameStateRef = useRef<string | null>(null)
  const responsesPollInFlightRef = useRef(false)
  const leaderboardPollInFlightRef = useRef(false)
  const teamsBroadcastSignatureRef = useRef("")
  const unresolvedQuestionSignatureRef = useRef("")
  const { status: realtimeStatus, lastEvent: realtimeEvent, isConnected: isRealtimeConnected } = useSessionStatusWebSocket(
    isPinValidated ? session?.RoomCode || null : null,
    {
      enabled: isPinValidated && !!session?.RoomCode,
    }
  )

  // Gameboard controls
  const [showVideo, setShowVideo] = useState(true)
  const gameboardWindowRef = useRef<Window | null>(null)
  const [isGameboardOpen, setIsGameboardOpen] = useState(false)

  // Sound effects
  const introMusic = useSound("/sounds/intro-music.wav", { loop: true, volume: 0.5 })
  const answerRevealSound = useSound("/sounds/answer-reveal.wav")
  const timerSound = useSound("/sounds/timer.wav", { loop: true })
  const timeUpSound = useSound("/sounds/time-up.wav")

  const [introMusicPaused, setIntroMusicPaused] = useState(false)
  const [introMusicPlaying, setIntroMusicPlaying] = useState(false)

  // Derive gameState for sound triggers
  const gameState = sessionStatus?.GameState || null
  const prevGameStateRef = useRef<string | null>(null)
  const optimisticAnswerRevealAtRef = useRef<number | null>(null)

  // Intro music auto-plays during lobby/welcome/rules ONLY when gameboard is open
  const isInLobbyState = !!gameState && ["lobby", "welcome", "rules"].includes(gameState)

  useEffect(() => {
    if (isInLobbyState && isGameboardOpen && !introMusicPaused) {
      introMusic.play()
      setIntroMusicPlaying(true)
    } else if (!introMusicPaused && !isInLobbyState && introMusicPlaying) {
      introMusic.stop()
      setIntroMusicPlaying(false)
    }
  }, [gameState, isGameboardOpen, introMusicPaused, introMusicPlaying, introMusic, isInLobbyState])

  const handleOptimisticAnswerRevealClick = useCallback(() => {
    optimisticAnswerRevealAtRef.current = Date.now()
    answerRevealSound.play()
  }, [answerRevealSound])

  // Timer sounds + answer-reveal
  useEffect(() => {
    const prev = prevGameStateRef.current
    const optimisticRevealAgeMs =
      optimisticAnswerRevealAtRef.current === null
        ? null
        : Date.now() - optimisticAnswerRevealAtRef.current

    if (optimisticRevealAgeMs !== null && optimisticRevealAgeMs > 10000) {
      optimisticAnswerRevealAtRef.current = null
    }

    if (gameState === "timer_running" && prev !== "timer_running") {
      timerSound.play()
    }
    if (prev === "timer_running" && gameState !== "timer_running") {
      timerSound.stop()
    }
    if (gameState === "timer_ended" && prev !== "timer_ended") {
      setTimeout(() => timeUpSound.play(), 50)
    }
    if (gameState === "answer_reveal" && prev !== "answer_reveal") {
      const shouldSkipAutoAnswerRevealSound =
        optimisticRevealAgeMs !== null && optimisticRevealAgeMs >= 0 && optimisticRevealAgeMs < 10000

      if (shouldSkipAutoAnswerRevealSound) {
        optimisticAnswerRevealAtRef.current = null
      } else {
        answerRevealSound.play()
      }
    }

    prevGameStateRef.current = gameState
  }, [gameState, timerSound, timeUpSound, answerRevealSound])

  // Allow responses polling to continue briefly after timer ends.
  useEffect(() => {
    const prev = previousPollingGameStateRef.current
    const next = sessionStatus?.GameState || null

    if (next === "timer_ended" && prev === "timer_running") {
      responsesGraceUntilRef.current = Date.now() + 5000
    } else if (next === "timer_running") {
      responsesGraceUntilRef.current = 0
    } else if (next !== "timer_ended") {
      responsesGraceUntilRef.current = 0
    }

    previousPollingGameStateRef.current = next
  }, [sessionStatus?.GameState])

  useEffect(() => {
    if (!realtimeStatus) return

    setSessionStatus((prev) => (prev ? mergeDefined(prev, realtimeStatus) : realtimeStatus))
    setSession((prev) =>
      prev
        ? mergeDefined(prev, realtimeStatus)
        : prev
    )
  }, [realtimeStatus])

  // Restore validated host-link session context after refresh.
  useEffect(() => {
    if (typeof window === "undefined") return

    const stored = localStorage.getItem(storageKey)
    if (!stored) return

    try {
      const parsed = JSON.parse(stored) as {
        session?: Session
        isPinValidated?: boolean
        hostAccessToken?: string
      }

      if (parsed.session && parsed.isPinValidated) {
        setSession(parsed.session)
        setIsPinValidated(true)
        setPinError(null)

        // Rehydrate host JWT so getAuthToken() finds it
        if (parsed.hostAccessToken) {
          setHostToken(parsed.hostAccessToken)
        }
      }
    } catch {
      localStorage.removeItem(storageKey)
    }
  }, [storageKey])

  // Persist validated host-link context whenever session updates.
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!isPinValidated || !session) return

    localStorage.setItem(
      storageKey,
      JSON.stringify({
        session,
        isPinValidated: true,
        hostAccessToken: getHostToken(),
      })
    )
  }, [storageKey, isPinValidated, session])

  // Ensure episode details are hydrated for restored sessions.
  useEffect(() => {
    if (!isPinValidated || !session) return
    if (episode && episode.IDEpisode === session.IDEpisode) return

    const hydrateEpisode = async () => {
      try {
        const ep = await episodesApi.get(session.IDEpisode)
        setEpisode(ep)
      } catch (err) {
        console.error("Failed to hydrate episode on restore:", err)
      }
    }

    void hydrateEpisode()
  }, [isPinValidated, session?.IDEpisode, episode?.IDEpisode])

  // --------------- HOST AUTH ERROR HANDLER ---------------
  const handleHostAuthError = useCallback((err: unknown): boolean => {
    if (err instanceof ApiClientError && err.status === 403) {
      clearHostToken()
      if (typeof window !== "undefined") {
        localStorage.removeItem(storageKey)
      }
      setSession(null)
      setIsPinValidated(false)
      setPinError("This host link has been revoked or expired.")
      toast.error("Host access revoked")
      return true
    }
    return false
  }, [storageKey])

  // --------------- PIN VALIDATION ---------------
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pin.trim()) {
      setPinError("Please enter the PIN")
      return
    }
    setIsValidating(true)
    setPinError(null)
    try {
      const result = await hostLinksApi.validate({ Token: token, PIN: pin.trim() })
      // Store the host JWT so all subsequent requiresAuth calls work
      setHostToken(result.access_token)
      setSession(result.session)
      setIsPinValidated(true)
      setPinError(null)

      // Episode hydration is best-effort; a failure here should not invalidate a successful PIN.
      void episodesApi
        .get(result.session.IDEpisode)
        .then((ep) => {
          setEpisode(ep)
        })
        .catch((err) => {
          console.error("Host-link episode hydration error:", err)
        })
    } catch {
      if (typeof window !== "undefined") {
        localStorage.removeItem(storageKey)
      }
      setIsPinValidated(false)
      setPinError("Invalid PIN or expired link")
    }
    setIsValidating(false)
  }

  // --------------- REFRESH STATUS ---------------
  const refreshSessionStatus = useCallback(async () => {
    if (isRealtimeConnected && sessionStatus) return sessionStatus
    if (!session) return null
    try {
      const status = await sessionsApi.status(session.IDGameSession)
      setSessionStatus((prev) => (prev ? mergeDefined(prev, status) : status))
      setSession((prev) =>
        prev
          ? mergeDefined(prev, status)
          : prev
      )
      return status
    } catch (err) {
      console.error("Failed to refresh status:", err)
      return null
    }
  }, [session, sessionStatus, isRealtimeConnected])

  // --------------- GAMEBOARD WINDOW TRACKING ---------------
  useEffect(() => {
    const interval = setInterval(() => {
      if (gameboardWindowRef.current && !gameboardWindowRef.current.closed) {
        setIsGameboardOpen(true)
      } else {
        setIsGameboardOpen(false)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const openGameboard = () => {
    if (session) {
      // If gameboard is already open, just focus it
      if (gameboardWindowRef.current && !gameboardWindowRef.current.closed) {
        gameboardWindowRef.current.focus()
        return
      }
      const win = window.open(
        `/trivia/display/gameboard?session=${session.IDGameSession}&room=${encodeURIComponent(session.RoomCode)}`,
        "_blank"
      )
      if (win) {
        gameboardWindowRef.current = win
        setIsGameboardOpen(true)
      }
    }
  }

  // --------------- REALTIME-DERIVED DATA ---------------
  useEffect(() => {
    if (!session || sessionStatus) return
    void refreshSessionStatus()
  }, [session, sessionStatus, refreshSessionStatus])

  useEffect(() => {
    if (!session || !sessionStatus) return

    const syncFromStatus = async () => {
      try {
        const shouldRefreshTeams = sessionStatus.Status !== "active" || sessionStatus.team_count !== teams.length

        const teamsList = shouldRefreshTeams
          ? await sessionsApi.teams(session.IDGameSession)
          : teams

        if (shouldRefreshTeams) {
          setTeams(teamsList)
        }

        const normalizedRound = toFiniteNumber(sessionStatus.CurrentRound)
        const normalizedQuestion = toFiniteNumber(sessionStatus.CurrentQuestion)
        const realtimeQuestionId = extractRealtimeQuestionId(sessionStatus)

        let resolvedRound: RoundWithQuestions | null = null
        let resolvedQuestion: Question | null = null

        if (episode && normalizedRound !== null && normalizedQuestion !== null) {
          const roundByNumber = episode.rounds.find((r) => r.RoundNumber === normalizedRound) || null
          const roundByIndex =
            !roundByNumber && normalizedRound > 0 && normalizedRound <= episode.rounds.length
              ? episode.rounds[normalizedRound - 1]
              : null

          resolvedRound = roundByNumber || roundByIndex

          if (resolvedRound) {
            const questionByOrder =
              resolvedRound.questions.find((q) => q.QuestionOrder === normalizedQuestion) || null
            const questionByIndex =
              !questionByOrder &&
              normalizedQuestion > 0 &&
              normalizedQuestion <= resolvedRound.questions.length
                ? resolvedRound.questions[normalizedQuestion - 1]
                : null

            resolvedQuestion = questionByOrder || questionByIndex
          }
        }

        if (!resolvedQuestion && episode && realtimeQuestionId) {
          for (const round of episode.rounds) {
            const question = round.questions.find((q) => q.IDQuestion === realtimeQuestionId) || null
            if (question) {
              resolvedRound = round
              resolvedQuestion = question
              break
            }
          }
        }

        if (resolvedQuestion) {
          unresolvedQuestionSignatureRef.current = ""
          setCurrentRound(resolvedRound)
          setCurrentQuestion(resolvedQuestion)
          setResponses((prev) => {
            if (prev.length === 0) return prev
            return prev.every((response) => response.IDQuestion === resolvedQuestion.IDQuestion)
              ? prev
              : []
          })
          return
        }

        const isGetReadyTransition = sessionStatus.Status === "active" && sessionStatus.GameState === "get_ready"
        const unresolvedSignature = `${sessionStatus.IDGameSession}:${String(
          sessionStatus.CurrentRound
        )}:${String(sessionStatus.CurrentQuestion)}:${String(realtimeQuestionId ?? "")}`

        if (isGetReadyTransition) {
          if (unresolvedQuestionSignatureRef.current !== unresolvedSignature) {
            unresolvedQuestionSignatureRef.current = unresolvedSignature
            console.warn("[HostController] Could not resolve question during get_ready transition", {
              round: sessionStatus.CurrentRound,
              question: sessionStatus.CurrentQuestion,
              realtimeQuestionId,
              episodeRounds: episode?.rounds.map((round) => round.RoundNumber) || [],
            })
          }

          setCurrentRound(resolvedRound)
          setCurrentQuestion(null)
          setResponses([])
          return
        }

        unresolvedQuestionSignatureRef.current = ""
        setCurrentRound(null)
        setCurrentQuestion(null)
        setResponses([])
      } catch (err) {
        console.error("Realtime sync error:", err)
      }
    }

    void syncFromStatus()
  }, [
    session,
    episode,
    sessionStatus?.Status,
    sessionStatus?.CurrentRound,
    sessionStatus?.CurrentQuestion,
    sessionStatus?.GameState,
    sessionStatus?.team_count,
  ])

  // Poll responses and leaderboard at most once per second while timer is active.
  useEffect(() => {
    if (!session || !sessionStatus || !currentQuestion) return

    const pollQuestionData = async () => {
      const now = Date.now()
      const isTimerRunning = sessionStatus.GameState === "timer_running"
      const isInResponsesGrace =
        sessionStatus.GameState === "timer_ended" && responsesGraceUntilRef.current > now

      const shouldPollResponses = isTimerRunning || isInResponsesGrace
      const shouldPollLeaderboard = isTimerRunning

      const tasks: Promise<unknown>[] = []

      if (shouldPollResponses && !responsesPollInFlightRef.current) {
        responsesPollInFlightRef.current = true
        tasks.push(
          sessionsApi
            .responses({
              IDGameSession: session.IDGameSession,
              IDQuestion: currentQuestion.IDQuestion,
            })
            .then((resps) => {
              setResponses(resps)
            })
            .catch((err) => {
              console.error("Responses realtime poll error:", err)
            })
            .finally(() => {
              responsesPollInFlightRef.current = false
            })
        )
      }

      if (shouldPollLeaderboard && !leaderboardPollInFlightRef.current) {
        leaderboardPollInFlightRef.current = true
        tasks.push(
          sessionsApi
            .leaderboard(session.IDGameSession)
            .then((lb) => {
              setLeaderboard(lb)
            })
            .catch((err) => {
              console.error("Leaderboard realtime poll error:", err)
            })
            .finally(() => {
              leaderboardPollInFlightRef.current = false
            })
        )
      }

      if (tasks.length > 0) {
        await Promise.all(tasks)
      }
    }

    void pollQuestionData()
    const interval = setInterval(() => {
      void pollQuestionData()
    }, 1000)

    return () => {
      clearInterval(interval)
      responsesPollInFlightRef.current = false
      leaderboardPollInFlightRef.current = false
    }
  }, [session?.IDGameSession, sessionStatus?.GameState, currentQuestion?.IDQuestion])

  // Fallback: keep teams in sync in lobby or whenever websocket is not connected.
  useEffect(() => {
    if (!session || !isPinValidated) return

    const shouldPollTeams = !isRealtimeConnected || !sessionStatus || sessionStatus.Status === "lobby"
    if (!shouldPollTeams) return

    const pollTeams = async () => {
      try {
        if (!isRealtimeConnected) {
          await refreshSessionStatus()
        }

        const teamsList = await sessionsApi.teams(session.IDGameSession)
        setTeams(teamsList)
      } catch (err) {
        console.error("Teams fallback poll error:", err)
      }
    }

    void pollTeams()
    const interval = setInterval(() => {
      void pollTeams()
    }, 1000)

    return () => clearInterval(interval)
  }, [
    session?.IDGameSession,
    isPinValidated,
    sessionStatus?.Status,
    isRealtimeConnected,
    refreshSessionStatus,
  ])

  // Broadcast latest teams to gameboard tabs as soon as controller state updates.
  useEffect(() => {
    if (!session || !isPinValidated) {
      teamsBroadcastSignatureRef.current = ""
      return
    }

    const teamSignature = teams
      .map((team) => `${team.IDTeam}:${team.TeamName}:${getAvatarValue(team) ?? ""}:${team.JoinedAt}`)
      .join("|")
    const signature = `${session.IDGameSession}:${teamSignature}`

    if (signature === teamsBroadcastSignatureRef.current) return
    teamsBroadcastSignatureRef.current = signature

    try {
      const bc = new BroadcastChannel(`trivitime-host-${session.IDGameSession}`)
      bc.postMessage({ type: "SYNC_TEAMS", teams })
      bc.close()
    } catch {
      // BroadcastChannel not supported
    }
  }, [session?.IDGameSession, isPinValidated, teams])

  // --------------- HANDLERS ---------------
  const handleStartSession = async () => {
    if (!session) return
    setIsLoading(true)
    try {
      const updated = await sessionsApi.start(session.IDGameSession)
      setSession(updated)
      toast.success("Game started!")
    } catch (err) {
      if (!handleHostAuthError(err)) {
        toast.error("Failed to start game")
      }
    }
    setIsLoading(false)
  }

  const handleGrade = async () => {
    if (!session) return
    setIsGrading(true)
    try {
      const result = await sessionsApi.grade({ IDGameSession: session.IDGameSession })
      await refreshLeaderboard()
      toast.success(`Graded ${result.total_graded} responses`)
    } catch (err) {
      if (!handleHostAuthError(err)) {
        toast.error("Failed to grade responses")
      }
    }
    setIsGrading(false)
  }

  const handleNextQuestion = async () => {
    if (!session) return
    setIsLoading(true)
    try {
      const updated = await sessionsApi.nextQuestion(session.IDGameSession)
      setSession(updated)
      if (updated.Status === "completed") {
        toast.info("Game completed!")
      }
    } catch (err) {
      if (!handleHostAuthError(err)) {
        toast.error("Failed to advance")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleKickTeam = async (teamId: string) => {
    if (!session) return
    try {
      await sessionsApi.kick({ IDGameSession: session.IDGameSession, IDTeam: teamId })
      toast.success("Team removed")
    } catch (err) {
      if (!handleHostAuthError(err)) {
        toast.error("Failed to remove team")
      }
    }
  }

  const handleEndSession = async () => {
    if (!session) return
    setIsLoading(true)
    try {
      const updated = await sessionsApi.end(session.IDGameSession)
      setSession(updated)
      toast.info("Game ended")
    } catch (err) {
      if (!handleHostAuthError(err)) {
        toast.error("Failed to end game")
      }
    }
    setIsLoading(false)
  }

  const handleRestartSession = async () => {
    if (!session) return
    if (!confirm("Restart the game? This will reset to Round 1, Question 1.")) return
    setIsRestarting(true)
    try {
      const updated = await sessionsApi.restart(session.IDGameSession)
      setSession(updated)
      toast.success("Game restarted!")
    } catch (err) {
      if (!handleHostAuthError(err)) {
        toast.error("Failed to restart game")
      }
    }
    setIsRestarting(false)
  }

  const handleResetQuestion = async () => {
    if (!session) return
    setIsLoading(true)
    try {
      await sessionsApi.resetQuestion(session.IDGameSession)
      await refreshSessionStatus()
      toast.success("Question reset successfully")
    } catch (err) {
      if (!handleHostAuthError(err)) {
        toast.error("Failed to reset question")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handlePrevQuestion = async () => {
    if (!session) return
    setIsLoading(true)
    try {
      await sessionsApi.prevQuestion(session.IDGameSession)
      await refreshSessionStatus()
      toast.success("Moved to previous question")
    } catch (err) {
      if (!handleHostAuthError(err)) {
        toast.error("Failed to move to previous question")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefreshResponses = async () => {
    const isTimerRunning = sessionStatus?.GameState === "timer_running"
    const isInResponsesGrace =
      sessionStatus?.GameState === "timer_ended" && responsesGraceUntilRef.current > Date.now()
    if ((isTimerRunning || isInResponsesGrace) && currentQuestion && session) {
      const resps = await sessionsApi.responses({
        IDGameSession: session.IDGameSession,
        IDQuestion: currentQuestion.IDQuestion,
      })
      setResponses(resps)
    }
  }

  const handleGradeOverride = async (overrides: GradeOverrideItem[]) => {
    if (!session) return
    try {
      const result = await sessionsApi.gradeOverride({
        IDGameSession: session.IDGameSession,
        overrides,
      })
      await refreshLeaderboard()
      toast.success(`Graded ${result.updated} responses`)
      await handleRefreshResponses()
    } catch (err) {
      if (!handleHostAuthError(err)) {
        toast.error("Failed to grade responses")
      }
    }
  }

  const handleToggleShowAnswer = () => {
    // Orchestration handles answer reveal via server state now
  }

  const refreshTeams = async () => {
    if (!session) return
    const teamsList = await sessionsApi.teams(session.IDGameSession)
    setTeams(teamsList)
  }

  const refreshLeaderboard = async () => {
    if (!session) return
    const lb = await sessionsApi.leaderboard(session.IDGameSession)
    setLeaderboard(lb)
  }

  // Refresh teams immediately on websocket team events (join/leave/kick).
  useEffect(() => {
    if (!session || !realtimeEvent) return

    const eventName = typeof realtimeEvent.event === "string" ? realtimeEvent.event.toLowerCase() : ""
    if (!eventName.includes("team")) return

    void sessionsApi
      .teams(session.IDGameSession)
      .then((teamsList) => {
        setTeams(teamsList)
      })
      .catch((err) => {
        console.error("Team event sync error:", err)
      })
  }, [session?.IDGameSession, realtimeEvent])

  // =============== PIN GATE ===============
  if (!isPinValidated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gray-800 border-gray-700 p-8 max-w-sm w-full text-center">
            <div className="p-4 rounded-full bg-purple-600/20 border border-purple-500/30 w-fit mx-auto mb-6">
              <Lock className="h-8 w-8 text-purple-400" />
            </div>
            <h1 className="text-xl font-display font-bold text-white mb-2">Host PIN Required</h1>
            <p className="text-gray-400 text-sm mb-6">
              Enter the PIN provided by the game admin to access host controls.
            </p>
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <Input
                type="text"
                value={pin}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setPin(e.target.value)
                  setPinError(null)
                }}
                placeholder="Enter PIN"
                autoFocus
                className="bg-gray-900 border-gray-700 text-white text-center text-2xl tracking-[0.3em] font-display h-14 placeholder:text-gray-600 placeholder:text-base placeholder:tracking-normal"
              />
              {pinError && (
                <div className="flex items-center justify-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {pinError}
                </div>
              )}
              <Button
                type="submit"
                disabled={isValidating || !pin.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {isValidating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Lock className="h-4 w-4 mr-2" />
                )}
                {isValidating ? "Validating..." : "Enter"}
              </Button>
            </form>
          </Card>
        </motion.div>
      </div>
    )
  }

  // Compute grading stats
  const totalTeams = teams.length
  const respondedCount = responses.length
  const gradedCount = responses.filter(r => r.IsCorrect !== null).length
  const correctCount = responses.filter(r => r.IsCorrect === true).length

  // =============== MAIN HOST CONTROLLER ===============
  const isActive = sessionStatus?.Status === "active"
  const isCompleted = sessionStatus?.Status === "completed"
  const isQuestionTransitioning = isActive && !currentQuestion && sessionStatus?.GameState === "get_ready"
  const isFirstQuestion = sessionStatus?.CurrentRound === 1 && sessionStatus?.CurrentQuestion === 1

  return (
    <div className="min-h-screen bg-gray-900">
      <Toaster position="top-right" />

      {/* Header — clean, minimal */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-xl font-bold text-white">
              Trivi-Time
            </h1>
            <span className="px-2 py-0.5 rounded bg-purple-600/20 text-purple-400 text-xs font-medium">
              Host
            </span>
            {episode && (
              <>
                <span className="text-gray-600">/</span>
                <span className="text-gray-400 text-sm">{episode.Title}</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content — 2-column layout */}
      <main className="max-w-7xl mx-auto p-4">
        {/* Macro Phase Bar — full width at top */}
        {session && (
          <div className="mb-4">
            <MacroPhaseBar
              sessionStatus={sessionStatus}
              sessionId={session.IDGameSession}
              leaderboard={leaderboard}
              onRefreshStatus={refreshSessionStatus}
              hasRulesVideo={!!episode?.RulesVideoUrl}
              hasSponsorshipVideo={!!(sessionStatus?.SponsorshipVideoUrl || episode?.SponsorshipVideoUrl)}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Left Column (3/5) — Game Navigation */}
          <div className="lg:col-span-3 space-y-4">
            {/* Current Question Card */}
            {isActive ? (
              currentQuestion ? (
                <>
                  <QuestionOrchestrationControls
                    currentQuestion={currentQuestion}
                    currentRound={currentRound}
                    allRounds={episode?.rounds || []}
                    sessionStatus={sessionStatus}
                    teams={teams}
                    responses={responses}
                    showVideo={showVideo}
                    sessionId={session!.IDGameSession}
                    isGrading={isGrading}
                    onGrade={handleGrade}
                    onNextQuestion={handleNextQuestion}
                    onResetQuestion={handleResetQuestion}
                    onPrevQuestion={handlePrevQuestion}
                    onRefreshStatus={refreshSessionStatus}
                    onRevealAnswerClick={handleOptimisticAnswerRevealClick}
                    isLoading={isLoading}
                  />
                  {/* Player Responses */}
                  <IncomingAnswersPanel
                    sessionId={session!.IDGameSession}
                    teams={teams}
                    responses={responses}
                    currentQuestion={currentQuestion}
                    currentRound={currentRound}
                    isGrading={isGrading}
                    onGrade={handleGrade}
                    onGradeOverride={handleGradeOverride}
                    onRefresh={handleRefreshResponses}
                    onKickTeam={handleKickTeam}
                  />
                </>
              ) : isQuestionTransitioning ? (
                <Card className="bg-gray-800 border-gray-700 overflow-hidden">
                  <div className="p-5">
                    <div className="py-6 text-center">
                      <Loader2 className="h-10 w-10 text-purple-400 mx-auto mb-3 animate-spin" />
                      <p className="font-display text-base font-semibold text-gray-200">Loading next question...</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Round {sessionStatus?.CurrentRound ?? "-"} · Q{sessionStatus?.CurrentQuestion ?? "-"}
                      </p>
                      <div className="mt-4 flex items-center justify-center gap-2">
                        <Button
                          onClick={() => { void handlePrevQuestion() }}
                          disabled={isLoading || isFirstQuestion}
                          variant="outline"
                          size="sm"
                          className="border-gray-700 text-gray-300 hover:bg-gray-700"
                        >
                          <SkipBack className="h-3.5 w-3.5 mr-1.5" />
                          Prev
                        </Button>
                        <Button
                          onClick={() => { void handleNextQuestion() }}
                          disabled={isLoading}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          <SkipForward className="h-3.5 w-3.5 mr-1.5" />
                          Next
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="bg-gray-800 border-gray-700 overflow-hidden">
                  <div className="p-5">
                    <div className="py-6 text-center">
                      <Play className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                      <p className="font-display text-base font-semibold text-gray-400">Waiting for Question Data</p>
                      <p className="text-sm text-gray-500 mt-1">Refreshing controller state...</p>
                      <div className="mt-4 flex items-center justify-center gap-2">
                        <Button
                          onClick={() => { void handlePrevQuestion() }}
                          disabled={isLoading || isFirstQuestion}
                          variant="outline"
                          size="sm"
                          className="border-gray-700 text-gray-300 hover:bg-gray-700"
                        >
                          <SkipBack className="h-3.5 w-3.5 mr-1.5" />
                          Prev
                        </Button>
                        <Button
                          onClick={() => { void handleNextQuestion() }}
                          disabled={isLoading}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          <SkipForward className="h-3.5 w-3.5 mr-1.5" />
                          Next
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            ) : isCompleted ? (
              <Card className="bg-gray-800 border-gray-700 overflow-hidden">
                <div className="p-5">
                  <div className="py-8 text-center">
                    <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-3" />
                    <p className="font-display text-lg font-semibold text-white">Game Over!</p>
                    <p className="text-sm text-gray-400 mt-1">All rounds completed</p>
                  </div>
                </div>
                <div className="px-5 py-3 border-t border-gray-700 bg-gray-900/50 flex items-center gap-3">
                  <Button
                    onClick={handleRestartSession}
                    disabled={isLoading || isRestarting}
                    variant="outline"
                    className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                  >
                    {isRestarting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Restart Game
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="bg-gray-800 border-gray-700 overflow-hidden">
                <div className="p-5">
                  <div className="py-6 text-center">
                    <Play className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                    <p className="font-display text-base font-semibold text-gray-400">Waiting for Game Start</p>
                    <p className="text-sm text-gray-500 mt-1">Use the phase controls above to advance through the game</p>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Right Column (2/5) — Session Info */}
          <div className="lg:col-span-2 space-y-4">
            {/* Open Gameboard */}
            <Button
              variant="outline"
              onClick={openGameboard}
              className={`w-full h-11 ${isGameboardOpen
                ? "border-green-500/50 text-green-400 hover:bg-green-500/10"
                : "border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                }`}
            >
              <Monitor className="h-4 w-4 mr-2" />
              {isGameboardOpen ? (
                <>
                  <span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-1.5 animate-pulse" />
                  Gameboard Live
                </>
              ) : (
                "Open Gameboard"
              )}
            </Button>

            {/* Room Code Panel (with teams) */}
            <RoomCodePanel
              session={session}
              sessionStatus={sessionStatus}
              teams={teams}
              isLoading={isLoading}
              onStartSession={handleStartSession}
              onStopSession={handleEndSession}
              onRestartSession={handleRestartSession}
              onKickTeam={handleKickTeam}
              isRestarting={isRestarting}
            />

            {/* Controller-only leaderboard */}
            <LeaderboardPanel
              leaderboard={leaderboard}
              isLoading={isLoading}
              onRefresh={refreshLeaderboard}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
