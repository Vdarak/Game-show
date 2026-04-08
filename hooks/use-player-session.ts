"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { sessionsApi, ApiClientError } from "@/lib/api-client"
import { useSessionStatusWebSocket, type SessionSocketEvent } from "@/hooks/use-session-status-websocket"
import type {
  Team,
  CurrentQuestionResponse,
  SubmitAnswerResponse,
  LeaderboardResponse,
  SessionStatusResponse,
  PointPoolResponse,
} from "@/lib/api-types"

// -------------------- Types --------------------
interface PlayerSessionState {
  // Connection info
  roomCode: string | null
  gameSessionId: string | null

  // Team info
  team: Team | null

  // Game state
  sessionStatus: SessionStatusResponse | null
  rulesContent: string[]
  currentQuestion: CurrentQuestionResponse | null
  availableWagers: number[]

  // Submission state
  lastSubmission: SubmitAnswerResponse | null
  hasSubmittedCurrentQuestion: boolean

  // Leaderboard
  leaderboard: LeaderboardResponse | null

  // UI state
  isLoading: boolean
  error: string | null
  kickNotice: string | null
}


const STORAGE_KEY = "trivitime_player_session"
const RULES_CACHE_PREFIX = "trivitime_player_rules"
const KICK_NOTICE_KEY = "trivitime_player_kick_notice"
const ERROR_DISMISS_MS = 4000

function normalizeRulesContent(rules: unknown): string[] | null {
  if (!Array.isArray(rules)) return null
  return rules
    .map((rule) => (typeof rule === "string" ? rule.trim() : ""))
    .filter((rule) => rule.length > 0)
}

function getRulesCacheKey(gameSessionId: string): string {
  return `${RULES_CACHE_PREFIX}:${gameSessionId}`
}

function getCachedRulesContent(gameSessionId: string): string[] | null {
  if (typeof window === "undefined") return null

  const cached = localStorage.getItem(getRulesCacheKey(gameSessionId))
  if (!cached) return null

  try {
    const parsed = JSON.parse(cached)
    return normalizeRulesContent(parsed)
  } catch {
    localStorage.removeItem(getRulesCacheKey(gameSessionId))
    return null
  }
}

function cacheRulesContent(gameSessionId: string, rulesContent: string[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(getRulesCacheKey(gameSessionId), JSON.stringify(rulesContent))
}

function getStoredKickNotice(): string | null {
  if (typeof window === "undefined") return null
  const stored = localStorage.getItem(KICK_NOTICE_KEY)
  return stored && stored.trim().length > 0 ? stored : null
}

function setStoredKickNotice(notice: string | null) {
  if (typeof window === "undefined") return
  if (notice && notice.trim().length > 0) {
    localStorage.setItem(KICK_NOTICE_KEY, notice)
    return
  }
  localStorage.removeItem(KICK_NOTICE_KEY)
}

function normalizeStringArray(values: unknown): string[] | null {
  if (!Array.isArray(values)) return null
  return values
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0)
}

function normalizeNumberArray(values: unknown): number[] | null {
  if (!Array.isArray(values)) return null
  const parsed = values
    .map((value) => {
      if (typeof value === "number") return Number.isFinite(value) ? value : null
      if (typeof value === "string") {
        const asNumber = Number(value)
        return Number.isFinite(asNumber) ? asNumber : null
      }
      return null
    })
    .filter((value): value is number => value !== null)
  return parsed
}

function normalizeQuestionType(
  rawType: unknown,
  options: string[] | null
): CurrentQuestionResponse["QuestionType"] {
  if (rawType === "multiple_choice" || rawType === "true_false" || rawType === "open_ended") {
    return rawType
  }

  if (options?.length === 2 && options.every((option) => option === "True" || option === "False")) {
    return "true_false"
  }

  return "multiple_choice"
}

