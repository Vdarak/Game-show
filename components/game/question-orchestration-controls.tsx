"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
    Megaphone,
    ListOrdered,
    Timer,
    Eye,
    CheckCircle2,
    Clock,
    Video,
    VideoOff,
    SkipForward,
    Loader2,
    Monitor,
    Play,
    Pause,
    RotateCcw,
    SkipBack,
} from "lucide-react"
import { AlertTriangle } from "lucide-react"
import { sessionsApi } from "@/lib/api-client"
import type { Question, Round, RoundWithQuestions, TeamResponse, Team, GameState, SessionStatusResponse } from "@/lib/api-types"

interface QuestionOrchestrationControlsProps {
    currentQuestion: Question | null
    currentRound: Round | null
    allRounds?: RoundWithQuestions[]
    sessionStatus: SessionStatusResponse | null
    teams: Team[]
    responses: TeamResponse[]
    showVideo: boolean
    sessionId: string
    isGrading: boolean
    onGrade: () => Promise<void>
    onNextQuestion: () => Promise<void>
    onResetQuestion: () => Promise<void>
    onPrevQuestion: () => Promise<void>
    onRefreshStatus: () => Promise<unknown>
    onRevealAnswerClick?: () => void
    isLoading: boolean
}

// Friendly labels for what the gameboard is showing
const GAMEBOARD_STATE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
    get_ready: { label: "Get Ready Screen", icon: "🎯", color: "text-blue-400" },
    announced: { label: "Category & Question Announced", icon: "📣", color: "text-purple-400" },
    video_playing: { label: "Video Playing", icon: "🎬", color: "text-blue-400" },
    options_revealed: { label: "Options Revealed — Awaiting Answers", icon: "📋", color: "text-purple-400" },
    timer_running: { label: "Timer Running", icon: "⏱️", color: "text-yellow-400" },
    timer_ended: { label: "Time's Up!", icon: "⏰", color: "text-red-400" },
    answer_reveal: { label: "Answer Revealed", icon: "✅", color: "text-green-400" },
    break: { label: "Break Time", icon: "☕", color: "text-yellow-400" },
}

