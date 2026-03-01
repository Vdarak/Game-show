"use client"

import { useEffect, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useParams, useRouter } from "next/navigation"
import { hostLinksApi, sessionsApi, episodesApi } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { IncomingAnswersPanel } from "@/components/game/incoming-answers-panel"
import { LeaderboardPanel } from "@/components/game/leaderboard-panel"
import { Toaster } from "@/components/ui/sonner"
import { toast } from "sonner"
import {
  Loader2,
  AlertCircle,
  Play,
  QrCode,
  Users,
  Trophy,
  Clock,
  StopCircle,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react"
import type {
  Session,
  SessionStatusResponse,
  LeaderboardResponse,
  Team,
  TeamResponse,
  Question,
  Round,
  EpisodeWithRounds,
} from "@/lib/api-types"

export default function HostTokenPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  // State
  const [isValidating, setIsValidating] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
  const [copied, setCopied] = useState(false)

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      try {
        const validatedSession = await hostLinksApi.validate({ Token: token })
        setSession(validatedSession)
        
        // Load episode details
        const ep = await episodesApi.get(validatedSession.IDEpisode)
        setEpisode(ep)
        
        setIsValidating(false)
      } catch (err) {
        setError("Invalid or expired host link")
        setIsValidating(false)
      }
    }

    if (token) {
      validateToken()
    }
  }, [token])

  // Poll for updates when session is active
  useEffect(() => {
    if (!session) return

    const poll = async () => {
      try {
        const status = await sessionsApi.status(session.IDGameSession)
        setSessionStatus(status)
        
        const teamsList = await sessionsApi.teams(session.IDGameSession)
        setTeams(teamsList)

        // Find current question/round from episode
        if (status.CurrentRound && status.CurrentQuestion && episode) {
          const round = episode.rounds.find(r => r.RoundNumber === status.CurrentRound)
          if (round) {
            setCurrentRound(round)
            const question = round.questions.find(q => q.QuestionOrder === status.CurrentQuestion)
            if (question) {
              setCurrentQuestion(question)
              // Get responses for current question
              const resps = await sessionsApi.responses({
                IDGameSession: session.IDGameSession,
                IDQuestion: question.IDQuestion,
              })
              setResponses(resps)
            }
          }
        }

        const lb = await sessionsApi.leaderboard(session.IDGameSession)
        setLeaderboard(lb)
      } catch (err) {
        console.error("Poll error:", err)
      }
    }

    poll()
    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [session, episode])

  // Handlers
  const handleStartSession = async () => {
    if (!session) return
    setIsLoading(true)
    try {
      const updated = await sessionsApi.start(session.IDGameSession)
      setSession(updated)
      toast.success("Game started!")
    } catch (err) {
      toast.error("Failed to start game")
    }
    setIsLoading(false)
  }

  const handleGrade = async () => {
    if (!session) return
    setIsGrading(true)
    try {
      const result = await sessionsApi.grade({ IDGameSession: session.IDGameSession })
      toast.success(`Graded ${result.total_graded} responses`)
    } catch (err) {
      toast.error("Failed to grade responses")
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
      toast.error("Failed to advance")
    }
    setIsLoading(false)
  }

  const handleKickTeam = async (teamId: string) => {
    if (!session) return
    try {
      await sessionsApi.kick({ IDGameSession: session.IDGameSession, IDTeam: teamId })
      toast.success("Team removed")
    } catch (err) {
      toast.error("Failed to remove team")
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
      toast.error("Failed to end game")
    }
    setIsLoading(false)
  }

  const handleRestartSession = async () => {
    if (!session) return
    if (!confirm("Restart the game? This will reset to Round 1, Question 1.")) return
    setIsLoading(true)
    try {
      const updated = await sessionsApi.restart(session.IDGameSession)
      setSession(updated)
      toast.success("Game restarted!")
    } catch (err) {
      toast.error("Failed to restart game")
    }
    setIsLoading(false)
  }

  const handleRefreshResponses = async () => {
    if (currentQuestion && session) {
      const resps = await sessionsApi.responses({
        IDGameSession: session.IDGameSession,
        IDQuestion: currentQuestion.IDQuestion,
      })
      setResponses(resps)
    }
  }

  const handleCopyRoomCode = async () => {
    if (!session) return
    try {
      await navigator.clipboard.writeText(session.RoomCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error("Failed to copy")
    }
  }

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-gray-400">Validating host link...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="bg-gray-800 border-gray-700 p-8 max-w-md text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">Link Invalid</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <Button onClick={() => router.push("/trivia")} variant="outline">
            Go to Login
          </Button>
        </Card>
      </div>
    )
  }

  const isInLobby = sessionStatus?.Status === "lobby"
  const isActive = sessionStatus?.Status === "active"
  const isCompleted = sessionStatus?.Status === "completed"
  const roomCode = session?.RoomCode || ""
  const joinUrl = typeof window !== "undefined"
    ? `${window.location.origin}/play/join?code=${roomCode}`
    : ""
  const qrCodeUrl = roomCode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}&bgcolor=1f2937&color=ffffff`
    : ""

  return (
    <div className="min-h-screen bg-gray-900">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-display text-xl font-bold text-white">
              Trivi-Time
            </h1>
            <span className="px-2 py-1 rounded bg-purple-600/20 text-purple-400 text-xs font-medium">
              Host Mode
            </span>
            {episode && (
              <span className="text-gray-400 text-sm">{episode.Title}</span>
            )}
          </div>
          {isActive && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRestartSession}
                disabled={isLoading}
                className="border-yellow-500/50 text-yellow-400"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Restart
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleEndSession}
                disabled={isLoading}
              >
                <StopCircle className="h-4 w-4 mr-2" />
                End Game
              </Button>
            </div>
          )}
          {isCompleted && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRestartSession}
              disabled={isLoading}
              className="border-yellow-500/50 text-yellow-400"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Restart Game
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column - Room Info */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-gray-800 border-gray-700 overflow-hidden">
              {/* Status */}
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <QrCode className="h-4 w-4 text-purple-400" />
                    Game Session
                  </h3>
                  <div
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      isActive
                        ? "bg-green-600/20 text-green-400"
                        : isInLobby
                        ? "bg-yellow-600/20 text-yellow-400"
                        : "bg-gray-600/20 text-gray-400"
                    }`}
                  >
                    {isActive ? "Active" : isInLobby ? "Lobby" : isCompleted ? "Ended" : "Unknown"}
                  </div>
                </div>
              </div>

              {/* QR & Room Code */}
              <div className="p-6 flex flex-col items-center">
                {qrCodeUrl && (
                  <div className="bg-gray-900 p-4 rounded-xl mb-4">
                    <img src={qrCodeUrl} alt="QR Code" className="w-40 h-40" />
                  </div>
                )}

                <div className="text-center mb-4">
                  <p className="text-xs text-gray-400 mb-1">ROOM CODE</p>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-4xl font-bold text-white tracking-[0.3em]">
                      {roomCode}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyRoomCode}
                      className="text-gray-400 hover:text-white"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <a
                  href={joinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Player Join Link
                </a>
              </div>

              {/* Team Count */}
              <div className="px-4 pb-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-300">
                      {teams.length} {teams.length === 1 ? "team" : "teams"} joined
                    </span>
                  </div>
                </div>
              </div>

              {/* Start Button */}
              {isInLobby && (
                <div className="p-4 border-t border-gray-700 bg-gray-900/50">
                  <Button
                    onClick={handleStartSession}
                    disabled={isLoading || teams.length === 0}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Start Game
                  </Button>
                  {teams.length === 0 && (
                    <p className="text-xs text-gray-500 text-center mt-2">
                      Wait for teams to join before starting
                    </p>
                  )}
                </div>
              )}

              {/* Active Status */}
              {isActive && sessionStatus && (
                <div className="p-4 border-t border-gray-700 bg-gray-900/50">
                  <div className="text-center text-sm text-gray-400">
                    Round {sessionStatus.CurrentRound || "-"} • Question{" "}
                    {sessionStatus.CurrentQuestion || "-"}
                  </div>
                </div>
              )}
            </Card>

            {/* Quick Stats */}
            <Card className="bg-gray-800 border-gray-700 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-display font-bold text-white">
                    {teams.length}
                  </div>
                  <div className="text-xs text-gray-400">Teams</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-display font-bold text-white">
                    {responses.length}
                  </div>
                  <div className="text-xs text-gray-400">Responses</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Middle Column - Incoming Answers */}
          <div className="lg:col-span-1">
            <IncomingAnswersPanel
              sessionId={session?.IDGameSession || ""}
              teams={teams}
              responses={responses}
              currentQuestion={currentQuestion}
              currentRound={currentRound}
              isGrading={isGrading}
              onGrade={handleGrade}
              onNextQuestion={handleNextQuestion}
              onRefresh={handleRefreshResponses}
              onKickTeam={handleKickTeam}
            />
          </div>

          {/* Right Column - Leaderboard */}
          <div className="lg:col-span-1">
            <LeaderboardPanel
              leaderboard={leaderboard}
              isLoading={isLoading}
              onRefresh={async () => {
                if (session) {
                  const lb = await sessionsApi.leaderboard(session.IDGameSession)
                  setLeaderboard(lb)
                }
              }}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