function normalizeRealtimeQuestion(status: SessionStatusResponse): CurrentQuestionResponse | null {
  const statusWithQuestion = status as SessionStatusResponse & {
    question?: unknown
    Question?: unknown
  }

  const rawQuestion = statusWithQuestion.question ?? statusWithQuestion.Question
  if (!rawQuestion || typeof rawQuestion !== "object") return null

  const raw = rawQuestion as Record<string, unknown>
  const options = normalizeStringArray(raw.Options ?? raw.options)
  const availableWagers = normalizeNumberArray(
    raw.AvailableWagers ?? raw.available_wagers ?? raw.AvailableValues ?? raw.available_values
  )

  const idQuestion =
    typeof raw.IDQuestion === "string"
      ? raw.IDQuestion
      : typeof raw.id_question === "string"
        ? raw.id_question
        : null

  if (!idQuestion) return null

  const questionOrder =
    typeof raw.QuestionOrder === "number"
      ? raw.QuestionOrder
      : typeof raw.question_order === "number"
        ? raw.question_order
        : status.CurrentQuestion ?? 0

  return {
    IDQuestion: idQuestion,
    IDRound:
      typeof raw.IDRound === "string"
        ? raw.IDRound
        : typeof raw.id_round === "string"
          ? raw.id_round
          : "",
    QuestionOrder: questionOrder,
    Category:
      typeof raw.Category === "string"
        ? raw.Category
        : typeof raw.category === "string"
          ? raw.category
          : null,
    QuestionText:
      typeof raw.QuestionText === "string"
        ? raw.QuestionText
        : typeof raw.question_text === "string"
          ? raw.question_text
          : "",
    QuestionType: normalizeQuestionType(raw.QuestionType ?? raw.question_type, options),
    Options: options,
    QuestionVideoUrl:
      typeof raw.QuestionVideoUrl === "string"
        ? raw.QuestionVideoUrl
        : typeof raw.question_video_url === "string"
          ? raw.question_video_url
          : null,
    TimerSeconds:
      typeof raw.TimerSeconds === "number"
        ? raw.TimerSeconds
        : typeof raw.timer_seconds === "number"
          ? raw.timer_seconds
          : (status.TimerTotal ?? 0),
    AvailableWagers: availableWagers ?? [],
    QuestionStartedAt:
      typeof raw.QuestionStartedAt === "string"
        ? raw.QuestionStartedAt
        : typeof raw.question_started_at === "string"
          ? raw.question_started_at
          : (status.QuestionStartedAt ?? ""),
  }
}

interface TeamKickedEvent {
  IDTeam: string
  TeamName: string | null
}

function parseTeamKickedEvent(event: SessionSocketEvent | null): TeamKickedEvent | null {
  if (!event || event.event !== "team_kicked") return null

  const rawTeamId = event.IDTeam ?? event.id_team
  if (typeof rawTeamId !== "string" || rawTeamId.trim().length === 0) return null

  const rawTeamName = event.TeamName ?? event.team_name

  return {
    IDTeam: rawTeamId,
    TeamName: typeof rawTeamName === "string" && rawTeamName.trim().length > 0 ? rawTeamName : null,
  }
}

// Map raw API errors to player-friendly messages
function friendlyError(raw: string): string {
  const lower = raw.toLowerCase()

  // Timer / submission
  if (lower.includes("timer_ended") || lower.includes("timer must be running"))
    return "⏰ Time's up! Your answer wasn't submitted in time."
  if (lower.includes("already submitted") || lower.includes("duplicate"))
    return "✅ You already submitted an answer for this question."
  if (lower.includes("cannot submit"))
    return "🚫 Submissions are closed for this question."

  // Joining
  if (lower.includes("room code") || lower.includes("room not found") || lower.includes("invalid room"))
    return "🔍 That room code doesn't exist. Check the code and try again."
  if (
    lower.includes("cannot join session") &&
    lower.includes("active") &&
    lower.includes("must be in lobby")
  ) {
    return "🚫 This game is already in progress. You can only join while the session is in lobby."
  }
  if (lower.includes("team name") && lower.includes("taken"))
    return "👥 That team name is already taken. Pick a different one!"
  if (lower.includes("team name"))
    return "✏️ Please enter a valid team name."
  if (lower.includes("session") && (lower.includes("not active") || lower.includes("not found")))
    return "🚪 This game session isn't active. Ask the host for the right code."
  if (lower.includes("avatar"))
    return "🎨 There was a problem with your avatar. Try a different one."

  // Network
  if (lower.includes("network") || lower.includes("fetch") || lower.includes("failed to fetch"))
    return "📶 Connection lost. Check your internet and try again."
  if (lower.includes("timeout"))
    return "⏳ The server took too long to respond. Try again."

  // Fallback: if it looks like a technical error, hide the details
  if (lower.includes("error") || lower.includes("fail") || lower.includes("cannot"))
    return "😕 Something went wrong. Please try again."

  return raw
}

