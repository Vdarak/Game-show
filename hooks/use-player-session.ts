"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { sessionsApi, ApiClientError } from "@/lib/api-client"
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
}


const STORAGE_KEY = "trivitime_player_session"
const ERROR_DISMISS_MS = 4000

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

// -------------------- Hook --------------------
export function usePlayerSession() {
  const [state, setState] = useState<PlayerSessionState>({
    roomCode: null,
    gameSessionId: null,
    team: null,
    sessionStatus: null,
    currentQuestion: null,
    availableWagers: [],
    lastSubmission: null,
    hasSubmittedCurrentQuestion: false,
    leaderboard: null,
    isLoading: false,
    error: null,
  })

  // Track whether localStorage has been loaded
  const [isHydrated, setIsHydrated] = useState(false)
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setState((prev) => ({
            ...prev,
            roomCode: parsed.roomCode || null,
            gameSessionId: parsed.gameSessionId || null,
            team: parsed.team || null,
          }))
        } catch {
          localStorage.removeItem(STORAGE_KEY)
        }
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
      setState({
        ...updates,
        sessionStatus: null,
        currentQuestion: null,
        availableWagers: [],
        lastSubmission: null,
        hasSubmittedCurrentQuestion: false,
        leaderboard: null,
        isLoading: false,
        error: null,
      })

      persistSession(updates)
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
    if (!state.gameSessionId) return null

    try {
      const status = await sessionsApi.status(state.gameSessionId)
      setState((prev) => ({ ...prev, sessionStatus: status }))
      return status
    } catch (err) {
      const message = err instanceof ApiClientError ? err.detail : "Failed to get session status"
      setErrorWithAutoDismiss(message)
      return null
    }
  }, [state.gameSessionId])

  // Get current question
  const refreshCurrentQuestion = useCallback(async () => {
    if (!state.gameSessionId || !state.team) return null

    try {
      const question = await sessionsApi.currentQuestion({
        IDGameSession: state.gameSessionId,
        IDTeam: state.team.IDTeam,
      })

      // Check if this is a new question (different from previous)
      const isNewQuestion = !state.currentQuestion ||
        state.currentQuestion.IDQuestion !== question.IDQuestion

      setState((prev) => ({
        ...prev,
        currentQuestion: question,
        availableWagers: question.AvailableWagers,
        hasSubmittedCurrentQuestion: isNewQuestion ? false : prev.hasSubmittedCurrentQuestion,
        lastSubmission: isNewQuestion ? null : prev.lastSubmission,
      }))

      return question
    } catch (err) {
      // 404 likely means no active question yet
      if (err instanceof ApiClientError && err.status === 404) {
        setState((prev) => ({ ...prev, currentQuestion: null }))
        return null
      }
      const message = err instanceof ApiClientError ? err.detail : "Failed to get question"
      setErrorWithAutoDismiss(message)
      return null
    }
  }, [state.gameSessionId, state.team, state.currentQuestion])

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

  // Clear session (leave game)
  const clearSession = useCallback(() => {
    setState({
      roomCode: null,
      gameSessionId: null,
      team: null,
      sessionStatus: null,
      currentQuestion: null,
      availableWagers: [],
      lastSubmission: null,
      hasSubmittedCurrentQuestion: false,
      leaderboard: null,
      isLoading: false,
      error: null,
    })
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY)
    }
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

    // Actions
    joinSession,
    refreshSessionStatus,
    refreshCurrentQuestion,
    refreshPointPool,
    submitAnswer,
    refreshLeaderboard,
    clearSession,
    clearError,
  }
}
