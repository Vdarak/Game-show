"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { useAuth, useRequireAuth } from "@/hooks/use-auth"
import { useHostSession } from "@/hooks/use-host-session"
import { episodesApi, hostLinksApi, sessionsApi } from "@/lib/api-client"
import { useSound } from "@/lib/use-sound"
import { createDemoGame } from "@/lib/demo-game-generator"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { RoomCodePanel } from "@/components/game/room-code-panel"
import { LeaderboardPanel } from "@/components/game/leaderboard-panel"
import { EpisodeEditor } from "@/components/game/episode-editor"
import { IncomingAnswersPanel } from "@/components/game/incoming-answers-panel"
import { SoundBoardPanel } from "@/components/game/sound-board-panel"
import { QuestionOrchestrationControls } from "@/components/game/question-orchestration-controls"
import { MacroPhaseBar } from "@/components/game/macro-phase-bar"
import { Toaster } from "@/components/ui/sonner"
import { getAvatarValue } from "@/lib/frontend-avatars"
import { toast } from "sonner"
import {
  Loader2,
  LogOut,
  Play,
  Plus,
  Folder,
  ChevronRight,
  Trash2,
  Edit3,
  RefreshCw,
  Monitor,
  CheckCircle2,
  Link as LinkIcon,
  X,
  Unlink,
  Share2,
  Copy,
  Clock,
  SkipBack,
  SkipForward,
} from "lucide-react"
import type { Episode, HostLinkListItem, HostLinkResponse } from "@/lib/api-types"

type View = "episodes" | "session"

