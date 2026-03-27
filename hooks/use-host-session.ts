"use client"

import { useState, useCallback, useEffect } from "react"
import {
  sessionsApi,
  episodesApi,
  ApiClientError,
  getAuthToken,
} from "@/lib/api-client"
import { useSessionStatusWebSocket } from "@/hooks/use-session-status-websocket"
import type {
  Session,
  SessionStatusResponse,
  EpisodeWithRounds,
  Team,
  TeamResponse,
  LeaderboardResponse,
  GradeResponse,
  GradeOverrideItem,
  GradeOverrideResponse,
  Question,
  Round,
  RoundWithQuestions,
} from "@/lib/api-types"

// -------------------- Types --------------------
interface HostSessionState {
  // Episode info
  episode: EpisodeWithRounds | null

  // Session info
  session: Session | null
  sessionStatus: SessionStatusResponse | null

  // Teams & Responses
  teams: Team[]
  responses: TeamResponse[]
  leaderboard: LeaderboardResponse | null

  // UI state
  isLoading: boolean
  error: string | null
}

const STORAGE_KEY = "trivitime_host_session"

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

function resolveRoundAndQuestion(
  episode: EpisodeWithRounds | null,
  status: Pick<SessionStatusResponse, "CurrentRound" | "CurrentQuestion"> | null,
  realtimeQuestionId: string | null
): { round: Round | null; question: Question | null } {
  if (!episode || !status) {
    return { round: null, question: null }
  }

  const normalizedRound = toFiniteNumber(status.CurrentRound)
  const normalizedQuestion = toFiniteNumber(status.CurrentQuestion)
  let resolvedRound: RoundWithQuestions | null = null
  let resolvedQuestion: Question | null = null

  if (normalizedRound !== null && normalizedQuestion !== null) {
    const roundByNumber = episode.rounds.find((r) => r.RoundNumber === normalizedRound) || null
    const roundByIndex =
      !roundByNumber && normalizedRound > 0 && normalizedRound <= episode.rounds.length
        ? episode.rounds[normalizedRound - 1]
        : null

    resolvedRound = roundByNumber || roundByIndex

    if (resolvedRound) {
      const questionByOrder = resolvedRound.questions.find((q) => q.QuestionOrder === normalizedQuestion) || null
      const questionByIndex =
        !questionByOrder && normalizedQuestion > 0 && normalizedQuestion <= resolvedRound.questions.length
          ? resolvedRound.questions[normalizedQuestion - 1]
          : null

      resolvedQuestion = questionByOrder || questionByIndex
    }
  }

  if (!resolvedQuestion && realtimeQuestionId) {
    for (const round of episode.rounds) {
      const matchedQuestion = round.questions.find((q) => q.IDQuestion === realtimeQuestionId) || null
      if (matchedQuestion) {
        resolvedRound = round
        resolvedQuestion = matchedQuestion
        break
      }
    }
  }

  return { round: resolvedRound, question: resolvedQuestion }
}

