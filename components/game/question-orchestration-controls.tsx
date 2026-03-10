"use client"

import { useState, useCallback } from "react"
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
    SkipForward,
    Loader2,
    Bell,
    Monitor,
} from "lucide-react"
import { sessionsApi } from "@/lib/api-client"
import type { Question, Round, TeamResponse, Team, GameState, SessionStatusResponse } from "@/lib/api-types"

interface QuestionOrchestrationControlsProps {
    currentQuestion: Question | null
    currentRound: Round | null
    sessionStatus: SessionStatusResponse | null
    teams: Team[]
    responses: TeamResponse[]
    showVideo: boolean
    sessionId: string
    isGrading: boolean
    onGrade: () => Promise<void>
    onNextQuestion: () => Promise<void>
    onRefreshStatus: () => Promise<unknown>
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
    sessionStatus,
    teams,
    responses,
    showVideo,
    sessionId,
    isGrading,
    onGrade,
    onNextQuestion,
    onRefreshStatus,
    isLoading,
}: QuestionOrchestrationControlsProps) {
    const [advancing, setAdvancing] = useState(false)

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

    // Video steps depend on showVideo toggle
    const showVideoSteps = showVideo && hasQuestionVideo

    // Response stats
    const respondedCount = responses.length
    const totalTeams = teams.length
    const gradedCount = responses.filter(r => r.IsCorrect !== null).length
    const correctCount = responses.filter(r => r.IsCorrect === true).length

    // ---- API Actions ----
    const handleAdvanceState = useCallback(async () => {
        setAdvancing(true)
        try {
            await sessionsApi.advanceState(sessionId)
            await onRefreshStatus()
        } catch (err) {
            console.error("Failed to advance state:", err)
            const { toast } = await import("sonner")
            toast.error("Failed to advance game state")
        } finally {
            setAdvancing(false)
        }
    }, [sessionId, onRefreshStatus])

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
        await onNextQuestion()
        await onRefreshStatus()
    }, [onNextQuestion, onRefreshStatus])

    // ---- Step Definitions ----
    const getSteps = () => {
        const steps: {
            id: string; label: string; icon: React.ElementType;
            action: () => void; canActivate: boolean; gameStates: GameState[]
        }[] = []

        // Step 1: Announce
        steps.push({
            id: "announce",
            label: "Announce",
            icon: Megaphone,
            action: handleAdvanceState,
            canActivate: gameState === "get_ready",
            gameStates: ["announced"],
        })

        if (hasOptions) {
            if (showVideoSteps) {
                steps.push({
                    id: "playVideo",
                    label: "Play Video",
                    icon: Video,
                    action: handleAdvanceState,
                    canActivate: gameState === "announced",
                    gameStates: ["video_playing"],
                })
            }
            steps.push({
                id: "revealOptions",
                label: "Reveal Options",
                icon: ListOrdered,
                action: handleAdvanceState,
                canActivate: showVideoSteps ? gameState === "video_playing" : gameState === "announced",
                gameStates: ["options_revealed"],
            })
        } else {
            if (showVideoSteps) {
                steps.push({
                    id: "playVideo",
                    label: "Video & Question",
                    icon: Video,
                    action: handleAdvanceState,
                    canActivate: gameState === "announced",
                    gameStates: ["video_playing"],
                })
                steps.push({
                    id: "showQuestion",
                    label: "Show Question",
                    icon: Eye,
                    action: handleAdvanceState,
                    canActivate: gameState === "video_playing",
                    gameStates: ["options_revealed"],
                })
            } else {
                steps.push({
                    id: "showQuestion",
                    label: "Show Question",
                    icon: Eye,
                    action: handleAdvanceState,
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
            label: "Reveal Answer",
            icon: Eye,
            action: handleAdvanceState,
            canActivate: gameState === "timer_ended",
            gameStates: ["answer_reveal"],
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
                <span className="text-[10px] uppercase tracking-widest text-gray-600 font-semibold">
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
                        <span className="text-[10px] text-purple-400 uppercase tracking-wider font-semibold">
                            {currentQuestion.Category}
                        </span>
                    )}
                    <p className="font-display text-lg font-bold text-white mt-0.5 mb-1.5 leading-snug">
                        {currentQuestion.QuestionText}
                    </p>
                    <p className="text-xs text-gray-500">
                        Answer: <span className="text-green-400 font-medium">{currentQuestion.CorrectAnswer}</span>
                    </p>

                    {/* Video indicators */}
                    <div className="flex gap-2 mt-2">
                        {hasQuestionVideo ? (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${showVideo ? "bg-blue-500/20 text-blue-400" : "bg-gray-700 text-gray-500 line-through"}`}>
                                📹 Q Video
                            </span>
                        ) : null}
                        {hasAnswerVideo ? (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${showVideo ? "bg-green-500/20 text-green-400" : "bg-gray-700 text-gray-500 line-through"}`}>
                                📹 A Video
                            </span>
                        ) : null}
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
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 rounded-full bg-red-500/20 border border-red-500/40">
                                            <Bell className="h-4 w-4 text-red-400 animate-pulse" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-red-400">⏰ Time&apos;s Up!</p>
                                            <p className="text-xs text-gray-500">{respondedCount}/{totalTeams} submitted</p>
                                        </div>
                                    </div>
                                    {gradedCount > 0 && (
                                        <div className="text-right">
                                            <span className="text-sm font-bold text-green-400">{correctCount}/{gradedCount}</span>
                                            <span className="block text-[10px] text-gray-500">correct</span>
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    </div>
                )}

                {/* Action Bar — Grade + Next Question only */}
                <div className="px-4 py-2.5 border-t border-gray-700 bg-gray-900/50 flex items-center justify-between">
                    <Button
                        onClick={onGrade}
                        disabled={isGrading || respondedCount === 0}
                        variant="outline"
                        size="sm"
                        className="border-green-500/50 text-green-400 hover:bg-green-500/10 h-8 text-xs"
                    >
                        {isGrading ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        ) : (
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Grade ({respondedCount})
                    </Button>

                    <div className="flex items-center gap-2">
                        {gradedCount > 0 && (
                            <span className="text-xs text-gray-500">
                                {correctCount}/{gradedCount} correct
                            </span>
                        )}
                        {gameState === "answer_reveal" && (
                            <Button
                                onClick={handleNextQuestion}
                                disabled={isLoading}
                                size="sm"
                                className="bg-purple-600 hover:bg-purple-700 text-white h-8 text-xs"
                            >
                                {isLoading ? (
                                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                ) : (
                                    <SkipForward className="h-3.5 w-3.5 mr-1.5" />
                                )}
                                Next Question
                            </Button>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    )
}
