"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useParams, useRouter } from "next/navigation"
import { hostLinksApi, sessionsApi, episodesApi } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { RoomCodePanel } from "@/components/game/room-code-panel"
import { IncomingAnswersPanel } from "@/components/game/incoming-answers-panel"
import { QuestionOrchestrationControls } from "@/components/game/question-orchestration-controls"
import { MacroPhaseBar } from "@/components/game/macro-phase-bar"
import { Toaster } from "@/components/ui/sonner"
import { toast } from "sonner"
import {
  Loader2,
  AlertCircle,
  Lock,
  Monitor,
  RefreshCw,
  Play,
  CheckCircle2,
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
  GradeOverrideItem,
} from "@/lib/api-types"

export default function HostTokenPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  // PIN gate state
  const [pin, setPin] = useState("")
  const [isPinValidated, setIsPinValidated] = useState(false)
  const [pinError, setPinError] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  // Session state
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
  const [isRestarting, setIsRestarting] = useState(false)

  // Gameboard controls
  const [showVideo, setShowVideo] = useState(true)
  const [musicEnabled, setMusicEnabled] = useState(true)
  const gameboardWindowRef = useRef<Window | null>(null)
  const [isGameboardOpen, setIsGameboardOpen] = useState(false)

  // --------------- PIN VALIDATION ---------------
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pin.trim()) {
      setPinError("Please enter the PIN")
      return
    }
    setIsValidating(true)
    setPinError(null)
    try {
      const validatedSession = await hostLinksApi.validate({ Token: token, PIN: pin.trim() })
      setSession(validatedSession)

      const ep = await episodesApi.get(validatedSession.IDEpisode)
      setEpisode(ep)

      setIsPinValidated(true)
    } catch {
      setPinError("Invalid PIN or expired link")
    }
    setIsValidating(false)
  }

  // --------------- REFRESH STATUS ---------------
  const refreshSessionStatus = useCallback(async () => {
    if (!session) return
    try {
      const status = await sessionsApi.status(session.IDGameSession)
      setSessionStatus(status)
    } catch (err) {
      console.error("Failed to refresh status:", err)
    }
  }, [session])

  // --------------- GAMEBOARD WINDOW TRACKING ---------------
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
      const win = window.open(`/trivia/display/gameboard?session=${session.IDGameSession}`, "_blank")
      if (win) {
        gameboardWindowRef.current = win
        setIsGameboardOpen(true)
      }
    }
  }

  // --------------- POLLING ---------------
  useEffect(() => {
    if (!session) return

    const poll = async () => {
      try {
        const status = await sessionsApi.status(session.IDGameSession)
        setSessionStatus(status)

        const teamsList = await sessionsApi.teams(session.IDGameSession)
        setTeams(teamsList)

        if (status.CurrentRound && status.CurrentQuestion && episode) {
          const round = episode.rounds.find(r => r.RoundNumber === status.CurrentRound)
          if (round) {
            setCurrentRound(round)
            const question = round.questions.find(q => q.QuestionOrder === status.CurrentQuestion)
            if (question) {
              setCurrentQuestion(question)
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

  // --------------- HANDLERS ---------------
  const handleStartSession = async () => {
    if (!session) return
    setIsLoading(true)
    try {
      const updated = await sessionsApi.start(session.IDGameSession)
      setSession(updated)
      toast.success("Game started!")
    } catch {
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
    } catch {
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
    } catch {
      toast.error("Failed to advance")
    }
    setIsLoading(false)
  }

  const handleKickTeam = async (teamId: string) => {
    if (!session) return
    try {
      await sessionsApi.kick({ IDGameSession: session.IDGameSession, IDTeam: teamId })
      toast.success("Team removed")
    } catch {
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
    } catch {
      toast.error("Failed to end game")
    }
    setIsLoading(false)
  }

  const handleRestartSession = async () => {
    if (!session) return
    if (!confirm("Restart the game? This will reset to Round 1, Question 1.")) return
    setIsRestarting(true)
    try {
      const updated = await sessionsApi.restart(session.IDGameSession)
      setSession(updated)
      toast.success("Game restarted!")
    } catch {
      toast.error("Failed to restart game")
    }
    setIsRestarting(false)
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

  const handleGradeOverride = async (overrides: GradeOverrideItem[]) => {
    if (!session) return
    try {
      const result = await sessionsApi.gradeOverride({
        IDGameSession: session.IDGameSession,
        overrides,
      })
      toast.success(`Graded ${result.updated} responses`)
      await handleRefreshResponses()
    } catch {
      toast.error("Failed to grade responses")
    }
  }

  const handleToggleShowAnswer = () => {
    // Orchestration handles answer reveal via server state now
  }

  const handleToggleShowVideo = () => {
    setShowVideo(prev => !prev)
  }

  const refreshTeams = async () => {
    if (!session) return
    const teamsList = await sessionsApi.teams(session.IDGameSession)
    setTeams(teamsList)
  }

  const refreshLeaderboard = async () => {
    if (!session) return
    const lb = await sessionsApi.leaderboard(session.IDGameSession)
    setLeaderboard(lb)
  }

  // =============== PIN GATE ===============
  if (!isPinValidated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gray-800 border-gray-700 p-8 max-w-sm w-full text-center">
            <div className="p-4 rounded-full bg-purple-600/20 border border-purple-500/30 w-fit mx-auto mb-6">
              <Lock className="h-8 w-8 text-purple-400" />
            </div>
            <h1 className="text-xl font-display font-bold text-white mb-2">Host PIN Required</h1>
            <p className="text-gray-400 text-sm mb-6">
              Enter the PIN provided by the game admin to access host controls.
            </p>
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <Input
                type="text"
                value={pin}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setPin(e.target.value)
                  setPinError(null)
                }}
                placeholder="Enter PIN"
                autoFocus
                className="bg-gray-900 border-gray-700 text-white text-center text-2xl tracking-[0.3em] font-display h-14 placeholder:text-gray-600 placeholder:text-base placeholder:tracking-normal"
              />
              {pinError && (
                <div className="flex items-center justify-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {pinError}
                </div>
              )}
              <Button
                type="submit"
                disabled={isValidating || !pin.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {isValidating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Lock className="h-4 w-4 mr-2" />
                )}
                {isValidating ? "Validating..." : "Enter"}
              </Button>
            </form>
          </Card>
        </motion.div>
      </div>
    )
  }

  // Compute grading stats
  const totalTeams = teams.length
  const respondedCount = responses.length
  const gradedCount = responses.filter(r => r.IsCorrect !== null).length
  const correctCount = responses.filter(r => r.IsCorrect === true).length

  // =============== MAIN HOST CONTROLLER ===============
  const isActive = sessionStatus?.Status === "active"
  const isCompleted = sessionStatus?.Status === "completed"

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
            <span className="px-2 py-0.5 rounded bg-purple-600/20 text-purple-400 text-xs font-medium">
              Host
            </span>
            {episode && (
              <>
                <span className="text-gray-600">/</span>
                <span className="text-gray-400 text-sm">{episode.Title}</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content — 2-column layout */}
      <main className="max-w-7xl mx-auto p-4">
        {/* Macro Phase Bar — full width at top */}
        {session && (
          <div className="mb-4">
            <MacroPhaseBar
              sessionStatus={sessionStatus}
              sessionId={session.IDGameSession}
              leaderboard={leaderboard}
              onRefreshStatus={refreshSessionStatus}
              hasRulesVideo={!!episode?.RulesVideoUrl}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Left Column (3/5) — Game Navigation */}
          <div className="lg:col-span-3 space-y-4">
            {/* Current Question Card */}
            {isActive && currentQuestion ? (
              <>
                <QuestionOrchestrationControls
                  currentQuestion={currentQuestion}
                  currentRound={currentRound}
                  sessionStatus={sessionStatus}
                  teams={teams}
                  responses={responses}
                  showVideo={showVideo}
                  sessionId={session!.IDGameSession}
                  isGrading={isGrading}
                  onGrade={handleGrade}
                  onNextQuestion={handleNextQuestion}
                  onRefreshStatus={refreshSessionStatus}
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
                  onNextQuestion={handleNextQuestion}
                  onRefresh={handleRefreshResponses}
                  onKickTeam={handleKickTeam}
                />
              </>
            ) : isCompleted ? (
              <Card className="bg-gray-800 border-gray-700 overflow-hidden">
                <div className="p-5">
                  <div className="py-8 text-center">
                    <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-3" />
                    <p className="text-lg font-semibold text-white">Game Over!</p>
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
                    <p className="text-base font-semibold text-gray-400">Waiting for Game Start</p>
                    <p className="text-sm text-gray-500 mt-1">Use the phase controls above to advance through the game</p>
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
              showVideo={showVideo}
              onToggleShowVideo={handleToggleShowVideo}
              musicEnabled={musicEnabled}
              onToggleMusic={() => setMusicEnabled(!musicEnabled)}
            />

            {/* Restart — active only */}
            {isActive && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRestartSession}
                disabled={isLoading || isRestarting}
                className="w-full border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
              >
                {isRestarting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Restart Game
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
