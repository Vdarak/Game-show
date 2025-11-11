"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface Answer {
  id: string
  text: string
  points: number
  revealed: boolean
}

interface Question {
  id: string
  text: string
  answers: Answer[]
}

interface Team {
  id: string
  name: string
  score: number
  currentRoundScore: number
  color: string
  theme: string
  strikes: number
}

interface GameState {
  teams: Team[]
  strikes: number
  questions: Question[]
  currentQuestionIndex: number
  currentQuestion: Question | null
  gamePhase: "setup" | "playing" | "stealing" | "roundEnd"
}

const DEFAULT_STATE: GameState = {
  teams: [
    {
      id: "A",
      name: "Team A",
      score: 0,
      currentRoundScore: 0,
      color: "#3B82F6",
      theme: "default",
      strikes: 0,
    },
    {
      id: "B",
      name: "Team B",
      score: 0,
      currentRoundScore: 0,
      color: "#EF4444",
      theme: "default",
      strikes: 0,
    },
    {
      id: "C",
      name: "Team C",
      score: 0,
      currentRoundScore: 0,
      color: "#10B981",
      theme: "default",
      strikes: 0,
    },
    {
      id: "D",
      name: "Team D",
      score: 0,
      currentRoundScore: 0,
      color: "#F59E0B",
      theme: "default",
      strikes: 0,
    },
  ],
  strikes: 0,
  questions: [
    {
      id: "1",
      text: "Name something people do when they can't sleep",
      answers: [
        { id: "1", text: "Count sheep", points: 45, revealed: false },
        { id: "2", text: "Watch TV", points: 30, revealed: false },
        { id: "3", text: "Read", points: 15, revealed: false },
        { id: "4", text: "Drink warm milk", points: 10, revealed: false },
        { id: "5", text: "Check phone", points: 8, revealed: false },
        { id: "6", text: "Exercise", points: 5, revealed: false },
        { id: "7", text: "Listen to music", points: 3, revealed: false },
        { id: "8", text: "Meditate", points: 2, revealed: false },
        { id: "9", text: "Take sleeping pills", points: 1, revealed: false },
        { id: "10", text: "Toss and turn", points: 1, revealed: false },
      ],
    },
    {
      id: "2",
      text: "Name a popular pizza topping",
      answers: [
        { id: "1", text: "Pepperoni", points: 60, revealed: false },
        { id: "2", text: "Cheese", points: 25, revealed: false },
        { id: "3", text: "Mushrooms", points: 10, revealed: false },
        { id: "4", text: "Sausage", points: 5, revealed: false },
        { id: "5", text: "Onions", points: 4, revealed: false },
        { id: "6", text: "Peppers", points: 3, revealed: false },
        { id: "7", text: "Bacon", points: 2, revealed: false },
        { id: "8", text: "Olives", points: 1, revealed: false },
        { id: "9", text: "Pineapple", points: 1, revealed: false },
        { id: "10", text: "Anchovies", points: 1, revealed: false },
      ],
    },
    {
      id: "3",
      text: "Name something you might find in a garage",
      answers: [
        { id: "1", text: "Car", points: 50, revealed: false },
        { id: "2", text: "Tools", points: 35, revealed: false },
        { id: "3", text: "Bicycle", points: 10, revealed: false },
        { id: "4", text: "Lawn mower", points: 5, revealed: false },
        { id: "5", text: "Workbench", points: 4, revealed: false },
        { id: "6", text: "Boxes", points: 3, revealed: false },
        { id: "7", text: "Shelves", points: 2, revealed: false },
        { id: "8", text: "Paint", points: 1, revealed: false },
        { id: "9", text: "Sports equipment", points: 1, revealed: false },
        { id: "10", text: "Christmas decorations", points: 1, revealed: false },
      ],
    },
  ],
  currentQuestionIndex: 0,
  currentQuestion: null,
  gamePhase: "playing",
}