// -------------------- Hook --------------------
export function useHostSession() {
  const [state, setState] = useState<HostSessionState>({
    episode: null,
    session: null,
    sessionStatus: null,
    teams: [],
    responses: [],
    leaderboard: null,
    isLoading: false,
    error: null,
  })

  // Check if authenticated
  const isAuthenticated = typeof window !== "undefined" && !!getAuthToken()
  const {
    status: realtimeStatus,
    lastEvent: realtimeEvent,
    isConnected: isRealtimeConnected,
  } = useSessionStatusWebSocket(state.session?.RoomCode || state.sessionStatus?.RoomCode || null, {
    enabled: !!state.session,
  })

  // Mirror realtime status updates into local host state.
  useEffect(() => {
    if (!realtimeStatus) return

    setState((prev) => ({
      ...prev,
      sessionStatus: prev.sessionStatus ? mergeDefined(prev.sessionStatus, realtimeStatus) : realtimeStatus,
      session: prev.session
        ? mergeDefined(prev.session, realtimeStatus)
        : prev.session,
    }))
  }, [realtimeStatus])

  // Restore session from localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && isAuthenticated) {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          if (parsed.session) {
            setState((prev) => ({
              ...prev,
              session: parsed.session,
            }))
          }
        } catch {
          localStorage.removeItem(STORAGE_KEY)
        }
      }
    }
  }, [isAuthenticated])

  // Persist session
  const persistSession = useCallback((session: Session | null) => {
    if (typeof window !== "undefined") {
      if (session) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ session }))
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [])

  // Load episode
  const loadEpisode = useCallback(async (episodeId: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const episode = await episodesApi.get(episodeId)
      setState((prev) => ({ ...prev, episode, isLoading: false }))
      return episode
    } catch (err) {
      const message = err instanceof ApiClientError ? err.detail : "Failed to load episode"
      setState((prev) => ({ ...prev, isLoading: false, error: message }))
      throw err
    }
  }, [])

  // Create a new session
  const createSession = useCallback(async (episodeId: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      // Load episode first if not already loaded
      let episode = state.episode
      if (!episode || episode.IDEpisode !== episodeId) {
        episode = await episodesApi.get(episodeId)
      }

      const session = await sessionsApi.create({ IDEpisode: episodeId })

      setState((prev) => ({
        ...prev,
        episode,
        session,
        teams: [],
        responses: [],
        leaderboard: null,
        isLoading: false,
      }))

      persistSession(session)
      return session
    } catch (err) {
      const message = err instanceof ApiClientError ? err.detail : "Failed to create session"
      setState((prev) => ({ ...prev, isLoading: false, error: message }))
      throw err
    }
  }, [state.episode, persistSession])

  // Refresh session status
  const refreshSessionStatus = useCallback(async () => {
    if (isRealtimeConnected && state.sessionStatus) return state.sessionStatus
    if (!state.session) return null

    try {
      const status = await sessionsApi.status(state.session.IDGameSession)
      setState((prev) => ({
        ...prev,
        sessionStatus: prev.sessionStatus ? mergeDefined(prev.sessionStatus, status) : status,
        session: prev.session
          ? mergeDefined(prev.session, status)
          : prev.session,
      }))
      return status
    } catch (err) {
      return null
    }
  }, [state.session, state.sessionStatus, isRealtimeConnected])

  // Refresh teams
  const refreshTeams = useCallback(async () => {
    if (!state.session) return []

    try {
      const teams = await sessionsApi.teams(state.session.IDGameSession)
      setState((prev) => ({ ...prev, teams }))
      return teams
    } catch (err) {
      return []
    }
  }, [state.session])

  // Team membership changes can arrive as non-state websocket events.
  // Refresh teams immediately so controller and gameboard stay in lockstep.
  useEffect(() => {
    if (!realtimeEvent || !state.session?.IDGameSession) return

    const eventName = typeof realtimeEvent.event === "string" ? realtimeEvent.event.toLowerCase() : ""
    if (!eventName.includes("team")) return

    void refreshTeams()
  }, [realtimeEvent, state.session?.IDGameSession, refreshTeams])

  // Refresh responses for current question
  const refreshResponses = useCallback(async (questionId?: string) => {
    if (!state.session) return []

    try {
      const responses = await sessionsApi.responses({
        IDGameSession: state.session.IDGameSession,
        IDQuestion: questionId || null,
      })
      setState((prev) => ({ ...prev, responses }))
      return responses
    } catch (err) {
      return []
    }
  }, [state.session])

  // Refresh leaderboard
  const refreshLeaderboard = useCallback(async () => {
    if (!state.session) return null

    try {
      const leaderboard = await sessionsApi.leaderboard(state.session.IDGameSession)
      setState((prev) => ({ ...prev, leaderboard }))
      return leaderboard
    } catch (err) {
      return null
    }
  }, [state.session])

  // Start the session
  const startSession = useCallback(async () => {
    if (!state.session) throw new Error("No session to start")

    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const session = await sessionsApi.start(state.session.IDGameSession)
      setState((prev) => ({
        ...prev,
        session,
        isLoading: false,
      }))
      persistSession(session)
      return session
    } catch (err) {
      const message = err instanceof ApiClientError ? err.detail : "Failed to start session"
      setState((prev) => ({ ...prev, isLoading: false, error: message }))
      throw err
    }
  }, [state.session, persistSession])

  // Next question
  const nextQuestion = useCallback(async () => {
    if (!state.session) throw new Error("No session")

    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const session = await sessionsApi.nextQuestion(state.session.IDGameSession)
      setState((prev) => ({
        ...prev,
        session,
        responses: [], // Clear responses for new question
        isLoading: false,
      }))
      persistSession(session)
      return session
    } catch (err) {
      const message = err instanceof ApiClientError ? err.detail : "Failed to advance question"
      setState((prev) => ({ ...prev, isLoading: false, error: message }))
      throw err
    }
  }, [state.session, persistSession])

  // Grade responses
  const gradeResponses = useCallback(async (): Promise<GradeResponse | null> => {
    if (!state.session) throw new Error("No session")

    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const result = await sessionsApi.grade({
        IDGameSession: state.session.IDGameSession,
      })
      setState((prev) => ({ ...prev, isLoading: false }))

      // Refresh leaderboard after grading
      await refreshLeaderboard()

      return result
    } catch (err) {
      const message = err instanceof ApiClientError ? err.detail : "Failed to grade responses"
      setState((prev) => ({ ...prev, isLoading: false, error: message }))
      throw err
    }
  }, [state.session, refreshLeaderboard])

  // Grade override (manual grading for open_ended)
  const gradeOverride = useCallback(async (overrides: GradeOverrideItem[]): Promise<GradeOverrideResponse | null> => {
    if (!state.session) throw new Error("No session")

    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const result = await sessionsApi.gradeOverride({
        IDGameSession: state.session.IDGameSession,
        overrides,
      })
      setState((prev) => ({ ...prev, isLoading: false }))

      // Refresh leaderboard and responses after override
      await refreshLeaderboard()

      return result
    } catch (err) {
      const message = err instanceof ApiClientError ? err.detail : "Failed to submit grade override"
      setState((prev) => ({ ...prev, isLoading: false, error: message }))
      throw err
    }
  }, [state.session, refreshLeaderboard])

  // Kick a team
  const kickTeam = useCallback(async (teamId: string) => {
    if (!state.session) throw new Error("No session")

    try {
      await sessionsApi.kick({
        IDGameSession: state.session.IDGameSession,
        IDTeam: teamId,
      })
      await refreshTeams()
    } catch (err) {
      const message = err instanceof ApiClientError ? err.detail : "Failed to kick team"
      setState((prev) => ({ ...prev, error: message }))
      throw err
    }
  }, [state.session, refreshTeams])

  // End session
  const endSession = useCallback(async () => {
    if (!state.session) throw new Error("No session")

    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const session = await sessionsApi.end(state.session.IDGameSession)
      setState((prev) => ({
        ...prev,
        session,
        isLoading: false,
      }))
      persistSession(session)
      return session
    } catch (err) {
      const message = err instanceof ApiClientError ? err.detail : "Failed to end session"
      setState((prev) => ({ ...prev, isLoading: false, error: message }))
      throw err
    }
  }, [state.session, persistSession])

  // Restart session
  const restartSession = useCallback(async () => {
    if (!state.session) throw new Error("No session")

    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const session = await sessionsApi.restart(state.session.IDGameSession)
      setState((prev) => ({
        ...prev,
        session,
        responses: [],
        isLoading: false,
      }))
      persistSession(session)
      return session
    } catch (err) {
      const message = err instanceof ApiClientError ? err.detail : "Failed to restart session"
      setState((prev) => ({ ...prev, isLoading: false, error: message }))
      throw err
    }
  }, [state.session, persistSession])

  // Clear session
  const clearSession = useCallback(() => {
    setState({
      episode: null,
      session: null,
      sessionStatus: null,
      teams: [],
      responses: [],
      leaderboard: null,
      isLoading: false,
      error: null,
    })
    persistSession(null)
  }, [persistSession])

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  // Get current question from episode
  const getCurrentQuestion = useCallback(() => {
    const statusSource = state.sessionStatus || state.session
    if (!state.episode || !statusSource) return null

    const resolved = resolveRoundAndQuestion(
      state.episode,
      {
        CurrentRound: statusSource.CurrentRound,
        CurrentQuestion: statusSource.CurrentQuestion,
      },
      extractRealtimeQuestionId(state.sessionStatus)
    )

    return resolved.question
  }, [state.episode, state.session, state.sessionStatus])

  // Get current round from episode
  const getCurrentRound = useCallback(() => {
    const statusSource = state.sessionStatus || state.session
    if (!state.episode || !statusSource) return null

    const resolved = resolveRoundAndQuestion(
      state.episode,
      {
        CurrentRound: statusSource.CurrentRound,
        CurrentQuestion: statusSource.CurrentQuestion,
      },
      extractRealtimeQuestionId(state.sessionStatus)
    )

    return resolved.round
  }, [state.episode, state.session, state.sessionStatus])

  return {
    // State
    ...state,
    isAuthenticated,
    hasSession: !!state.session,
    isRealtimeConnected,

    // Computed
    currentQuestion: getCurrentQuestion(),
    currentRound: getCurrentRound(),

    // Actions
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
  }
}
