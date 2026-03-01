"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Award,
  RefreshCw,
  Loader2,
  ChevronRight,
  AlertCircle,
  Zap,
  Eye,
  EyeOff,
} from "lucide-react"
import type { Team, TeamResponse, Question, Round } from "@/lib/api-types"
import { TeamAvatar } from "./team-avatar"

interface IncomingAnswersPanelProps {
  sessionId: string
  teams: Team[]
  responses: TeamResponse[]
  currentQuestion: Question | null
  currentRound: Round | null
  isGrading: boolean
  onGrade: () => Promise<void>
  onNextQuestion: () => Promise<void>
  onRefresh: () => Promise<void>
  onKickTeam: (teamId: string) => Promise<void>
}

export function IncomingAnswersPanel({
  sessionId,
  teams,
  responses,
  currentQuestion,
  currentRound,
  isGrading,
  onGrade,
  onNextQuestion,
  onRefresh,
  onKickTeam,
}: IncomingAnswersPanelProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [showAnswer, setShowAnswer] = useState(false)
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null)

  // Setup BroadcastChannel to communicate with gameboard
  useEffect(() => {
    if (typeof window === "undefined" || !sessionId) return

    try {
      broadcastChannelRef.current = new BroadcastChannel(`trivitime-host-${sessionId}`)
    } catch (err) {
      console.log("BroadcastChannel not supported")
    }

    return () => {
      broadcastChannelRef.current?.close()
    }
  }, [sessionId])

  // Reset showAnswer when question changes
  useEffect(() => {
    setShowAnswer(false)
    // Broadcast reset to gameboard
    broadcastChannelRef.current?.postMessage({ type: "SHOW_ANSWER", payload: false })
  }, [currentQuestion?.IDQuestion])

  const handleToggleShowAnswer = useCallback(() => {
    const newValue = !showAnswer
    setShowAnswer(newValue)
    broadcastChannelRef.current?.postMessage({ type: "SHOW_ANSWER", payload: newValue })
  }, [showAnswer])

  // Auto-refresh responses
  useEffect(() => {
    if (!autoRefresh || !currentQuestion) return

    const interval = setInterval(() => {
      onRefresh()
    }, 2000)

    return () => clearInterval(interval)
  }, [autoRefresh, currentQuestion, onRefresh])

  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await onRefresh()
    setIsRefreshing(false)
  }, [onRefresh])

  // Get response for a team
  const getTeamResponse = useCallback(
    (teamId: string): TeamResponse | undefined => {
      return responses.find((r) => r.IDTeam === teamId)
    },
    [responses]
  )

  // Count submissions
  const submittedCount = responses.filter(
    (r) => r.IDQuestion === currentQuestion?.IDQuestion
  ).length
  const totalTeams = teams.length

  // Check if answer is correct (case-insensitive)
  const isCorrectAnswer = useCallback(
    (answerText: string): boolean => {
      if (!currentQuestion?.CorrectAnswer) return false
      return (
        answerText.toLowerCase().trim() ===
        currentQuestion.CorrectAnswer.toLowerCase().trim()
      )
    },
    [currentQuestion]
  )

  if (!currentQuestion) {
    return (
      <Card className="bg-gray-800 border-gray-700 p-4">
        <div className="flex items-center justify-center gap-2 text-gray-400 py-8">
          <Clock className="h-5 w-5" />
          <span>No active question</span>
        </div>
      </Card>
    )
  }

  return (
    <Card className="bg-gray-800 border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Users className="h-4 w-4 text-purple-400" />
            Incoming Answers
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-1.5 rounded-md transition-colors ${
                autoRefresh
                  ? "bg-green-600/20 text-green-400"
                  : "bg-gray-700 text-gray-400"
              }`}
              title={autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
            >
              <RefreshCw className={`h-4 w-4 ${autoRefresh ? "animate-spin" : ""}`} />
            </button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="text-gray-400 hover:text-white"
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${(submittedCount / Math.max(totalTeams, 1)) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="text-sm text-gray-400 whitespace-nowrap">
            {submittedCount}/{totalTeams}
          </span>
        </div>
      </div>

      {/* Question Info */}
      <div className="p-3 bg-gray-900/50 border-b border-gray-700">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
          {currentRound && (
            <span className="px-2 py-0.5 rounded bg-purple-600/20 text-purple-400">
              Round {currentRound.RoundNumber}
            </span>
          )}
          {currentQuestion.Category && (
            <span className="px-2 py-0.5 rounded bg-blue-600/20 text-blue-400">
              {currentQuestion.Category}
            </span>
          )}
        </div>
        <p className="text-sm text-white truncate">{currentQuestion.QuestionText}</p>
        <p className="text-xs text-green-400 mt-1">
          Answer: {currentQuestion.CorrectAnswer}
        </p>
      </div>

      {/* Responses Table */}
      <div className="max-h-[400px] overflow-auto">
        <table className="w-full">
          <thead className="bg-gray-900/80 sticky top-0">
            <tr className="text-xs text-gray-400 uppercase">
              <th className="text-left p-3">Team</th>
              <th className="text-left p-3">Answer</th>
              <th className="text-center p-3">Wager</th>
              <th className="text-center p-3">Time</th>
              <th className="text-center p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {teams.map((team) => {
                const response = getTeamResponse(team.IDTeam)
                const hasResponded = !!response
                const isCorrect = response ? isCorrectAnswer(response.AnswerText) : false

                return (
                  <motion.tr
                    key={team.IDTeam}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`border-b border-gray-700/50 ${
                      hasResponded
                        ? isCorrect
                          ? "bg-green-900/10"
                          : "bg-red-900/10"
                        : ""
                    }`}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <TeamAvatar
                          avatarPath={team.AvatarBlobPath}
                          teamName={team.TeamName}
                          size="md"
                        />
                        <span className="text-sm text-white truncate max-w-[120px]">
                          {team.TeamName}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      {hasResponded ? (
                        <span
                          className={`text-sm font-medium ${
                            isCorrect ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {response.AnswerText}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500 italic">
                          Waiting...
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {hasResponded ? (
                        <span className="text-yellow-400 font-display font-bold">
                          {response.WageredPoints}
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {hasResponded ? (
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-xs text-gray-400">
                            {response.SubmissionSeconds.toFixed(1)}s
                          </span>
                          {response.TimedBonusAwarded > 0 && (
                            <span className="text-xs text-green-400 flex items-center">
                              <Zap className="h-3 w-3" />+{response.TimedBonusAwarded}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {hasResponded ? (
                        response.WasOnTime ? (
                          isCorrect ? (
                            <CheckCircle2 className="h-5 w-5 text-green-400 mx-auto" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-400 mx-auto" />
                          )
                        ) : (
                          <span className="text-xs text-orange-400">Late</span>
                        )
                      ) : (
                        <Clock className="h-4 w-4 text-gray-500 mx-auto animate-pulse" />
                      )}
                    </td>
                  </motion.tr>
                )
              })}
            </AnimatePresence>

            {teams.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No teams joined yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Actions Footer */}
      <div className="p-4 border-t border-gray-700 bg-gray-900/50 space-y-2">
        {/* Show Answer Toggle */}
        <Button
          onClick={handleToggleShowAnswer}
          variant="outline"
          className={`w-full ${
            showAnswer
              ? "border-green-500 text-green-400 bg-green-500/10"
              : "border-gray-600 text-gray-400"
          }`}
        >
          {showAnswer ? (
            <>
              <EyeOff className="h-4 w-4 mr-2" />
              Hide Answer on Display
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Show Answer on Display
            </>
          )}
        </Button>

        <div className="flex gap-2">
          <Button
            onClick={onGrade}
            disabled={isGrading || submittedCount === 0}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {isGrading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Award className="h-4 w-4 mr-2" />
            )}
            Grade All ({submittedCount})
          </Button>
          <Button
            onClick={onNextQuestion}
            variant="secondary"
            className="flex-1"
          >
            Next Question
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