function migrateOldState(savedState: any): GameState {
  // If state already has teams array, migrate it and use latest questions
  if (savedState.teams && Array.isArray(savedState.teams)) {
    return {
      ...savedState,
      questions: DEFAULT_STATE.questions, // Always use latest questions
    } as GameState
  }

  // Migrate from old teamA/teamB format to new teams array format
  const migratedState: GameState = {
    ...DEFAULT_STATE,
    teams: [
      {
        id: "A",
        name: savedState.teamA?.name || "Team A",
        score: savedState.teamA?.score || 0,
        currentRoundScore: savedState.teamA?.currentRoundScore || 0,
        color: savedState.teamA?.color || "#3B82F6",
        theme: savedState.teamA?.theme || "default",
        strikes: savedState.teamA?.strikes || 0,
      },
      {
        id: "B",
        name: savedState.teamB?.name || "Team B",
        score: savedState.teamB?.score || 0,
        currentRoundScore: savedState.teamB?.currentRoundScore || 0,
        color: savedState.teamB?.color || "#EF4444",
        theme: savedState.teamB?.theme || "default",
        strikes: savedState.teamB?.strikes || 0,
      },
      {
        id: "C",
        name: "Team C",
        score: 0,
        currentRoundScore: 0,
        color: "#10B981",
        theme: "default",
        strikes: 0,
      },
      {
        id: "D",
        name: "Team D",
        score: 0,
        currentRoundScore: 0,
        color: "#F59E0B",
        theme: "default",
        strikes: 0,
      },
    ],
    strikes: savedState.strikes ?? 0,
    questions: savedState.questions || DEFAULT_STATE.questions,
    currentQuestionIndex: savedState.currentQuestionIndex ?? 0,
    currentQuestion: savedState.currentQuestion || null,
    gamePhase: savedState.gamePhase || "playing",
  }

  return migratedState
}