export default function TriviaControllerPage() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const { isAuthenticated, isLoading: authLoading } = useRequireAuth()

  const {
    episode,
    session,
    sessionStatus,
    isRealtimeConnected,
    teams,
    responses,
    leaderboard,
    currentQuestion,
    currentRound,
    isLoading,
    error,
    loadEpisode,
    createSession,
    refreshSessionStatus,
    refreshTeams,
    refreshResponses,
    refreshLeaderboard,
    startSession,
    nextQuestion,
    gradeResponses,
    gradeOverride,
    kickTeam,
    endSession,
    restartSession,
    clearSession,
    clearError,
  } = useHostSession()

  const [view, setView] = useState<View>("episodes")
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false)
  const [isGrading, setIsGrading] = useState(false)
  const [editingEpisodeId, setEditingEpisodeId] = useState<string | null>(null)
  const [isCreatingEpisode, setIsCreatingEpisode] = useState(false)
  const [isCreatingDemo, setIsCreatingDemo] = useState(false)
  const [isRestarting, setIsRestarting] = useState(false)
  const [showVideo, setShowVideo] = useState(true)
  const [introMusicPaused, setIntroMusicPaused] = useState(false)
  const [introMusicPlaying, setIntroMusicPlaying] = useState(false)
  const responsesGraceUntilRef = useRef<number>(0)
  const previousPollingGameStateRef = useRef<string | null>(null)
  const responsesPollInFlightRef = useRef(false)
  const leaderboardPollInFlightRef = useRef(false)
  const teamsBroadcastSignatureRef = useRef("")
  const restoredEpisodeHydrationSessionRef = useRef<string | null>(null)

  // Gameboard window tracking — must be before intro music effect
  const gameboardWindowRef = useRef<Window | null>(null)
  const [isGameboardOpen, setIsGameboardOpen] = useState(false)

  // Sound effects (play in the controller tab)
  const introMusic = useSound("/sounds/intro-music.wav", { loop: true, volume: 0.5 })
  const answerRevealSound = useSound("/sounds/answer-reveal.wav")
  const timerSound = useSound("/sounds/timer.wav", { loop: true })
  const timeUpSound = useSound("/sounds/time-up.wav")

  // Derive gameState for sound triggers
  const gameState = sessionStatus?.GameState || null
  const prevGameStateRef = useRef<string | null>(null)
  const optimisticAnswerRevealAtRef = useRef<number | null>(null)

  // Intro music — auto-plays during lobby/welcome/rules ONLY when gameboard is open
  const isInLobbyState = !!gameState && ["lobby", "welcome", "rules"].includes(gameState)

  useEffect(() => {
    if (isInLobbyState && isGameboardOpen && !introMusicPaused) {
      introMusic.play()
      setIntroMusicPlaying(true)
    } else if (!introMusicPaused && !isInLobbyState && introMusicPlaying) {
      // Left lobby states naturally — stop
      introMusic.stop()
      setIntroMusicPlaying(false)
    }
  }, [gameState, isGameboardOpen])

  const handleToggleIntroMusic = useCallback(() => {
    if (introMusicPlaying) {
      introMusic.stop()
      setIntroMusicPlaying(false)
      setIntroMusicPaused(true)
    } else {
      introMusic.play()
      setIntroMusicPlaying(true)
      setIntroMusicPaused(false)
    }
  }, [introMusic, introMusicPlaying])

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

    // Timer start
    if (gameState === "timer_running" && prev !== "timer_running") {
      timerSound.play()
    }
    // Timer stop
    if (prev === "timer_running" && gameState !== "timer_running") {
      timerSound.stop()
    }
    // Time's up
    if (gameState === "timer_ended" && prev !== "timer_ended") {
      setTimeout(() => timeUpSound.play(), 50)
    }
    // Answer reveal
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
  }, [gameState])

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

  // Host link management state
  const [allHostLinks, setAllHostLinks] = useState<HostLinkListItem[]>([])
  const [isLoadingLinks, setIsLoadingLinks] = useState(false)
  const [showLinksModal, setShowLinksModal] = useState(false)
  const [revokingLinkId, setRevokingLinkId] = useState<string | null>(null)
  const [revokeConfirmText, setRevokeConfirmText] = useState("")
  const [confirmInputForLink, setConfirmInputForLink] = useState<string | null>(null)

  // Per-episode link expansion state
  const [expandedEpisodeLinks, setExpandedEpisodeLinks] = useState<string | null>(null)
  const [episodeLinks, setEpisodeLinks] = useState<Record<string, HostLinkListItem[]>>({})
  const [isLoadingEpisodeLinks, setIsLoadingEpisodeLinks] = useState(false)
  const [newLinkResult, setNewLinkResult] = useState<HostLinkResponse | null>(null)
  const [hostName, setHostName] = useState("")
  const [validityDuration, setValidityDuration] = useState("")
  const [customExpiryDate, setCustomExpiryDate] = useState("")
  const [isCreatingLink, setIsCreatingLink] = useState(false)
  const [episodeRevokingId, setEpisodeRevokingId] = useState<string | null>(null)
  const [episodeRevokeConfirmText, setEpisodeRevokeConfirmText] = useState("")
  const [episodeConfirmInputForLink, setEpisodeConfirmInputForLink] = useState<string | null>(null)

  // Load episodes on mount
  useEffect(() => {
    if (isAuthenticated) {
      loadEpisodesList()
    }
  }, [isAuthenticated])

  // Restore active session context after hard refresh.
  useEffect(() => {
    if (!session) {
      restoredEpisodeHydrationSessionRef.current = null
      return
    }

    if (view !== "session") {
      setView("session")
    }

    const needsEpisodeHydration = !episode || episode.IDEpisode !== session.IDEpisode
    if (!needsEpisodeHydration) return

    if (restoredEpisodeHydrationSessionRef.current === session.IDGameSession) return
    restoredEpisodeHydrationSessionRef.current = session.IDGameSession

    void loadEpisode(session.IDEpisode).catch(() => {
      // Error is surfaced by hook and toast pipeline.
    })
  }, [
    session?.IDGameSession,
    session?.IDEpisode,
    view,
    episode?.IDEpisode,
    loadEpisode,
  ])

  // Bootstrap status and react to pushed updates while in session view.
  useEffect(() => {
    if (!session || view !== "session") return

    if (!sessionStatus) {
      void refreshSessionStatus()
      return
    }

    const syncFromStatus = async () => {
      const shouldRefreshTeams = sessionStatus.Status !== "active" || sessionStatus.team_count !== teams.length

      if (shouldRefreshTeams) {
        await refreshTeams()
      }
    }

    void syncFromStatus()
  }, [
    session?.IDGameSession,
    view,
    sessionStatus?.Status,
    sessionStatus?.GameState,
    sessionStatus?.CurrentRound,
    sessionStatus?.CurrentQuestion,
    sessionStatus?.team_count,
    refreshSessionStatus,
    refreshTeams,
  ])

  // Poll responses and leaderboard at most once per second while timer is active.
  useEffect(() => {
    if (!session || view !== "session" || !sessionStatus || !currentQuestion) return

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
          refreshResponses(currentQuestion.IDQuestion).finally(() => {
            responsesPollInFlightRef.current = false
          })
        )
      }

      if (shouldPollLeaderboard && !leaderboardPollInFlightRef.current) {
        leaderboardPollInFlightRef.current = true
        tasks.push(
          refreshLeaderboard().finally(() => {
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
  }, [
    session?.IDGameSession,
    view,
    sessionStatus?.GameState,
    currentQuestion?.IDQuestion,
    refreshResponses,
    refreshLeaderboard,
  ])

  // Fallback: keep lobby team list fresh even if websocket is delayed/disconnected.
  useEffect(() => {
    if (!session || view !== "session") return

    const shouldPollTeams = !isRealtimeConnected || !sessionStatus || sessionStatus.Status === "lobby"
    if (!shouldPollTeams) return

    const pollTeams = async () => {
      if (!isRealtimeConnected) {
        await refreshSessionStatus()
      }
      await refreshTeams()
    }

    void pollTeams()
    const interval = setInterval(() => {
      void pollTeams()
    }, 1000)

    return () => clearInterval(interval)
  }, [
    session?.IDGameSession,
    view,
    sessionStatus?.Status,
    isRealtimeConnected,
    refreshSessionStatus,
    refreshTeams,
  ])

  // Broadcast latest teams to gameboard tabs as soon as controller state updates.
  useEffect(() => {
    if (!session || view !== "session") {
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
  }, [session?.IDGameSession, view, teams])

  // Show errors as toasts
  useEffect(() => {
    if (error) {
      toast.error(error)
      clearError()
    }
  }, [error, clearError])

  const loadEpisodesList = async () => {
    setIsLoadingEpisodes(true)
    try {
      const list = await episodesApi.list()
      setEpisodes(list)
    } catch (err) {
      toast.error("Failed to load episodes")
    }
    setIsLoadingEpisodes(false)
  }

  // Load all host links
  const loadAllHostLinks = async () => {
    setIsLoadingLinks(true)
    try {
      const links = await hostLinksApi.list()
      setAllHostLinks(links)
    } catch (err) {
      console.error("Failed to load host links:", err)
    }
    setIsLoadingLinks(false)
  }

  // Load host links on page load
  useEffect(() => {
    if (isAuthenticated) {
      loadAllHostLinks()
    }
  }, [isAuthenticated])

  // Revoke a host link
  const handleRevokeLink = async (linkId: string) => {
    if (revokeConfirmText.toLowerCase() !== "revoke") {
      toast.error("Type 'revoke' to confirm")
      return
    }
    setRevokingLinkId(linkId)
    try {
      await hostLinksApi.revoke({ IDGameSession: linkId })
      toast.success("Host link revoked")
      setRevokeConfirmText("")
      setConfirmInputForLink(null)
      await loadAllHostLinks()
    } catch (err) {
      toast.error("Failed to revoke link")
    }
    setRevokingLinkId(null)
  }

  // Load links for a specific episode
  const loadEpisodeLinks = async (episodeId: string) => {
    setIsLoadingEpisodeLinks(true)
    try {
      const links = await hostLinksApi.list({ IDEpisode: episodeId })
      setEpisodeLinks(prev => ({ ...prev, [episodeId]: links }))
    } catch (err) {
      console.error("Failed to load episode links:", err)
    }
    setIsLoadingEpisodeLinks(false)
  }

  // Compute ValidTo from duration selection
  const computeValidTo = (): string => {
    const now = new Date()
    if (validityDuration === "custom") {
      return new Date(customExpiryDate).toISOString()
    }
    const ms: Record<string, number> = {
      "1d": 1 * 24 * 60 * 60 * 1000,
      "1w": 7 * 24 * 60 * 60 * 1000,
      "2w": 14 * 24 * 60 * 60 * 1000,
      "1m": 30 * 24 * 60 * 60 * 1000,
    }
    return new Date(now.getTime() + (ms[validityDuration] || ms["1w"])).toISOString()
  }

  // Create a host link for an episode
  const handleCreateEpisodeLink = async (episodeId: string) => {
    if (!hostName.trim()) {
      toast.error("Host name is required")
      return
    }
    setIsCreatingLink(true)
    try {
      const result = await hostLinksApi.generate({
        IDEpisode: episodeId,
        ValidFrom: new Date().toISOString(),
        ValidTo: computeValidTo(),
        HostName: hostName,
      })
      setNewLinkResult(result)
      toast.success("Host link created!")
      setHostName("")
      setValidityDuration("")
      setCustomExpiryDate("")
      await loadEpisodeLinks(episodeId)
      await loadAllHostLinks()
    } catch (err) {
      toast.error("Failed to create host link")
    }
    setIsCreatingLink(false)
  }

  // Revoke a host link from episode view
  const handleRevokeEpisodeLink = async (linkId: string, episodeId: string) => {
    if (episodeRevokeConfirmText.toLowerCase() !== "revoke") {
      toast.error("Type 'revoke' to confirm")
      return
    }
    setEpisodeRevokingId(linkId)
    try {
      await hostLinksApi.revoke({ IDGameSession: linkId })
      toast.success("Host link revoked")
      setEpisodeRevokeConfirmText("")
      setEpisodeConfirmInputForLink(null)
      await loadEpisodeLinks(episodeId)
      await loadAllHostLinks()
    } catch (err) {
      toast.error("Failed to revoke link")
    }
    setEpisodeRevokingId(null)
  }

  // Helper: compute time remaining string from ValidTo
  const getTimeRemaining = (validTo: string) => {
    const now = new Date()
    const end = new Date(validTo)
    const diffMs = end.getTime() - now.getTime()
    if (diffMs <= 0) return "Expired"
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    if (days > 0) return `${days}d ${hours}h`
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const handleDeleteEpisode = async (episodeId: string) => {
    if (!confirm("Delete this episode? This will also delete all rounds and questions.")) {
      return
    }
    try {
      await episodesApi.delete(episodeId)
      setEpisodes(episodes.filter(ep => ep.IDEpisode !== episodeId))
      toast.success("Episode deleted")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete episode"
      console.error("Delete episode error:", err)
      toast.error(message)
    }
  }

  const handleSelectEpisode = async (episodeId: string) => {
    try {
      await loadEpisode(episodeId)
      // Don't create session immediately — let user do it from orchestration page
      setView("session")
    } catch (err) {
      // Error handled by hook
    }
  }

  const handleCreateSession = async () => {
    if (!episode) return
    try {
      await createSession(episode.IDEpisode)
      toast.success("Session created!")
    } catch (err) {
      // Error handled by hook
    }
  }

  const handleStartSession = async () => {
    try {
      await startSession()
      toast.success("Game started!")
    } catch (err) {
      // Error handled by hook
    }
  }

  const handleGrade = async () => {
    setIsGrading(true)
    try {
      const result = await gradeResponses()
      if (result) {
        toast.success(`Graded ${result.total_graded} responses`)
      }
    } catch (err) {
      // Error handled by hook
    }
    setIsGrading(false)
  }

  const handleGradeOverride = async (overrides: import("@/lib/api-types").GradeOverrideItem[]) => {
    try {
      const result = await gradeOverride(overrides)
      if (result) {
        toast.success(`Graded ${result.updated} responses`)
        const isTimerRunning = sessionStatus?.GameState === "timer_running"
        const isInResponsesGrace =
          sessionStatus?.GameState === "timer_ended" && responsesGraceUntilRef.current > Date.now()
        if ((isTimerRunning || isInResponsesGrace) && currentQuestion) {
          await refreshResponses(currentQuestion.IDQuestion)
        }
      }
    } catch (err) {
      // Error handled by hook
    }
  }

  const handleKickTeam = async (teamId: string) => {
    try {
      await kickTeam(teamId)
      toast.success("Team removed")
    } catch (err) {
      // Error handled by hook
      throw err
    }
  }

  const handleNextQuestion = async () => {
    try {
      const updated = await nextQuestion()
      if (updated.Status === "completed") {
        toast.info("Game completed!")
      }
    } catch (err) {
      // Error handled by hook
      throw err
    }
  }

  const handleResetQuestion = async () => {
    if (!session) return
    try {
      await sessionsApi.resetQuestion(session.IDGameSession)
      await refreshSessionStatus()
      toast.success("Question reset successfully")
    } catch (err) {
      toast.error("Failed to reset question")
      throw err
    }
  }

  const handlePrevQuestion = async () => {
    if (!session) return
    try {
      await sessionsApi.prevQuestion(session.IDGameSession)
      await refreshSessionStatus()
      toast.success("Moved to previous question")
    } catch (err) {
      toast.error("Failed to move to previous question")
      throw err
    }
  }

  const handleRefreshResponses = async () => {
    const isTimerRunning = sessionStatus?.GameState === "timer_running"
    const isInResponsesGrace =
      sessionStatus?.GameState === "timer_ended" && responsesGraceUntilRef.current > Date.now()
    if ((isTimerRunning || isInResponsesGrace) && currentQuestion) {
      await refreshResponses(currentQuestion.IDQuestion)
    }
  }

  // Compute grading stats for current question
  const totalTeams = teams.length
  const respondedCount = responses.length
  const gradedCount = responses.filter(r => r.IsCorrect !== null).length
  const correctCount = responses.filter(r => r.IsCorrect === true).length
  const isQuestionTransitioning =
    sessionStatus?.Status === "active" && !currentQuestion && sessionStatus?.GameState === "get_ready"
  const isFirstQuestion = sessionStatus?.CurrentRound === 1 && sessionStatus?.CurrentQuestion === 1

  const handleEndSession = async () => {
    if (!confirm("Are you sure you want to end this game session?")) return
    try {
      await endSession()
      toast.info("Game ended")
    } catch (err) {
      // Error handled by hook
    }
  }

  const handleRestartSession = async () => {
    if (!confirm("Restart the game? This will reset to Round 1, Question 1.")) return
    setIsRestarting(true)
    try {
      await restartSession()
      toast.success("Game restarted!")
    } catch (err) {
      // Error handled by hook
    }
    setIsRestarting(false)
  }


  // Check if gameboard window is still open
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

  const handleLeaveSession = () => {
    if (!confirm("Going back will end your ability to control this game session. Are you sure?")) return
    clearSession()
    setView("episodes")
  }

  const handleLogout = () => {
    logout()
    router.push("/auth/login")
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

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
            {session && episode && (
              <>
                <span className="text-gray-600">/</span>
                <span className="text-gray-400 text-sm">{episode.Title}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Link Status Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowLinksModal(true)
                loadAllHostLinks()
              }}
              disabled={allHostLinks.length === 0 && !isLoadingLinks}
              className={`${allHostLinks.length > 0
                ? "border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                : "border-gray-600 text-gray-500"
                }`}
            >
              <LinkIcon className="h-4 w-4 mr-1.5" />
              Link Status: {isLoadingLinks ? "..." : allHostLinks.length}
            </Button>
            {user && (
              <span className="text-sm text-gray-500">{user.display_name}</span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-gray-400 hover:text-white h-8 w-8 p-0"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4">
        <AnimatePresence mode="wait">
          {view === "episodes" ? (
            <motion.div
              key="episodes"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Episodes List */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-lg font-semibold text-white flex items-center gap-2">
                    <Folder className="h-5 w-5 text-purple-400" />
                    Select Episode
                  </h2>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-green-500/50 text-green-400 hover:bg-green-500/10"
                      disabled={isCreatingDemo || isCreatingEpisode}
                      onClick={async () => {
                        setIsCreatingDemo(true)
                        try {
                          const result = await createDemoGame()
                          toast.success(`Created demo game with ${result.rounds.length} rounds and ${result.questions.length} questions!`)
                          await loadEpisodesList()
                        } catch (err) {
                          console.error("Failed to create demo game:", err)
                          toast.error("Failed to create demo game")
                        }
                        setIsCreatingDemo(false)
                      }}
                    >
                      {isCreatingDemo ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-1" />
                      )}
                      Create Demo Game
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-purple-500/50 text-purple-400"
                      disabled={isCreatingEpisode || isCreatingDemo}
                      onClick={async () => {
                        setIsCreatingEpisode(true)
                        try {
                          const newEpisode = await episodesApi.create({
                            Title: "New Episode",
                          })
                          setEditingEpisodeId(newEpisode.IDEpisode)
                        } catch (err) {
                          toast.error("Failed to create episode")
                        }
                        setIsCreatingEpisode(false)
                      }}
                    >
                      {isCreatingEpisode ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-1" />
                      )}
                      Create Episode
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={loadEpisodesList}
                      disabled={isLoadingEpisodes}
                      className="text-gray-400"
                    >
                      {isLoadingEpisodes ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Refresh"
                      )}
                    </Button>
                  </div>
                </div>

                {isLoadingEpisodes ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                  </div>
                ) : episodes.length === 0 ? (
                  <Card className="bg-gray-800 border-gray-700 p-8 text-center">
                    <Folder className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 mb-4">No episodes found</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <Button
                        variant="outline"
                        disabled={isCreatingDemo || isCreatingEpisode}
                        onClick={async () => {
                          setIsCreatingDemo(true)
                          try {
                            const result = await createDemoGame()
                            toast.success(`Created demo game with ${result.rounds.length} rounds and ${result.questions.length} questions!`)
                            await loadEpisodesList()
                          } catch (err) {
                            console.error("Failed to create demo game:", err)
                            toast.error("Failed to create demo game")
                          }
                          setIsCreatingDemo(false)
                        }}
                        className="border-green-500/50 text-green-400 hover:bg-green-500/10"
                      >
                        {isCreatingDemo ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4 mr-2" />
                        )}
                        Create Demo Game
                      </Button>
                      <span className="text-gray-600">or</span>
                      <Button
                        variant="outline"
                        disabled={isCreatingEpisode || isCreatingDemo}
                        onClick={async () => {
                          setIsCreatingEpisode(true)
                          try {
                            const newEpisode = await episodesApi.create({
                              Title: "New Episode",
                            })
                            setEditingEpisodeId(newEpisode.IDEpisode)
                          } catch (err) {
                            toast.error("Failed to create episode")
                          }
                          setIsCreatingEpisode(false)
                        }}
                        className="border-purple-500/50 text-purple-400"
                      >
                        {isCreatingEpisode ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4 mr-2" />
                        )}
                        Create Your First Episode
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <div className="grid gap-3">
                    {episodes.map((ep) => (
                      <Card
                        key={ep.IDEpisode}
                        className="bg-gray-800 border-gray-700 hover:border-purple-500/50 transition-colors overflow-hidden"
                      >
                        <div className="flex items-center justify-between gap-4 p-4">
                          <button
                            onClick={() => handleSelectEpisode(ep.IDEpisode)}
                            disabled={isLoading}
                            className="flex-1 text-left hover:opacity-80 transition-opacity"
                          >
                            <h3 className="font-display font-semibold text-white">
                              {ep.Title}
                            </h3>
                            {ep.Description && (
                              <p className="text-sm text-gray-400 mt-1">
                                {ep.Description}
                              </p>
                            )}
                          </button>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (expandedEpisodeLinks === ep.IDEpisode) {
                                  setExpandedEpisodeLinks(null)
                                  setNewLinkResult(null)
                                } else {
                                  setExpandedEpisodeLinks(ep.IDEpisode)
                                  setNewLinkResult(null)
                                  loadEpisodeLinks(ep.IDEpisode)
                                }
                              }}
                              className={`h-8 w-8 p-0 ${expandedEpisodeLinks === ep.IDEpisode
                                ? "text-purple-400 bg-purple-500/10"
                                : "text-gray-400 hover:text-purple-400 hover:bg-purple-500/10"
                                }`}
                              title="Manage Host Links"
                            >
                              <Share2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingEpisodeId(ep.IDEpisode)
                              }}
                              className="text-gray-400 hover:text-white hover:bg-gray-700 h-8 w-8 p-0"
                              title="Edit Episode"
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteEpisode(ep.IDEpisode)
                              }}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0"
                              title="Delete Episode"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <ChevronRight className="h-4 w-4 text-gray-500" />
                          </div>
                        </div>

                        {/* Expanded Link Management Section */}
                        <AnimatePresence>
                          {expandedEpisodeLinks === ep.IDEpisode && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="border-t border-gray-700 p-4 space-y-4">
                                {/* Link Creation — single row on large screens */}
                                <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                                  <input
                                    type="text"
                                    value={hostName}
                                    onChange={(e) => setHostName(e.target.value)}
                                    placeholder="Host Name"
                                    className="w-full lg:w-44 px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm placeholder:text-gray-500 focus:border-purple-500 focus:outline-none"
                                  />
                                  <span className="hidden lg:block text-gray-600">|</span>
                                  <div className="flex items-center gap-0">
                                    {[
                                      { label: "1 Day", value: "1d" },
                                      { label: "1 Week", value: "1w" },
                                      { label: "2 Weeks", value: "2w" },
                                      { label: "1 Month", value: "1m" },
                                      { label: "Custom", value: "custom" },
                                    ].map((opt, i) => (
                                      <div key={opt.value} className="flex items-center">
                                        {i > 0 && <span className="text-gray-600 mx-1">|</span>}
                                        <button
                                          onClick={() => setValidityDuration(opt.value)}
                                          className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${validityDuration === opt.value
                                            ? "bg-purple-500 text-white"
                                            : "text-gray-400 hover:text-white"
                                            }`}
                                        >
                                          {opt.label}
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                  <span className="hidden lg:block text-gray-600">|</span>
                                  <Button
                                    size="sm"
                                    onClick={() => handleCreateEpisodeLink(ep.IDEpisode)}
                                    disabled={isCreatingLink || !hostName.trim() || !validityDuration || (validityDuration === "custom" && !customExpiryDate)}
                                    className="bg-purple-600 hover:bg-purple-700 text-white"
                                  >
                                    {isCreatingLink ? (
                                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                                    ) : (
                                      <Plus className="h-4 w-4 mr-1.5" />
                                    )}
                                    Create Link
                                  </Button>
                                </div>
                                {validityDuration === "custom" && (
                                  <input
                                    type="datetime-local"
                                    value={customExpiryDate}
                                    onChange={(e) => setCustomExpiryDate(e.target.value)}
                                    min={new Date().toISOString().slice(0, 16)}
                                    className="w-full sm:w-auto px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm focus:border-purple-500 focus:outline-none"
                                  />
                                )}

                                {/* New link result */}
                                {newLinkResult && (
                                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-sm">
                                    <p className="text-green-400 font-medium mb-1">Link Created!</p>
                                    <div className="flex items-center gap-2 text-gray-300 text-xs">
                                      <span>Room: <span className="text-purple-400 font-mono">{newLinkResult.RoomCode}</span></span>
                                      <span className="text-gray-600">|</span>
                                      <span>PIN: <span className="text-yellow-400 font-mono">{newLinkResult.PIN}</span></span>
                                    </div>
                                    <button
                                      onClick={() => {
                                        const url = `${window.location.origin}/trivia/host/${newLinkResult.token}`
                                        if (navigator.clipboard?.writeText) {
                                          navigator.clipboard.writeText(url).then(() => toast.success("Link copied!"))
                                        } else {
                                          const ta = document.createElement("textarea")
                                          ta.value = url
                                          ta.style.position = "fixed"
                                          ta.style.opacity = "0"
                                          document.body.appendChild(ta)
                                          ta.select()
                                          document.execCommand("copy")
                                          document.body.removeChild(ta)
                                          toast.success("Link copied!")
                                        }
                                      }}
                                      className="mt-2 flex items-center gap-1 text-purple-400 hover:text-purple-300 text-xs"
                                    >
                                      <Copy className="h-3 w-3" />
                                      Copy Link URL
                                    </button>
                                  </div>
                                )}

                                {/* Active Links for this Episode */}
                                <div className="space-y-2">
                                  <h4 className="font-display text-sm font-semibold text-white flex items-center gap-2">
                                    <LinkIcon className="h-3.5 w-3.5 text-purple-400" />
                                    Active Links
                                    {(episodeLinks[ep.IDEpisode]?.length ?? 0) > 0 && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
                                        {episodeLinks[ep.IDEpisode]?.length}
                                      </span>
                                    )}
                                  </h4>
                                  {isLoadingEpisodeLinks ? (
                                    <div className="flex items-center justify-center py-4">
                                      <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                                    </div>
                                  ) : !episodeLinks[ep.IDEpisode]?.length ? (
                                    <p className="text-xs text-gray-500 text-center py-3">No active links for this episode</p>
                                  ) : (
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="text-left text-gray-500 border-b border-gray-700">
                                            <th className="pb-2 font-medium pr-3">Host</th>
                                            <th className="pb-2 font-medium pr-3">Room Code</th>
                                            <th className="pb-2 font-medium pr-3">Issued</th>
                                            <th className="pb-2 font-medium pr-3">Time Left</th>
                                            <th className="pb-2 font-medium text-right">Action</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {episodeLinks[ep.IDEpisode]?.map((link) => (
                                            <tr key={link.IDGameSession} className="border-b border-gray-800/50">
                                              <td className="py-2 pr-3 text-gray-300">{link.HostName || "\u2014"}</td>
                                              <td className="py-2 pr-3">
                                                <span className="text-purple-400 font-mono">{link.RoomCode}</span>
                                              </td>
                                              <td className="py-2 pr-3 text-gray-400">
                                                {new Date(link.CreatedAt).toLocaleDateString()}
                                              </td>
                                              <td className="py-2 pr-3">
                                                <span className={`flex items-center gap-1 ${getTimeRemaining(link.ValidTo) === "Expired"
                                                  ? "text-red-400"
                                                  : "text-green-400"
                                                  }`}>
                                                  <Clock className="h-3 w-3" />
                                                  {getTimeRemaining(link.ValidTo)}
                                                </span>
                                              </td>
                                              <td className="py-2 text-right">
                                                {link.Status?.toLowerCase() === "revoked" ? (
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    disabled
                                                    className="text-red-500 font-semibold h-6 px-3 opacity-100 cursor-not-allowed"
                                                  >
                                                    Revoked
                                                  </Button>
                                                ) : episodeConfirmInputForLink === link.IDGameSession ? (
                                                  <div className="flex items-center gap-1.5 justify-end">
                                                    <input
                                                      type="text"
                                                      placeholder="Type revoke"
                                                      value={episodeRevokeConfirmText}
                                                      onChange={(e) => setEpisodeRevokeConfirmText(e.target.value)}
                                                      className="w-24 px-2 py-1 rounded bg-gray-900 border border-gray-600 text-white text-xs text-center"
                                                      autoFocus
                                                    />
                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      onClick={() => handleRevokeEpisodeLink(link.IDGameSession, ep.IDEpisode)}
                                                      disabled={episodeRevokingId === link.IDGameSession || episodeRevokeConfirmText.toLowerCase() !== "revoke"}
                                                      className="text-red-400 hover:text-red-300 h-6 px-1.5"
                                                    >
                                                      {episodeRevokingId === link.IDGameSession ? (
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                      ) : (
                                                        "OK"
                                                      )}
                                                    </Button>
                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      onClick={() => {
                                                        setEpisodeConfirmInputForLink(null)
                                                        setEpisodeRevokeConfirmText("")
                                                      }}
                                                      className="text-gray-400 h-6 px-1.5"
                                                    >
                                                      <X className="h-3 w-3" />
                                                    </Button>
                                                  </div>
                                                ) : (
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setEpisodeConfirmInputForLink(link.IDGameSession)}
                                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-6 px-2"
                                                  >
                                                    <Unlink className="h-3 w-3 mr-1" />
                                                    Revoke
                                                  </Button>
                                                )}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="session"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Session Header — back button */}
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLeaveSession}
                  className="text-gray-400 hover:text-white"
                >
                  ← Back to Episodes
                </Button>
                {episode && (
                  <span className="text-sm text-gray-500">{episode.Title}</span>
                )}
              </div>

              {/* No session yet — Create Session CTA */}
              {!session ? (
                <div className="space-y-4">
                  <SoundBoardPanel
                    introMusicPlaying={introMusicPlaying}
                    onToggleIntroMusic={handleToggleIntroMusic}
                  />
                  <Card className="bg-gray-800 border-gray-700 overflow-hidden">
                    <div className="p-10 text-center">
                      <Play className="h-16 w-16 text-purple-500/40 mx-auto mb-4" />
                      <p className="font-display text-xl font-semibold text-white mb-2">Ready to Host</p>
                      <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">
                        Create a session to generate a QR code and room link for players to join.
                      </p>
                      <Button
                        onClick={handleCreateSession}
                        disabled={isLoading}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 text-base"
                      >
                        {isLoading ? (
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        ) : (
                          <Play className="h-5 w-5 mr-2" />
                        )}
                        Create Session
                      </Button>
                    </div>
                  </Card>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Macro Phase Bar — full width at top */}
                  <MacroPhaseBar
                    sessionStatus={sessionStatus}
                    sessionId={session.IDGameSession}
                    leaderboard={leaderboard}
                    onRefreshStatus={refreshSessionStatus}
                    hasRulesVideo={!!episode?.RulesVideoUrl}
                    hasSponsorshipVideo={!!(sessionStatus?.SponsorshipVideoUrl || episode?.SponsorshipVideoUrl)}
                  />

                  {/* 2-Column Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                    {/* Left Column (3/5) — Game Content */}
                    <div className="lg:col-span-3 space-y-4">
                      {/* Sound Board — always visible when session is active */}
                      <SoundBoardPanel
                        introMusicPlaying={introMusicPlaying}
                        onToggleIntroMusic={handleToggleIntroMusic}
                      />
                      {sessionStatus?.Status === "active" ? (
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
                      ) : sessionStatus?.Status === "completed" ? (
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
                              <p className="text-sm text-gray-500 mt-1">Use the macro phase controls above to advance through the game phases</p>
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
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Episode Editor Modal */}
      {editingEpisodeId && (
        <EpisodeEditor
          episodeId={editingEpisodeId}
          onClose={() => {
            setEditingEpisodeId(null)
            loadEpisodesList()
          }}
          onUpdate={() => loadEpisodesList()}
        />
      )}

      {/* Host Links Modal */}
      <AnimatePresence>
        {showLinksModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
            onClick={() => setShowLinksModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-5xl max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-white flex items-center gap-2">
                  <LinkIcon className="h-5 w-5 text-purple-400" />
                  Active Host Links
                </h2>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadAllHostLinks}
                    disabled={isLoadingLinks}
                    className="text-gray-400 hover:text-white h-8 w-8 p-0"
                    title="Refresh"
                  >
                    {isLoadingLinks ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                  <button
                    onClick={() => setShowLinksModal(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh]">
                {isLoadingLinks ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                  </div>
                ) : allHostLinks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <LinkIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>No active host links</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
                        <th className="pb-2 font-medium">Host</th>
                        <th className="pb-2 font-medium">Room Code</th>
                        <th className="pb-2 font-medium">Episode</th>
                        <th className="pb-2 font-medium">Issued</th>
                        <th className="pb-2 font-medium">Valid Until</th>
                        <th className="pb-2 font-medium">Time Left</th>
                        <th className="pb-2 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allHostLinks.map((link) => (
                        <tr key={link.IDGameSession} className="border-b border-gray-800/50">
                          <td className="py-3 pr-3">
                            <span className="text-gray-300 text-sm">{link.HostName || "—"}</span>
                          </td>
                          <td className="py-3 pr-3">
                            <span className="text-purple-400 font-mono text-sm">{link.RoomCode}</span>
                          </td>
                          <td className="py-3 pr-3">
                            <span className="text-white text-sm">{link.EpisodeTitle}</span>
                          </td>
                          <td className="py-3 pr-3">
                            <span className="text-gray-400 text-xs">
                              {new Date(link.CreatedAt).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="py-3 pr-3">
                            <span className="text-gray-400 text-xs">
                              {new Date(link.ValidTo).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="py-3 pr-3">
                            <span className={`text-xs flex items-center gap-1 ${getTimeRemaining(link.ValidTo) === "Expired"
                              ? "text-red-400"
                              : "text-green-400"
                              }`}>
                              <Clock className="h-3 w-3" />
                              {getTimeRemaining(link.ValidTo)}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            {link.Status?.toLowerCase() === "revoked" ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled
                                className="text-red-500 font-semibold h-7 px-3 opacity-100 cursor-not-allowed"
                              >
                                Revoked
                              </Button>
                            ) : confirmInputForLink === link.IDGameSession ? (
                              <div className="flex items-center gap-2 justify-end">
                                <input
                                  type="text"
                                  placeholder="Type revoke"
                                  value={revokeConfirmText}
                                  onChange={(e) => setRevokeConfirmText(e.target.value)}
                                  className="w-24 px-2 py-1 rounded bg-gray-800 border border-gray-600 text-white text-xs text-center"
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRevokeLink(link.IDGameSession)}
                                  disabled={revokingLinkId === link.IDGameSession || revokeConfirmText.toLowerCase() !== "revoke"}
                                  className="text-red-400 hover:text-red-300 h-7 px-2"
                                >
                                  {revokingLinkId === link.IDGameSession ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    "Revoke"
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setConfirmInputForLink(null)
                                    setRevokeConfirmText("")
                                  }}
                                  className="text-gray-400 h-7 px-2"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setConfirmInputForLink(link.IDGameSession)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 px-2"
                              >
                                <Unlink className="h-3 w-3 mr-1" />
                                Revoke
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
