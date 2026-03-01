"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { useAuth, useRequireAuth } from "@/hooks/use-auth"
import { useHostSession } from "@/hooks/use-host-session"
import { episodesApi } from "@/lib/api-client"
import { createDemoGame } from "@/lib/demo-game-generator"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { RoomCodePanel } from "@/components/game/room-code-panel"
import { IncomingAnswersPanel } from "@/components/game/incoming-answers-panel"
import { LeaderboardPanel } from "@/components/game/leaderboard-panel"
import { EpisodeEditor } from "@/components/game/episode-editor"
import { Toaster } from "@/components/ui/sonner"
import { toast } from "sonner"
import {
  Loader2,
  LogOut,
  Play,
  Plus,
  Folder,
  ChevronRight,
  AlertCircle,
  Settings,
  Trophy,
  Users,
  Clock,
  StopCircle,
  Trash2,
  Edit3,
  SkipForward,
  RefreshCw,
  Monitor,
  ExternalLink,
} from "lucide-react"
import type { Episode } from "@/lib/api-types"

type View = "episodes" | "session"

export default function TriviaControllerPage() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const { isAuthenticated, isLoading: authLoading } = useRequireAuth()

  const {
    episode,
    session,
    sessionStatus,
    teams,
    responses,
    leaderboard,
    currentQuestion,
    currentRound,
    isLoading,
    error,
    loadEpisode,
    createSession,
    refreshSessionStatus,
    refreshTeams,
    refreshResponses,
    refreshLeaderboard,
    startSession,
    nextQuestion,
    gradeResponses,
    kickTeam,
    endSession,
    restartSession,
    clearSession,
    clearError,
  } = useHostSession()

  const [view, setView] = useState<View>("episodes")
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false)
  const [isGrading, setIsGrading] = useState(false)
  const [editingEpisodeId, setEditingEpisodeId] = useState<string | null>(null)
  const [isCreatingEpisode, setIsCreatingEpisode] = useState(false)
  const [isCreatingDemo, setIsCreatingDemo] = useState(false)
  const [isRestarting, setIsRestarting] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [showVideo, setShowVideo] = useState(true)
  const [musicEnabled, setMusicEnabled] = useState(true)

  // Broadcast video toggle to gameboard
  const handleToggleShowVideo = () => {
    const newValue = !showVideo
    setShowVideo(newValue)
    if (session && typeof window !== "undefined") {
      try {
        const bc = new BroadcastChannel(`trivitime-host-${session.IDGameSession}`)
        bc.postMessage({ type: "TOGGLE_VIDEO" })
        bc.close()
      } catch (e) {
        console.log("BroadcastChannel not supported")
      }
    }
  }

  // Load episodes on mount
  useEffect(() => {
    if (isAuthenticated) {
      loadEpisodesList()
    }
  }, [isAuthenticated])

  // Switch to session view when session is created
  useEffect(() => {
    if (session) {
      setView("session")
    }
  }, [session])

  // Poll for updates when in an active session
  useEffect(() => {
    if (!session || view !== "session") return

    const poll = async () => {
      await Promise.all([
        refreshSessionStatus(),
        refreshTeams(),
        currentQuestion ? refreshResponses(currentQuestion.IDQuestion) : null,
        refreshLeaderboard(),
      ])
    }

    poll()
    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [
    session,
    view,
    currentQuestion,
    refreshSessionStatus,
    refreshTeams,
    refreshResponses,
    refreshLeaderboard,
  ])

  // Show errors as toasts
  useEffect(() => {
    if (error) {
      toast.error(error)
      clearError()
    }
  }, [error, clearError])

  const loadEpisodesList = async () => {
    setIsLoadingEpisodes(true)
    try {
      const list = await episodesApi.list()
      setEpisodes(list)
    } catch (err) {
      toast.error("Failed to load episodes")
    }
    setIsLoadingEpisodes(false)
  }

  const handleDeleteEpisode = async (episodeId: string) => {
    if (!confirm("Delete this episode? This will also delete all rounds and questions.")) {
      return
    }
    try {
      await episodesApi.delete(episodeId)
      setEpisodes(episodes.filter(ep => ep.IDEpisode !== episodeId))
      toast.success("Episode deleted")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete episode"
      console.error("Delete episode error:", err)
      toast.error(message)
    }
  }

  const handleSelectEpisode = async (episodeId: string) => {
    try {
      await loadEpisode(episodeId)
      await createSession(episodeId)
    } catch (err) {
      // Error handled by hook
    }
  }

  const handleStartSession = async () => {
    try {
      await startSession()
      toast.success("Game started!")
    } catch (err) {
      // Error handled by hook
    }
  }

  const handleGrade = async () => {
    setIsGrading(true)
    try {
      const result = await gradeResponses()
      if (result) {
        toast.success(`Graded ${result.total_graded} responses`)
      }
    } catch (err) {
      // Error handled by hook
    }
    setIsGrading(false)
  }

  const handleNextQuestion = async () => {
    try {
      const updated = await nextQuestion()
      if (updated.Status === "completed") {
        toast.info("Game completed!")
      }
    } catch (err) {
      // Error handled by hook
    }
  }

  const handleRefreshResponses = async () => {
    if (currentQuestion) {
      await refreshResponses(currentQuestion.IDQuestion)
    }
  }

  const handleEndSession = async () => {
    if (!confirm("Are you sure you want to end this game session?")) return
    try {
      await endSession()
      toast.info("Game ended")
    } catch (err) {
      // Error handled by hook
    }
  }

  const handleRestartSession = async () => {
    if (!confirm("Restart the game? This will reset to Round 1, Question 1.")) return
    setIsRestarting(true)
    try {
      await restartSession()
      toast.success("Game restarted!")
    } catch (err) {
      // Error handled by hook
    }
    setIsRestarting(false)
  }

  const openGameboard = () => {
    if (session) {
      window.open(`/trivia/display/gameboard?session=${session.IDGameSession}`, "_blank")
    }
  }

  const handleLeaveSession = () => {
    clearSession()
    setView("episodes")
  }

  const handleLogout = () => {
    logout()
    router.push("/auth/login")
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

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
            {session && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500">/</span>
                <span className="text-gray-400 text-sm">{episode?.Title}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <span className="text-sm text-gray-400">{user.display_name}</span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-gray-400 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4">
        <AnimatePresence mode="wait">
          {view === "episodes" ? (
            <motion.div
              key="episodes"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Episodes List */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Folder className="h-5 w-5 text-purple-400" />
                    Select Episode
                  </h2>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-green-500/50 text-green-400 hover:bg-green-500/10"
                      disabled={isCreatingDemo || isCreatingEpisode}
                      onClick={async () => {
                        setIsCreatingDemo(true)
                        try {
                          const result = await createDemoGame()
                          toast.success(`Created demo game with ${result.rounds.length} rounds and ${result.questions.length} questions!`)
                          await loadEpisodesList()
                        } catch (err) {
                          console.error("Failed to create demo game:", err)
                          toast.error("Failed to create demo game")
                        }
                        setIsCreatingDemo(false)
                      }}
                    >
                      {isCreatingDemo ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-1" />
                      )}
                      Create Demo Game
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-purple-500/50 text-purple-400"
                      disabled={isCreatingEpisode || isCreatingDemo}
                      onClick={async () => {
                        setIsCreatingEpisode(true)
                        try {
                          const newEpisode = await episodesApi.create({
                            Title: "New Episode",
                          })
                          setEditingEpisodeId(newEpisode.IDEpisode)
                        } catch (err) {
                          toast.error("Failed to create episode")
                        }
                        setIsCreatingEpisode(false)
                      }}
                    >
                      {isCreatingEpisode ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-1" />
                      )}
                      Create Episode
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={loadEpisodesList}
                      disabled={isLoadingEpisodes}
                      className="text-gray-400"
                    >
                      {isLoadingEpisodes ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Refresh"
                      )}
                    </Button>
                  </div>
                </div>

                {isLoadingEpisodes ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                  </div>
                ) : episodes.length === 0 ? (
                  <Card className="bg-gray-800 border-gray-700 p-8 text-center">
                    <Folder className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 mb-4">No episodes found</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <Button
                        variant="outline"
                        disabled={isCreatingDemo || isCreatingEpisode}
                        onClick={async () => {
                          setIsCreatingDemo(true)
                          try {
                            const result = await createDemoGame()
                            toast.success(`Created demo game with ${result.rounds.length} rounds and ${result.questions.length} questions!`)
                            await loadEpisodesList()
                          } catch (err) {
                            console.error("Failed to create demo game:", err)
                            toast.error("Failed to create demo game")
                          }
                          setIsCreatingDemo(false)
                        }}
                        className="border-green-500/50 text-green-400 hover:bg-green-500/10"
                      >
                        {isCreatingDemo ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4 mr-2" />
                        )}
                        Create Demo Game
                      </Button>
                      <span className="text-gray-600">or</span>
                      <Button
                        variant="outline"
                        disabled={isCreatingEpisode || isCreatingDemo}
                        onClick={async () => {
                          setIsCreatingEpisode(true)
                          try {
                            const newEpisode = await episodesApi.create({
                              Title: "New Episode",
                            })
                            setEditingEpisodeId(newEpisode.IDEpisode)
                          } catch (err) {
                            toast.error("Failed to create episode")
                          }
                          setIsCreatingEpisode(false)
                        }}
                        className="border-purple-500/50 text-purple-400"
                      >
                        {isCreatingEpisode ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4 mr-2" />
                        )}
                        Create Your First Episode
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <div className="grid gap-3">
                    {episodes.map((ep) => (
                      <Card
                        key={ep.IDEpisode}
                        className="bg-gray-800 border-gray-700 hover:border-purple-500/50 p-4 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <button
                            onClick={() => handleSelectEpisode(ep.IDEpisode)}
                            disabled={isLoading}
                            className="flex-1 text-left hover:opacity-80 transition-opacity"
                          >
                            <h3 className="font-semibold text-white">
                              {ep.Title}
                            </h3>
                            {ep.Description && (
                              <p className="text-sm text-gray-400 mt-1">
                                {ep.Description}
                              </p>
                            )}
                          </button>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingEpisodeId(ep.IDEpisode)
                              }}
                              className="text-gray-400 hover:text-white hover:bg-gray-700 h-8 w-8 p-0"
                              title="Edit Episode"
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteEpisode(ep.IDEpisode)
                              }}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0"
                              title="Delete Episode"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <ChevronRight className="h-4 w-4 text-gray-500" />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="session"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Session Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLeaveSession}
                    className="text-gray-400"
                  >
                    ← Back to Episodes
                  </Button>
                  {sessionStatus?.Status === "active" && (
                    <div className="flex items-center gap-2 ml-4">
                      <span className="text-sm text-gray-500">
                        Round {sessionStatus.CurrentRound} · Q{sessionStatus.CurrentQuestion}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Open Gameboard */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openGameboard}
                    className="border-blue-500/50 text-blue-400"
                  >
                    <Monitor className="h-4 w-4 mr-2" />
                    Open Gameboard
                  </Button>
                  
                  {/* Orchestration Controls */}
                  {sessionStatus?.Status === "active" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextQuestion}
                        disabled={isLoading}
                        className="border-purple-500/50 text-purple-400"
                      >
                        <SkipForward className="h-4 w-4 mr-2" />
                        Next Question
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRestartSession}
                        disabled={isLoading || isRestarting}
                        className="border-yellow-500/50 text-yellow-400"
                      >
                        {isRestarting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
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
                    </>
                  )}
                  
                  {sessionStatus?.Status === "completed" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRestartSession}
                      disabled={isLoading || isRestarting}
                      className="border-yellow-500/50 text-yellow-400"
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

              {/* Session Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left Column - Room Code */}
                <div className="lg:col-span-1 space-y-4">
                  <RoomCodePanel
                    session={session}
                    sessionStatus={sessionStatus}
                    teamCount={teams.length}
                    isLoading={isLoading}
                    onStartSession={handleStartSession}
                    onStopSession={handleEndSession}
                    onRefreshTeams={refreshTeams}
                    showAnswer={showAnswer}
                    onToggleShowAnswer={() => setShowAnswer(!showAnswer)}
                    showVideo={showVideo}
                    onToggleShowVideo={handleToggleShowVideo}
                    musicEnabled={musicEnabled}
                    onToggleMusic={() => setMusicEnabled(!musicEnabled)}
                  />

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
                    onKickTeam={kickTeam}
                  />
                </div>

                {/* Right Column - Leaderboard */}
                <div className="lg:col-span-1">
                  <LeaderboardPanel
                    leaderboard={leaderboard}
                    isLoading={isLoading}
                    onRefresh={refreshLeaderboard}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Episode Editor Modal */}
      {editingEpisodeId && (
        <EpisodeEditor
          episodeId={editingEpisodeId}
          onClose={() => {
            setEditingEpisodeId(null)
            loadEpisodesList()
          }}
          onUpdate={() => loadEpisodesList()}
        />
      )}
    </div>
  )
}