export function useGameState() {
  const [state, setState] = useState<GameState>(DEFAULT_STATE)
  const channelRef = useRef<BroadcastChannel | null>(null)
  const updateTimeoutRef = useRef<number | undefined>(undefined)
  const STORAGE_KEY = "gameshow-state"

  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY)
    
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState)
        const migratedState = migrateOldState(parsed)
        setState(migratedState)
        console.log("[GameState] Loaded saved state")
      } catch (error) {
        console.error("[GameState] Failed to parse saved state:", error)
        setState(DEFAULT_STATE)
      }
    } else {
      // No saved state, use default
      setState(DEFAULT_STATE)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_STATE))
      console.log("[GameState] Initialized default state")
    }

    try {
      channelRef.current = new BroadcastChannel("gameshow-sync")
      console.log("[GameState] BroadcastChannel created")

      channelRef.current.onmessage = (event) => {
        console.log("[GameState] Received broadcast update")
        clearTimeout(updateTimeoutRef.current)
        updateTimeoutRef.current = window.setTimeout(() => {
          const migratedState = migrateOldState(event.data)
          setState(migratedState)
        }, 10)
      }
    } catch (error) {
      console.error("[GameState] BroadcastChannel not supported:", error)
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === STORAGE_KEY && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue)
            const migratedState = migrateOldState(parsed)
            setState(migratedState)
          } catch (error) {
            console.error("[GameState] Failed to parse storage event:", error)
          }
        }
      }
      window.addEventListener("storage", handleStorageChange)
      
      return () => {
        window.removeEventListener("storage", handleStorageChange)
        channelRef.current?.close()
        clearTimeout(updateTimeoutRef.current)
      }
    }

    return () => {
      channelRef.current?.close()
      clearTimeout(updateTimeoutRef.current)
    }
  }, [])

  const broadcastState = useCallback((newState: GameState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState))
    console.log("[GameState] Broadcasting state update")
    channelRef.current?.postMessage(newState)
  }, [])

  const updateState = useCallback(
    (updates: Partial<GameState>) => {
      setState((prev) => {
        const newState = { ...prev, ...updates }
        broadcastState(newState)
        return newState
      })
    },
    [broadcastState],
  )

  const updateScore = useCallback(
    (teamId: string, amount: number) => {
      setState((prev) => {
        const newState = {
          ...prev,
          teams: prev.teams.map((team) =>
            team.id === teamId
              ? {
                  ...team,
                  score: Math.max(0, team.score + amount),
                  currentRoundScore: team.currentRoundScore + amount,
                }
              : team,
          ),
        }
        broadcastState(newState)
        return newState
      })
    },
    [broadcastState],
  )

  const addStrike = useCallback(() => {
    setState((prev) => {
      const newState = {
        ...prev,
        strikes: Math.min(3, prev.strikes + 1),
      }
      broadcastState(newState)
      return newState
    })
  }, [broadcastState])

  const resetStrikes = useCallback(() => {
    updateState({ strikes: 0 })
  }, [updateState])

  const revealAnswer = useCallback(
    (answerId: string) => {
      setState((prev) => {
        if (!prev.currentQuestion) return prev

        const newState = {
          ...prev,
          currentQuestion: {
            ...prev.currentQuestion,
            answers: prev.currentQuestion.answers.map((ans) =>
              ans.id === answerId ? { ...ans, revealed: !ans.revealed } : ans,
            ),
          },
        }
        broadcastState(newState)
        return newState
      })
    },
    [broadcastState],
  )

  const revealAllAnswers = useCallback(() => {
    setState((prev) => {
      if (!prev.currentQuestion) return prev

      const newState = {
        ...prev,
        currentQuestion: {
          ...prev.currentQuestion,
          answers: prev.currentQuestion.answers.map((ans) => ({ ...ans, revealed: true })),
        },
      }
      broadcastState(newState)
      return newState
    })
  }, [broadcastState])

  const hideAllAnswers = useCallback(() => {
    setState((prev) => {
      if (!prev.currentQuestion) return prev

      const newState = {
        ...prev,
        currentQuestion: {
          ...prev.currentQuestion,
          answers: prev.currentQuestion.answers.map((ans) => ({ ...ans, revealed: false })),
        },
      }
      broadcastState(newState)
      return newState
    })
  }, [broadcastState])

  const loadQuestion = useCallback(() => {
    setState((prev) => {
      const question = prev.questions[prev.currentQuestionIndex]
      const newState = {
        ...prev,
        currentQuestion: question
          ? {
              ...question,
              answers: question.answers.map((ans) => ({ ...ans, revealed: false })),
            }
          : null,
        strikes: 0,
      }
      broadcastState(newState)
      return newState
    })
  }, [broadcastState])

  const nextQuestion = useCallback(() => {
    setState((prev) => {
      const nextIndex = Math.min(prev.questions.length - 1, prev.currentQuestionIndex + 1)
      const question = prev.questions[nextIndex]
      const newState = {
        ...prev,
        currentQuestionIndex: nextIndex,
        currentQuestion: question
          ? {
              ...question,
              answers: question.answers.map((ans) => ({ ...ans, revealed: false })),
            }
          : null,
        strikes: 0,
        teams: prev.teams.map((team) => ({ ...team, currentRoundScore: 0 })),
      }
      broadcastState(newState)
      return newState
    })
  }, [broadcastState])

  const previousQuestion = useCallback(() => {
    setState((prev) => {
      const prevIndex = Math.max(0, prev.currentQuestionIndex - 1)
      const question = prev.questions[prevIndex]
      const newState = {
        ...prev,
        currentQuestionIndex: prevIndex,
        currentQuestion: question
          ? {
              ...question,
              answers: question.answers.map((ans) => ({ ...ans, revealed: false })),
            }
          : null,
        strikes: 0,
        teams: prev.teams.map((team) => ({ ...team, currentRoundScore: 0 })),
      }
      broadcastState(newState)
      return newState
    })
  }, [broadcastState])

  const updateTeamName = useCallback(
    (teamId: string, name: string) => {
      setState((prev) => {
        const newState = {
          ...prev,
          teams: prev.teams.map((team) => (team.id === teamId ? { ...team, name } : team)),
        }
        broadcastState(newState)
        return newState
      })
    },
    [broadcastState],
  )

  const updateTeamColor = useCallback(
    (teamId: string, color: string) => {
      setState((prev) => {
        const newState = {
          ...prev,
          teams: prev.teams.map((team) => (team.id === teamId ? { ...team, color } : team)),
        }
        broadcastState(newState)
        return newState
      })
    },
    [broadcastState],
  )

  const awardRoundPoints = useCallback(
    (teamId: string) => {
      setState((prev) => {
        if (!prev.currentQuestion) return prev

        const totalPoints = prev.currentQuestion.answers
          .filter((ans) => ans.revealed)
          .reduce((sum, ans) => sum + ans.points, 0)

        const newState = {
          ...prev,
          teams: prev.teams.map((team) =>
            team.id === teamId
              ? {
                  ...team,
                  score: team.score + totalPoints,
                  currentRoundScore: totalPoints,
                }
              : team,
          ),
        }
        broadcastState(newState)
        return newState
      })
    },
    [broadcastState],
  )

  const resetGame = useCallback(() => {
    const newState = { ...DEFAULT_STATE }
    setState(newState)
    broadcastState(newState)
  }, [broadcastState])

  const clearQuestion = useCallback(() => {
    updateState({
      currentQuestion: null,
      strikes: 0,
      teams: state.teams.map((team) => ({ ...team, currentRoundScore: 0 })),
    })
  }, [updateState, state.teams])

  const updateTeamTheme = useCallback(
    (teamId: string, theme: string) => {
      setState((prev) => {
        const newState = {
          ...prev,
          teams: prev.teams.map((team) => (team.id === teamId ? { ...team, theme } : team)),
        }
        broadcastState(newState)
        return newState
      })
    },
    [broadcastState],
  )

  const addTeamStrike = useCallback(
    (teamId: string) => {
      setState((prev) => {
        const newState = {
          ...prev,
          teams: prev.teams.map((team) =>
            team.id === teamId ? { ...team, strikes: Math.min(3, team.strikes + 1) } : team,
          ),
        }
        broadcastState(newState)
        return newState
      })
    },
    [broadcastState],
  )

  const resetTeamStrikes = useCallback(
    (teamId: string) => {
      setState((prev) => {
        const newState = {
          ...prev,
          teams: prev.teams.map((team) => (team.id === teamId ? { ...team, strikes: 0 } : team)),
        }
        broadcastState(newState)
        return newState
      })
    },
    [broadcastState],
  )

  const addQuestion = useCallback(
    (question: Omit<Question, "id">) => {
      setState((prev) => {
        const newId = String(prev.questions.length + 1)
        const newQuestion = { ...question, id: newId }
        const newState = {
          ...prev,
          questions: [...prev.questions, newQuestion],
        }
        broadcastState(newState)
        return newState
      })
    },
    [broadcastState],
  )

  const updateQuestion = useCallback(
    (id: string, question: Omit<Question, "id">) => {
      setState((prev) => {
        const newState = {
          ...prev,
          questions: prev.questions.map((q) =>
            q.id === id ? { ...question, id } : q
          ),
          // If we're updating the current question, update it too
          currentQuestion:
            prev.currentQuestion?.id === id
              ? { ...question, id }
              : prev.currentQuestion,
        }
        broadcastState(newState)
        return newState
      })
    },
    [broadcastState],
  )

  const deleteQuestion = useCallback(
    (id: string) => {
      setState((prev) => {
        const newQuestions = prev.questions.filter((q) => q.id !== id)
        const newState = {
          ...prev,
          questions: newQuestions,
          // Reset current question if it was deleted
          currentQuestion:
            prev.currentQuestion?.id === id ? null : prev.currentQuestion,
          currentQuestionIndex:
            prev.currentQuestion?.id === id ? 0 : prev.currentQuestionIndex,
        }
        broadcastState(newState)
        return newState
      })
    },
    [broadcastState],
  )

  return {
    state,
    updateScore,
    addStrike,
    resetStrikes,
    revealAnswer,
    revealAllAnswers,
    hideAllAnswers,
    loadQuestion,
    nextQuestion,
    previousQuestion,
    updateTeamName,
    updateTeamColor,
    updateTeamTheme,
    addTeamStrike,
    resetTeamStrikes,
    awardRoundPoints,
    resetGame,
    clearQuestion,
    updateState,
    addQuestion,
    updateQuestion,
    deleteQuestion,
  }
}

export type { GameState, Team, Question, Answer }
