"use client"

import { useState, useCallback, useEffect } from "react"
import {
  sessionsApi,
  episodesApi,
  ApiClientError,
  getAuthToken,
} from "@/lib/api-client"
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
    if (!state.session) return null

    try {
      const status = await sessionsApi.status(state.session.IDGameSession)
      setState((prev) => ({ ...prev, sessionStatus: status }))
      return status
    } catch (err) {
      return null
    }
  }, [state.session])

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
    if (!state.episode || !state.session) return null

    const { CurrentRound, CurrentQuestion } = state.session
    if (CurrentRound === null || CurrentQuestion === null) return null

    const round = state.episode.rounds.find((r) => r.RoundNumber === CurrentRound)
    if (!round) return null

    const question = round.questions.find((q) => q.QuestionOrder === CurrentQuestion)
    return question || null
  }, [state.episode, state.session])

  // Get current round from episode
  const getCurrentRound = useCallback(() => {
    if (!state.episode || !state.session) return null

    const { CurrentRound } = state.session
    if (CurrentRound === null) return null

    return state.episode.rounds.find((r) => r.RoundNumber === CurrentRound) || null
  }, [state.episode, state.session])

  return {
    // State
    ...state,
    isAuthenticated,
    hasSession: !!state.session,

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