function buildInitialPlayerSessionState(kickNotice: string | null = null): PlayerSessionState {
  return {
    roomCode: null,
    gameSessionId: null,
    team: null,
    sessionStatus: null,
    rulesContent: [],
    currentQuestion: null,
    availableWagers: [],
    lastSubmission: null,
    hasSubmittedCurrentQuestion: false,
    leaderboard: null,
    isLoading: false,
    error: null,
    kickNotice,
  }
}

// -------------------- Hook --------------------
export function usePlayerSession() {
  const [state, setState] = useState<PlayerSessionState>(() => buildInitialPlayerSessionState())

  // Track whether localStorage has been loaded
  const [isHydrated, setIsHydrated] = useState(false)
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pointPoolRequestKeyRef = useRef<string | null>(null)
  const {
    status: realtimeStatus,
    lastEvent: realtimeEvent,
    isConnected: isRealtimeConnected,
  } = useSessionStatusWebSocket(state.roomCode, {
    enabled: !!state.roomCode,
  })

  const clearSession = useCallback((options?: { kickNotice?: string | null }) => {
    const kickNotice = options?.kickNotice ?? null

    setState(buildInitialPlayerSessionState(kickNotice))

    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY)
    }

    setStoredKickNotice(kickNotice)
  }, [])

  const applySessionStatus = useCallback((status: SessionStatusResponse) => {
    const normalizedRules = normalizeRulesContent(status.RulesContent)
    const normalizedQuestion = normalizeRealtimeQuestion(status)

    if (normalizedRules !== null) {
      cacheRulesContent(status.IDGameSession, normalizedRules)
    }

    setState((prev) => {
      const questionIndexChanged =
        typeof status.CurrentQuestion === "number" &&
        !!prev.currentQuestion &&
        prev.currentQuestion.QuestionOrder !== status.CurrentQuestion

      const questionIdChanged =
        !!normalizedQuestion &&
        normalizedQuestion.IDQuestion !== prev.currentQuestion?.IDQuestion

      const questionChanged = questionIdChanged || (!normalizedQuestion && questionIndexChanged)

      const shouldClearQuestion =
        status.Status !== "active" ||
        status.CurrentQuestion === null ||
        status.GameState === "lobby" ||
        status.GameState === "welcome" ||
        status.GameState === "rules" ||
        status.GameState === "break" ||
        status.GameState === "completed"

      const nextQuestion = (() => {
        if (normalizedQuestion) return normalizedQuestion
        if (shouldClearQuestion) return null
        if (questionIndexChanged) {
          // Question index changed but payload was omitted in this frame; avoid showing stale question text.
          return null
        }
        return prev.currentQuestion
      })()

      const nextWagers =
        normalizedQuestion?.AvailableWagers && normalizedQuestion.AvailableWagers.length > 0
          ? normalizedQuestion.AvailableWagers
          : questionChanged || shouldClearQuestion
            ? []
            : prev.availableWagers

      return {
        ...prev,
        roomCode: prev.roomCode || status.RoomCode,
        gameSessionId: prev.gameSessionId || status.IDGameSession,
        // Keep optional fields from previous status when sparse WS frames omit them.
        sessionStatus: {
          ...(prev.sessionStatus ?? status),
          ...status,
        },
        rulesContent: normalizedRules ?? prev.rulesContent,
        currentQuestion: nextQuestion,
        availableWagers: nextWagers,
        hasSubmittedCurrentQuestion: questionChanged ? false : prev.hasSubmittedCurrentQuestion,
        lastSubmission: questionChanged ? null : prev.lastSubmission,
      }
    })
  }, [])

  // Mirror realtime session updates into local state.
  useEffect(() => {
    if (!realtimeStatus) return

    applySessionStatus(realtimeStatus)
  }, [realtimeStatus, applySessionStatus])

  useEffect(() => {
    const kickedEvent = parseTeamKickedEvent(realtimeEvent)
    const currentTeam = state.team

    if (!kickedEvent || !currentTeam || kickedEvent.IDTeam !== currentTeam.IDTeam) return

    const targetTeamName = kickedEvent.TeamName || currentTeam.TeamName
    clearSession({
      kickNotice: targetTeamName
        ? `You have been kicked from the game (${targetTeamName}).`
        : "You have been kicked from the game.",
    })
  }, [realtimeEvent, state.team, clearSession])

  // Backfill wagers only when websocket question payload does not include them.
  useEffect(() => {
    const sessionId = state.gameSessionId
    const teamId = state.team?.IDTeam
    const questionId = state.currentQuestion?.IDQuestion

    if (!sessionId || !teamId || state.sessionStatus?.Status !== "active" || !questionId) {
      pointPoolRequestKeyRef.current = null
      return
    }

    const requestKey = `${sessionId}:${teamId}:${questionId}`

    if (state.availableWagers.length > 0) {
      pointPoolRequestKeyRef.current = requestKey
      return
    }

    if (pointPoolRequestKeyRef.current === requestKey && state.availableWagers.length > 0) return
    pointPoolRequestKeyRef.current = requestKey

    void sessionsApi
      .pointPool({
        IDGameSession: sessionId,
        IDTeam: teamId,
      })
      .then((pool) => {
        setState((prev) => {
          if (prev.currentQuestion?.IDQuestion !== questionId) return prev
          return {
            ...prev,
            availableWagers: pool.AvailableValues,
          }
        })
      })
      .catch(() => {
        // Ignore; wagers may still arrive via websocket status.
      })
  }, [
    state.gameSessionId,
    state.team?.IDTeam,
    state.sessionStatus?.Status,
    state.currentQuestion?.IDQuestion,
    state.availableWagers.length,
  ])

  // Set error with auto-dismiss
  const setErrorWithAutoDismiss = useCallback((message: string) => {
    const friendly = friendlyError(message)
    setState((prev) => ({ ...prev, error: friendly }))
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    errorTimerRef.current = setTimeout(() => {
      setState((prev) => ({ ...prev, error: null }))
    }, ERROR_DISMISS_MS)
  }, [])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    }
  }, [])

  // Restore session from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedKickNotice = getStoredKickNotice()
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setState((prev) => ({
            ...prev,
            roomCode: parsed.roomCode || null,
            gameSessionId: parsed.gameSessionId || null,
            team: parsed.team || null,
            rulesContent: parsed.gameSessionId ? (getCachedRulesContent(parsed.gameSessionId) || []) : [],
            kickNotice: storedKickNotice,
          }))
        } catch {
          localStorage.removeItem(STORAGE_KEY)
        }
      } else if (storedKickNotice) {
        setState((prev) => ({ ...prev, kickNotice: storedKickNotice }))
      }
      setIsHydrated(true)
    }
  }, [])

  // Persist session to localStorage
  const persistSession = useCallback((updates: Partial<PlayerSessionState>) => {
    if (typeof window !== "undefined") {
      const toStore = {
        roomCode: updates.roomCode ?? state.roomCode,
        gameSessionId: updates.gameSessionId ?? state.gameSessionId,
        team: updates.team ?? state.team,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore))
    }
  }, [state.roomCode, state.gameSessionId, state.team])

  // Join a game session
  const joinSession = useCallback(async (roomCode: string, teamName: string, avatarBase64?: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const team = await sessionsApi.join({
        RoomCode: roomCode.toUpperCase(),
        TeamName: teamName,
        AvatarBase64: avatarBase64 || null,
      })

      const updates = {
        roomCode: roomCode.toUpperCase(),
        gameSessionId: team.IDGameSession,
        team,
      }

      // Reset all game state when joining a new session
      setStoredKickNotice(null)
      setState({
        ...updates,
        sessionStatus: null,
        rulesContent: [],
        currentQuestion: null,
        availableWagers: [],
        lastSubmission: null,
        hasSubmittedCurrentQuestion: false,
        leaderboard: null,
        isLoading: false,
        error: null,
        kickNotice: null,
      })

      persistSession(updates)

      // Prefetch full status to warm cache for rules content and initial state.
      void sessionsApi
        .status(team.IDGameSession)
        .then(applySessionStatus)
        .catch(() => {
          // Non-blocking prefetch; websocket/other fetch paths will still hydrate state.
        })

      return team
    } catch (err) {
      const message = err instanceof ApiClientError ? err.detail : "Failed to join session"
      setErrorWithAutoDismiss(message)
      setState((prev) => ({ ...prev, isLoading: false }))
      throw err
    }
  }, [persistSession])

  // Get session status
  const refreshSessionStatus = useCallback(async () => {
    if (isRealtimeConnected && state.sessionStatus) return state.sessionStatus
    if (!state.gameSessionId) return null

    try {
      const status = await sessionsApi.status(state.gameSessionId)
      applySessionStatus(status)
      return status
    } catch (err) {
      const message = err instanceof ApiClientError ? err.detail : "Failed to get session status"
      setErrorWithAutoDismiss(message)
      return null
    }
  }, [state.gameSessionId, state.sessionStatus, isRealtimeConnected, setErrorWithAutoDismiss, applySessionStatus])

  // Current question comes from realtime status payload; no extra API request needed.
  const refreshCurrentQuestion = useCallback(async () => {
    return state.currentQuestion
  }, [state.currentQuestion])

  // Get point pool
  const refreshPointPool = useCallback(async () => {
    if (!state.gameSessionId || !state.team) return null

    try {
      const pool = await sessionsApi.pointPool({
        IDGameSession: state.gameSessionId,
        IDTeam: state.team.IDTeam,
      })

      setState((prev) => ({
        ...prev,
        availableWagers: pool.AvailableValues,
      }))

      return pool
    } catch (err) {
      return null
    }
  }, [state.gameSessionId, state.team])

  // Submit an answer
  const submitAnswer = useCallback(async (answerText: string, wageredPoints: number) => {
    if (!state.gameSessionId || !state.team || !state.currentQuestion) {
      throw new Error("Cannot submit: missing session, team, or question")
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await sessionsApi.submit({
        IDGameSession: state.gameSessionId,
        IDTeam: state.team.IDTeam,
        IDQuestion: state.currentQuestion.IDQuestion,
        AnswerText: answerText,
        WageredPoints: wageredPoints,
      })

      // Remove used wager from available list
      setState((prev) => ({
        ...prev,
        lastSubmission: response,
        hasSubmittedCurrentQuestion: true,
        availableWagers: prev.availableWagers.filter((w) => w !== wageredPoints),
        isLoading: false,
      }))

      return response
    } catch (err) {
      const message = err instanceof ApiClientError ? err.detail : "Failed to submit answer"
      setErrorWithAutoDismiss(message)
      setState((prev) => ({ ...prev, isLoading: false }))
      throw err
    }
  }, [state.gameSessionId, state.team, state.currentQuestion])

  // Get leaderboard
  const refreshLeaderboard = useCallback(async () => {
    if (!state.gameSessionId) return null

    try {
      const leaderboard = await sessionsApi.leaderboard(state.gameSessionId)
      setState((prev) => ({ ...prev, leaderboard }))
      return leaderboard
    } catch (err) {
      return null
    }
  }, [state.gameSessionId])

  // Leave session through API then clear local session.
  const leaveSession = useCallback(async () => {
    if (!state.gameSessionId || !state.team?.IDTeam) {
      clearSession()
      return
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      await sessionsApi.leave({
        IDGameSession: state.gameSessionId,
        IDTeam: state.team.IDTeam,
      })

      clearSession()
    } catch (err) {
      const message = err instanceof ApiClientError ? err.detail : "Failed to leave session"
      setErrorWithAutoDismiss(message)
      setState((prev) => ({ ...prev, isLoading: false }))
      throw err
    }
  }, [state.gameSessionId, state.team, clearSession, setErrorWithAutoDismiss])

  const consumeKickNotice = useCallback(() => {
    setStoredKickNotice(null)
    setState((prev) => ({ ...prev, kickNotice: null }))
  }, [])

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  return {
    // State
    ...state,
    isHydrated,
    isInSession: !!state.team && !!state.gameSessionId,
    isRealtimeConnected,

    // Actions
    joinSession,
    refreshSessionStatus,
    refreshCurrentQuestion,
    refreshPointPool,
    submitAnswer,
    refreshLeaderboard,
    leaveSession,
    clearSession,
    consumeKickNotice,
    clearError,
  }
}