export function QuestionOrchestrationControls({
    currentQuestion,
    currentRound,
    allRounds = [],
    sessionStatus,
    teams,
    responses,
    showVideo,
    sessionId,
    isGrading,
    onGrade,
    onNextQuestion,
    onResetQuestion,
    onPrevQuestion,
    onRefreshStatus,
    onRevealAnswerClick,
    isLoading,
}: QuestionOrchestrationControlsProps) {
    const [advancing, setAdvancing] = useState(false)
    const [isResetting, setIsResetting] = useState(false)
    const [isGoingPrev, setIsGoingPrev] = useState(false)
    const [questionVideoPlaying, setQuestionVideoPlaying] = useState(true)
    const [answerVideoPlaying, setAnswerVideoPlaying] = useState(true)
    const [videoFrameVisible, setVideoFrameVisible] = useState(true)
    const [showingBuffer, setShowingBuffer] = useState(false)

    // Current game state from server
    const gameState = sessionStatus?.GameState || null
    const timerRemaining = sessionStatus?.TimerRemaining ?? null
    const timerTotal = sessionStatus?.TimerTotal ?? null

    // Derived state
    const hasQuestionVideo = !!currentQuestion?.QuestionVideoUrl
    const hasAnswerVideo = !!currentQuestion?.AnswerVideoUrl
    const isTrueFalse = currentQuestion?.QuestionType === "true_false" ||
        (currentQuestion?.Options?.length === 2 &&
            currentQuestion.Options.every(o => ["True", "False"].includes(o)))
    const isMCQ = currentQuestion?.QuestionType === "multiple_choice" && !isTrueFalse
    const hasOptions = isMCQ || isTrueFalse
    const hostNotes = (currentQuestion?.Notes ?? [])
        .map((note) => note.trim())
        .filter((note) => note.length > 0)
    const sortedRounds = useMemo(
        () => [...allRounds].sort((a, b) => a.RoundNumber - b.RoundNumber),
        [allRounds]
    )
    const orderedQuestions = useMemo(
        () =>
            sortedRounds.flatMap((round) =>
                [...round.questions]
                    .sort((a, b) => a.QuestionOrder - b.QuestionOrder)
                    .map((question) => ({
                        roundNumber: round.RoundNumber,
                        questionOrder: question.QuestionOrder,
                        question,
                    }))
            ),
        [sortedRounds]
    )

    const findQuestionInRounds = useCallback((roundNumber: number, questionOrder: number): Question | null => {
        const round = sortedRounds.find((candidate) => candidate.RoundNumber === roundNumber)
        if (!round) return null

        return round.questions.find((candidate) => candidate.QuestionOrder === questionOrder) || null
    }, [sortedRounds])

    const getCurrentPosition = useCallback(() => {
        if (sessionStatus?.CurrentRound === null || sessionStatus?.CurrentRound === undefined) return null
        if (sessionStatus?.CurrentQuestion === null || sessionStatus?.CurrentQuestion === undefined) return null

        return {
            roundNumber: sessionStatus.CurrentRound,
            questionOrder: sessionStatus.CurrentQuestion,
        }
    }, [sessionStatus?.CurrentRound, sessionStatus?.CurrentQuestion])

    const getCurrentCursor = useCallback(() => {
        if (orderedQuestions.length === 0) return null

        if (currentQuestion?.IDQuestion) {
            const indexById = orderedQuestions.findIndex(
                (item) => item.question.IDQuestion === currentQuestion.IDQuestion
            )
            if (indexById !== -1) {
                return {
                    index: indexById,
                    ...orderedQuestions[indexById],
                }
            }
        }

        const currentPosition = getCurrentPosition()
        if (!currentPosition) return null

        const indexByPosition = orderedQuestions.findIndex(
            (item) =>
                item.roundNumber === currentPosition.roundNumber &&
                item.questionOrder === currentPosition.questionOrder
        )
        if (indexByPosition === -1) return null

        return {
            index: indexByPosition,
            ...orderedQuestions[indexByPosition],
        }
    }, [currentQuestion?.IDQuestion, getCurrentPosition, orderedQuestions])

    const currentCursor = useMemo(() => getCurrentCursor(), [getCurrentCursor])

    const getNextTarget = useCallback(() => {
        if (!currentCursor) return null

        const nextItem = orderedQuestions[currentCursor.index + 1]
        if (!nextItem) return null

        return {
            roundNumber: nextItem.roundNumber,
            questionOrder: nextItem.questionOrder,
            question: nextItem.question,
        }
    }, [currentCursor, orderedQuestions])

    // Determine if this is the last question across all rounds
    const isLastQuestion = useMemo(
        () => !!currentCursor && currentCursor.index === orderedQuestions.length - 1,
        [currentCursor, orderedQuestions.length]
    )

    const getPrevTarget = useCallback(() => {
        if (!currentCursor) return null

        const prevItem = orderedQuestions[currentCursor.index - 1]
        if (!prevItem) return null

        return {
            roundNumber: prevItem.roundNumber,
            questionOrder: prevItem.questionOrder,
            question: prevItem.question,
        }
    }, [currentCursor, orderedQuestions])

    const getResetTarget = useCallback(() => {
        const currentPosition = getCurrentPosition()
        if (!currentPosition) return null

        return {
            roundNumber: currentPosition.roundNumber,
            questionOrder: currentPosition.questionOrder,
            question:
                findQuestionInRounds(currentPosition.roundNumber, currentPosition.questionOrder) ||
                currentQuestion ||
                null,
        }
    }, [currentQuestion, findQuestionInRounds, getCurrentPosition])

    const getQuestionForOptimisticPayload = useCallback((): Question | null => {
        const roundQuestion =
            currentCursor?.question ||
            (
                sessionStatus?.CurrentRound !== null &&
                sessionStatus?.CurrentRound !== undefined &&
                sessionStatus?.CurrentQuestion !== null &&
                sessionStatus?.CurrentQuestion !== undefined
                    ? findQuestionInRounds(sessionStatus.CurrentRound, sessionStatus.CurrentQuestion)
                    : null
            )

        if (!roundQuestion) return currentQuestion || null
        if (!currentQuestion) return roundQuestion

        const hasCurrentAnswer = currentQuestion.CorrectAnswer.trim().length > 0
        const hasRoundAnswer = roundQuestion.CorrectAnswer.trim().length > 0
        const hasCurrentOptions = Array.isArray(currentQuestion.Options) && currentQuestion.Options.length > 0
        const hasRoundOptions = Array.isArray(roundQuestion.Options) && roundQuestion.Options.length > 0

        if ((!hasCurrentAnswer && hasRoundAnswer) || (!hasCurrentOptions && hasRoundOptions)) {
            return roundQuestion
        }

        return currentQuestion
    }, [
        currentCursor?.question,
        currentQuestion,
        findQuestionInRounds,
        sessionStatus?.CurrentQuestion,
        sessionStatus?.CurrentRound,
    ])

    // Video steps depend on showVideo toggle
    const showVideoSteps = showVideo && hasQuestionVideo

    // Reset buffer when the question identity changes.
    useEffect(() => {
        setShowingBuffer(false)
    }, [currentQuestion?.IDQuestion, sessionStatus?.CurrentRound, sessionStatus?.CurrentQuestion])

    // Response stats
    const respondedCount = responses.length
    const totalTeams = teams.length
    const gradedCount = responses.filter(r => r.IsCorrect !== null).length
    const correctCount = responses.filter(r => r.IsCorrect === true).length

    const sendOptimisticGameboardUpdate = useCallback((payload: {
        gameState: GameState
        currentRound?: number | null
        currentQuestion?: number | null
        question?: Question | null
        ttlMs?: number
    }) => {
        const actionId = `${Date.now()}-${Math.random().toString(16).slice(2)}`

        try {
            const bc = new BroadcastChannel(`trivitime-host-${sessionId}`)
            bc.postMessage({
                type: "OPTIMISTIC_GAMEBOARD_UPDATE",
                actionId,
                gameState: payload.gameState,
                currentRound: payload.currentRound ?? null,
                currentQuestion: payload.currentQuestion ?? null,
                question: payload.question ?? null,
                ttlMs: payload.ttlMs ?? 7000,
            })
            bc.close()
        } catch {
            // BroadcastChannel not supported
        }

        return actionId
    }, [sessionId])

    const clearOptimisticGameboardUpdate = useCallback((actionId: string) => {
        try {
            const bc = new BroadcastChannel(`trivitime-host-${sessionId}`)
            bc.postMessage({
                type: "CLEAR_OPTIMISTIC_GAMEBOARD_UPDATE",
                actionId,
            })
            bc.close()
        } catch {
            // BroadcastChannel not supported
        }
    }, [sessionId])

    // ---- API Actions ----
    const handleAdvanceState = useCallback(async (optimisticGameState?: GameState) => {
        const actionId = optimisticGameState
            ? sendOptimisticGameboardUpdate({
                gameState: optimisticGameState,
                currentRound: sessionStatus?.CurrentRound ?? null,
                currentQuestion: sessionStatus?.CurrentQuestion ?? null,
                question: getQuestionForOptimisticPayload(),
            })
            : null

        setAdvancing(true)
        try {
            await sessionsApi.advanceState(sessionId)
            await onRefreshStatus()
        } catch (err) {
            if (actionId) {
                clearOptimisticGameboardUpdate(actionId)
            }
            console.error("Failed to advance state:", err)
            const { toast } = await import("sonner")
            toast.error("Failed to advance game state")
        } finally {
            setAdvancing(false)
        }
    }, [
        clearOptimisticGameboardUpdate,
        getQuestionForOptimisticPayload,
        onRefreshStatus,
        sendOptimisticGameboardUpdate,
        sessionId,
        sessionStatus?.CurrentQuestion,
        sessionStatus?.CurrentRound,
    ])

    const handleStartTimer = useCallback(async () => {
        setAdvancing(true)
        try {
            await sessionsApi.startTimer(sessionId)
            await onRefreshStatus()
        } catch (err) {
            console.error("Failed to start timer:", err)
            const { toast } = await import("sonner")
            toast.error("Failed to start timer")
        } finally {
            setAdvancing(false)
        }
    }, [sessionId, onRefreshStatus])

    const handleNextQuestion = useCallback(async () => {
        const nextTarget = getNextTarget()
        const actionId = nextTarget
            ? sendOptimisticGameboardUpdate({
                gameState: "get_ready",
                currentRound: nextTarget.roundNumber,
                currentQuestion: nextTarget.questionOrder,
                question: nextTarget.question,
            })
            : null

        try {
            await onNextQuestion()
            await onRefreshStatus()
        } catch {
            if (actionId) {
                clearOptimisticGameboardUpdate(actionId)
            }
        }
    }, [
        clearOptimisticGameboardUpdate,
        getNextTarget,
        onNextQuestion,
        onRefreshStatus,
        sendOptimisticGameboardUpdate,
    ])

    // Send buffer page message to gameboard
    const handleShowBufferPage = useCallback(() => {
        try {
            const bc = new BroadcastChannel(`trivitime-host-${sessionId}`)
            bc.postMessage({ type: "SHOW_BUFFER_PAGE" })
            bc.close()
        } catch { /* not supported */ }
        setShowingBuffer(true)
    }, [sessionId])

    // End the game (wraps onNextQuestion which will trigger game completion)
    const handleEndGame = useCallback(async () => {
        try {
            const bc = new BroadcastChannel(`trivitime-host-${sessionId}`)
            bc.postMessage({ type: "EXIT_BUFFER_PAGE" })
            bc.close()
        } catch { /* not supported */ }
        setShowingBuffer(false)
        await onNextQuestion()
        await onRefreshStatus()
    }, [sessionId, onNextQuestion, onRefreshStatus])

    const handleResetClick = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault()
        event.stopPropagation()

        const resetTarget = getResetTarget()
        const actionId = resetTarget
            ? sendOptimisticGameboardUpdate({
                gameState: "get_ready",
                currentRound: resetTarget.roundNumber,
                currentQuestion: resetTarget.questionOrder,
                question: resetTarget.question,
            })
            : null

        setIsResetting(true)
        try {
            await onResetQuestion()
        } catch {
            if (actionId) {
                clearOptimisticGameboardUpdate(actionId)
            }
        } finally {
            setIsResetting(false)
        }
    }, [
        clearOptimisticGameboardUpdate,
        getResetTarget,
        onResetQuestion,
        sendOptimisticGameboardUpdate,
    ])

    const handlePrevClick = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault()
        event.stopPropagation()

        const prevTarget = getPrevTarget()
        const actionId = prevTarget
            ? sendOptimisticGameboardUpdate({
                gameState: "get_ready",
                currentRound: prevTarget.roundNumber,
                currentQuestion: prevTarget.questionOrder,
                question: prevTarget.question,
            })
            : null

        setIsGoingPrev(true)
        try {
            await onPrevQuestion()
        } catch {
            if (actionId) {
                clearOptimisticGameboardUpdate(actionId)
            }
        } finally {
            setIsGoingPrev(false)
        }
    }, [
        clearOptimisticGameboardUpdate,
        getPrevTarget,
        onPrevQuestion,
        sendOptimisticGameboardUpdate,
    ])

    // BroadcastChannel video control helpers
    const sendVideoMessage = useCallback((type: string) => {
        try {
            const bc = new BroadcastChannel(`trivitime-host-${sessionId}`)
            bc.postMessage({ type })
            bc.close()
        } catch { /* not supported */ }
    }, [sessionId])

    // ---- Step Definitions ----
    const getSteps = () => {
        const steps: {
            id: string; label: string; icon: React.ElementType;
            action: () => void; canActivate: boolean; gameStates: GameState[]; optimisticGameState?: GameState
        }[] = []

        // Step 1: Announce
        steps.push({
            id: "announce",
            label: "Announce",
            icon: Megaphone,
            action: () => {
                void handleAdvanceState("announced")
            },
            canActivate: gameState === "get_ready",
            gameStates: ["announced"],
            optimisticGameState: "announced",
        })

        if (hasOptions) {
            if (showVideoSteps) {
                steps.push({
                    id: "playVideo",
                    label: "Video + Question",
                    icon: Video,
                    action: () => {
                        void handleAdvanceState("video_playing")
                    },
                    canActivate: gameState === "announced",
                    gameStates: ["video_playing"],
                    optimisticGameState: "video_playing",
                })
            }
            steps.push({
                id: "revealOptions",
                label: "Reveal Options",
                icon: ListOrdered,
                action: () => {
                    void handleAdvanceState("options_revealed")
                },
                canActivate: showVideoSteps ? gameState === "video_playing" : gameState === "announced",
                gameStates: ["options_revealed"],
                optimisticGameState: "options_revealed",
            })
        } else {
            if (showVideoSteps) {
                steps.push({
                    id: "playVideo",
                    label: "Video + Question",
                    icon: Video,
                    action: () => {
                        void handleAdvanceState("video_playing")
                    },
                    canActivate: gameState === "announced",
                    gameStates: ["video_playing"],
                    optimisticGameState: "video_playing",
                })
                steps.push({
                    id: "showQuestion",
                    label: "Show Question",
                    icon: Eye,
                    action: () => {
                        void handleAdvanceState()
                    },
                    canActivate: gameState === "video_playing",
                    gameStates: ["options_revealed"],
                })
            } else {
                steps.push({
                    id: "showQuestion",
                    label: "Show Question",
                    icon: Eye,
                    action: () => {
                        void handleAdvanceState()
                    },
                    canActivate: gameState === "announced",
                    gameStates: ["options_revealed"],
                })
            }
        }

        steps.push({
            id: "startTimer",
            label: "Start Timer",
            icon: Timer,
            action: handleStartTimer,
            canActivate: gameState === "options_revealed",
            gameStates: ["timer_running", "timer_ended"],
        })

        steps.push({
            id: "revealAnswer",
            label: "Answer + Video",
            icon: Eye,
            action: () => {
                onRevealAnswerClick?.()
                void handleAdvanceState("answer_reveal")
            },
            canActivate: gameState === "timer_ended",
            gameStates: ["answer_reveal"],
            optimisticGameState: "answer_reveal",
        })

        return steps
    }

    const steps = getSteps()

    // Determine step status based on server GameState
    const getStepStatus = (s: typeof steps[0]): "done" | "active" | "upcoming" => {
        if (!gameState) return "upcoming"

        const stepIdx = steps.indexOf(s)
        const currentStepIdx = steps.findIndex(st => st.gameStates.includes(gameState))

        if (currentStepIdx < 0) {
            if (s.canActivate) return "active"
            return "upcoming"
        }
        if (stepIdx < currentStepIdx) return "done"
        if (stepIdx === currentStepIdx) {
            return gameState === "answer_reveal" && s.id === "revealAnswer" ? "done" : "active"
        }
        if (s.canActivate) return "active"
        return "upcoming"
    }

    // If the game is active but the current question hasn't arrived yet (e.g., during get_ready transition),
    // show a loading placeholder instead of hiding the controls entirely. This prevents the host UI from
    // appearing locked up after round transitions.
    if (!currentQuestion && sessionStatus?.Status === "active" && sessionStatus?.GameState === "get_ready") {
      return (
        <div className="flex items-center justify-center p-4 text-gray-400">
          Loading next question…
        </div>
      );
    }
    if (!currentQuestion || sessionStatus?.Status !== "active") {
        return null
    }

    // Skip rendering during pre-game phases — MacroPhaseBar handles those
    if (gameState === "welcome" || gameState === "rules" || gameState === "lobby") {
        return null
    }

    const gameboardState = gameState ? GAMEBOARD_STATE_LABELS[gameState] : null

    return (
        <div className="space-y-0">
            {/* Section Label */}
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-widest text-gray-600 font-semibold">
                    Question Pipeline
                </span>
                <span className="text-[14px] uppercase tracking-widest text-gray-400 font-semibold">
                    Round {sessionStatus.CurrentRound} · Q{sessionStatus.CurrentQuestion}
                </span>
            </div>

            <Card className="bg-gray-800 border-gray-700 overflow-hidden">
                {/* Live Status Bar — what players see right now */}
                {gameboardState && (
                    <div className="px-4 py-2.5 bg-gray-900/80 border-b border-gray-700 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Monitor className="h-3.5 w-3.5 text-gray-500" />
                            <span className="text-xs text-gray-500">Players see:</span>
                            <span className={`text-xs font-medium ${gameboardState.color}`}>
                                {gameboardState.icon} {gameboardState.label}
                            </span>
                        </div>
                        {/* Live response tracker */}
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-0.5">
                                {teams.map((team) => {
                                    const hasResponded = responses.some(r => r.IDTeam === team.IDTeam)
                                    return (
                                        <div
                                            key={team.IDTeam}
                                            title={`${team.TeamName}: ${hasResponded ? "Answered" : "Waiting"}`}
                                            className={`w-2 h-2 rounded-full transition-colors ${
                                                hasResponded ? "bg-green-400" : "bg-gray-600"
                                            }`}
                                        />
                                    )
                                })}
                            </div>
                            <span className="text-[10px] text-gray-500">
                                {respondedCount}/{totalTeams}
                            </span>
                        </div>
                    </div>
                )}

                {/* Question Content */}
                <div className="p-4">
                    {currentQuestion.Category && (
                        <span className="text-[14px] text-purple-400 uppercase tracking-wider font-semibold">
                            {currentQuestion.Category}
                        </span>
                    )}
                    <p className="font-display text-lg font-bold text-white mt-0.5 mb-1.5 leading-snug">
                        {currentQuestion.QuestionText}
                    </p>
                    <p className="text-xs text-gray-500">
                        Answer: <span className="text-green-400 font-medium">{currentQuestion.CorrectAnswer}</span>
                    </p>

                    {/* Host notes (from episodes/get question Notes) */}
                    <div className="mt-2 rounded-lg border border-gray-700 bg-gray-900/60 p-2.5">
                        <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Host Notes</p>
                        {hostNotes.length > 0 ? (
                            <ul className="list-disc list-inside space-y-1">
                                {hostNotes.map((note, i) => (
                                    <li key={`${i}-${note}`} className="text-xs text-gray-200 leading-snug">
                                        {note}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-xs text-gray-500">No notes for this question.</p>
                        )}
                    </div>
                </div>

                {/* Options Display */}
                {currentQuestion.Options && currentQuestion.Options.length > 0 && (
                    <div className="px-4 pb-3">
                        <div className="grid gap-1.5 grid-cols-2">
                            {currentQuestion.Options.map((option, i) => {
                                const letter = String.fromCharCode(65 + i)
                                const isCorrect = option === currentQuestion.CorrectAnswer

                                return (
                                    <div
                                        key={i}
                                        className={`p-2.5 rounded-lg border transition-all ${
                                            isCorrect
                                                ? "border-green-500/60 bg-green-500/10"
                                                : "border-gray-700 bg-gray-900/60"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className={`w-6 h-6 rounded flex items-center justify-center font-display font-bold text-xs flex-shrink-0 ${
                                                isCorrect ? "bg-green-500 text-white" : "bg-purple-600/30 text-purple-400"
                                            }`}>
                                                {letter}
                                            </span>
                                            <span className={`text-xs font-medium flex-1 ${
                                                isCorrect ? "text-green-400" : "text-white"
                                            }`}>
                                                {option}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Step Progress Pipeline */}
                <div className="px-4 pb-3">
                    {/* Step Progress Bar with Labels */}
                    <div className="flex items-center gap-0.5 mb-3">
                        {steps.map((s) => {
                            const status = getStepStatus(s)
                            return (
                                <div key={s.id} className="flex flex-col items-center flex-1 min-w-0">
                                    <div
                                        className={`h-1.5 w-full rounded-full transition-colors ${
                                            status === "done"
                                                ? "bg-green-500"
                                                : status === "active"
                                                    ? "bg-purple-500"
                                                    : "bg-gray-700"
                                        }`}
                                    />
                                    <span className={`text-[9px] mt-1 truncate ${
                                        status === "done"
                                            ? "text-green-400"
                                            : status === "active"
                                                ? "text-purple-400"
                                                : "text-gray-600"
                                    }`}>
                                        {s.label}
                                    </span>
                                </div>
                            )
                        })}
                    </div>

                    {/* Step Action Buttons */}
                    <div className="flex flex-wrap gap-1.5">
                        {steps.map((s) => {
                            const status = getStepStatus(s)
                            const Icon = s.icon

                            // Video step with active controls (question video playing)
                            const isVideoStepActive = s.id === "playVideo" && status === "active" && !s.canActivate &&
                                (gameState === "video_playing" || gameState === "options_revealed" || gameState === "timer_running" || gameState === "timer_ended")
                            // Answer step with active controls
                            const isAnswerStepActive = s.id === "revealAnswer" && status === "done" && gameState === "answer_reveal" && hasAnswerVideo

                            if (isVideoStepActive) {
                                return (
                                    <div key={s.id} className="flex items-center gap-1">
                                        <span className="text-[10px] text-blue-400 font-medium mr-1 flex items-center gap-1">
                                            <Video className="h-3 w-3" />
                                            {questionVideoPlaying ? "Playing" : "Paused"}
                                        </span>
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                if (questionVideoPlaying) {
                                                    setQuestionVideoPlaying(false)
                                                    sendVideoMessage("QUESTION_VIDEO_PAUSE")
                                                } else {
                                                    setQuestionVideoPlaying(true)
                                                    sendVideoMessage("QUESTION_VIDEO_PLAY")
                                                }
                                            }}
                                            className="h-7 w-7 p-0 bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700"
                                        >
                                            {questionVideoPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                setQuestionVideoPlaying(true)
                                                sendVideoMessage("QUESTION_VIDEO_RESTART")
                                            }}
                                            className="h-7 w-7 p-0 bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700"
                                        >
                                            <RotateCcw className="h-3 w-3" />
                                        </Button>
                                    </div>
                                )
                            }

                            if (isAnswerStepActive) {
                                return (
                                    <div key={s.id} className="flex items-center gap-1">
                                        <span className="text-[10px] text-green-400 font-medium mr-1 flex items-center gap-1">
                                            <Video className="h-3 w-3" />
                                            {answerVideoPlaying ? "Playing" : "Paused"}
                                        </span>
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                if (answerVideoPlaying) {
                                                    setAnswerVideoPlaying(false)
                                                    sendVideoMessage("QUESTION_VIDEO_PAUSE")
                                                } else {
                                                    setAnswerVideoPlaying(true)
                                                    sendVideoMessage("QUESTION_VIDEO_PLAY")
                                                }
                                            }}
                                            className="h-7 w-7 p-0 bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700"
                                        >
                                            {answerVideoPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                setAnswerVideoPlaying(true)
                                                sendVideoMessage("QUESTION_VIDEO_RESTART")
                                            }}
                                            className="h-7 w-7 p-0 bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700"
                                        >
                                            <RotateCcw className="h-3 w-3" />
                                        </Button>
                                    </div>
                                )
                            }

                            return (
                                <Button
                                    key={s.id}
                                    size="sm"
                                    disabled={!s.canActivate || advancing}
                                    onClick={s.action}
                                    className={`text-xs h-8 transition-all ${
                                        status === "done"
                                            ? "bg-green-600/20 border-green-500/40 text-green-400 hover:bg-green-600/30 border"
                                            : status === "active" && s.canActivate
                                                ? "bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20"
                                                : "bg-gray-800 border-gray-700 text-gray-500 border"
                                    }`}
                                >
                                    {advancing && s.canActivate ? (
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    ) : status === "done" ? (
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                    ) : (
                                        <Icon className="h-3 w-3 mr-1" />
                                    )}
                                    {s.label}
                                </Button>
                            )
                        })}
                    </div>
                </div>

                {/* Timer Display — enhanced with response count */}
                {(gameState === "timer_running" || gameState === "timer_ended") && (
                    <div className="px-4 pb-3">
                        <div className="bg-gray-900/80 rounded-lg p-3 border border-gray-700">
                            {gameState === "timer_running" && timerRemaining !== null ? (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Clock className={`h-5 w-5 ${
                                                timerRemaining <= 5 ? "text-red-400" :
                                                timerRemaining <= 10 ? "text-yellow-400" :
                                                "text-purple-400"
                                            }`} />
                                            <span className="font-display text-3xl font-bold tabular-nums text-white">
                                                {timerRemaining}s
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-medium text-gray-300">
                                                {respondedCount}/{totalTeams} answered
                                            </span>
                                            {gradedCount > 0 && (
                                                <span className="block text-xs text-green-400">
                                                    {correctCount} correct
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                        <motion.div
                                            className={`h-full rounded-full ${
                                                timerRemaining <= 5 ? "bg-red-500" :
                                                timerRemaining <= 10 ? "bg-yellow-500" :
                                                "bg-purple-500"
                                            }`}
                                            animate={{ width: `${timerTotal ? (timerRemaining / timerTotal) * 100 : 0}%` }}
                                            transition={{ duration: 0.5 }}
                                        />
                                    </div>
                                    {/* Team response dots */}
                                    <div className="flex items-center gap-1 mt-2">
                                        {teams.map((team) => {
                                            const hasResponded = responses.some(r => r.IDTeam === team.IDTeam)
                                            return (
                                                <div
                                                    key={team.IDTeam}
                                                    title={team.TeamName}
                                                    className={`flex-1 h-1 rounded-full transition-colors ${
                                                        hasResponded ? "bg-green-400" : "bg-gray-700"
                                                    }`}
                                                />
                                            )
                                        })}
                                    </div>
                                </div>
                            ) : gameState === "timer_ended" ? (
                                <div>
                                    <div className="flex items-center gap-4 mb-2">
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-5 w-5 text-red-400" />
                                            <span className="font-display text-3xl font-bold tabular-nums text-red-400">
                                                TIME&apos;S UP!
                                            </span>
                                        </div>
                                        {gradedCount > 0 && (
                                            <span className="text-sm font-bold text-green-400 ml-auto">{correctCount}/{gradedCount} correct</span>
                                        )}
                                    </div>
                                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full bg-red-500 w-0" />
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                )}

                {/* Action Bar — Grade + Next Question only */}
                <div className="px-4 py-2.5 border-t border-gray-700 bg-gray-900/50 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            onClick={handleResetClick}
                            disabled={isResetting || isGoingPrev || isLoading}
                            variant="outline"
                            size="sm"
                            className="border-red-500/50 text-red-400 hover:bg-red-500/10 h-8 text-xs"
                            title="Reset current question"
                        >
                            {isResetting ? (
                                <Loader2 className="h-3.5 w-3.5 sm:mr-1.5 animate-spin" />
                            ) : (
                                <RotateCcw className="h-3.5 w-3.5 sm:mr-1.5" />
                            )}
                            <span className="hidden sm:inline">{isResetting ? "Resetting..." : "Reset"}</span>
                        </Button>

                        <Button
                            onClick={onGrade}
                            disabled={isGrading || respondedCount === 0}
                            variant="outline"
                            size="sm"
                            className="border-green-500/50 text-green-400 hover:bg-green-500/10 h-8 text-xs"
                        >
                            {isGrading ? (
                                <Loader2 className="h-3.5 w-3.5 sm:mr-1.5 animate-spin" />
                            ) : (
                                <CheckCircle2 className="h-3.5 w-3.5 sm:mr-1.5" />
                            )}
                            <span className="hidden sm:inline">Grade ({respondedCount})</span>
                            <span className="sm:hidden">{respondedCount}</span>
                        </Button>

                        {/* Toggle Video Frame on/off */}
                        {(hasQuestionVideo || hasAnswerVideo) && (
                            <Button
                                onClick={() => {
                                    setVideoFrameVisible(prev => !prev)
                                    sendVideoMessage("TOGGLE_VIDEO_FRAME")
                                }}
                                variant="outline"
                                size="sm"
                                className={`h-8 text-xs ${
                                    videoFrameVisible
                                        ? "border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                                        : "border-gray-600 text-gray-500 hover:bg-gray-700/50"
                                }`}
                            >
                                {videoFrameVisible ? (
                                    <Video className="h-3.5 w-3.5 mr-1.5" />
                                ) : (
                                    <VideoOff className="h-3.5 w-3.5 mr-1.5" />
                                )}
                                {videoFrameVisible ? "Video On" : "Video Off"}
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {gradedCount > 0 && (
                            <span className="text-xs text-gray-500 hidden sm:inline">
                                {correctCount}/{gradedCount} correct
                            </span>
                        )}
                        <Button
                            type="button"
                            onClick={handlePrevClick}
                            disabled={(currentRound?.RoundNumber === 1 && currentQuestion?.QuestionOrder === 1) || isGoingPrev || isResetting || isLoading}
                            variant="outline"
                            size="sm"
                            className="bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700 h-8 text-xs"
                            title="Previous Question"
                        >
                            {isGoingPrev ? (
                                <Loader2 className="h-3.5 w-3.5 sm:mr-1 animate-spin" />
                            ) : (
                                <SkipBack className="h-3.5 w-3.5 sm:mr-1" />
                            )}
                            <span className="hidden sm:inline">{isGoingPrev ? "Loading..." : "Prev"}</span>
                        </Button>
                        {/* Last-question warning + buffer flow should not depend on answer_reveal state. */}
                        {isLastQuestion && !showingBuffer && (
                            <span className="text-xs text-red-400 font-semibold flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Last Question!
                            </span>
                        )}
                        {isLastQuestion ? (
                            showingBuffer ? (
                                <Button
                                    onClick={() => { void handleEndGame() }}
                                    disabled={isLoading || advancing}
                                    size="sm"
                                    className="bg-red-600 hover:bg-red-700 text-white h-8 text-xs"
                                >
                                    {isLoading ? (
                                        <Loader2 className="h-3.5 w-3.5 sm:mr-1.5 animate-spin" />
                                    ) : (
                                        <SkipForward className="h-3.5 w-3.5 sm:mr-1.5" />
                                    )}
                                    <span className="hidden sm:inline">End Game</span>
                                    <span className="sm:hidden">End</span>
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleShowBufferPage}
                                    disabled={isLoading || advancing}
                                    size="sm"
                                    className="bg-yellow-600 hover:bg-yellow-700 text-white h-8 text-xs"
                                >
                                    <SkipForward className="h-3.5 w-3.5 sm:mr-1.5" />
                                    <span className="hidden sm:inline">Show Buffer Page</span>
                                    <span className="sm:hidden">Buffer</span>
                                </Button>
                            )
                        ) : (
                            <Button
                                onClick={handleNextQuestion}
                                disabled={isLoading || advancing}
                                size="sm"
                                className="bg-purple-600 hover:bg-purple-700 text-white h-8 text-xs"
                            >
                                {isLoading ? (
                                    <Loader2 className="h-3.5 w-3.5 sm:mr-1.5 animate-spin" />
                                ) : (
                                    <SkipForward className="h-3.5 w-3.5 sm:mr-1.5" />
                                )}
                                <span className="hidden sm:inline">Next Question</span>
                                <span className="sm:hidden">Next</span>
                            </Button>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    )
}
