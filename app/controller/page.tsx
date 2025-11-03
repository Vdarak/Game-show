"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useGameState } from "@/hooks/use-game-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { StrikeIndicator } from "@/components/game/strike-indicator"
import { formatScore } from "@/lib/game-utils"
import { AnimatedNumber } from "@/components/game/animated-number"
import {
  ExternalLink,
  Plus,
  Minus,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Trophy,
  Volume2,
  AlertCircle,
  Monitor,
} from "lucide-react"

type DisplayWindow = {
  name: string
  url: string
  windowRef: Window | null
  status: "active" | "error" | "hidden"
}

export default function ControllerPage() {
  const {
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
    awardRoundPoints,
    resetGame,
    clearQuestion,
  } = useGameState()

  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showScoreResetConfirm, setShowScoreResetConfirm] = useState(false)
  const [gameStartTime] = useState(Date.now())
  const [elapsedTime, setElapsedTime] = useState(0)

  const [displays, setDisplays] = useState<DisplayWindow[]>([
    { name: "Game Board", url: "/display/game-board", windowRef: null, status: "hidden" },
    { name: "Team A", url: "/display/team/A", windowRef: null, status: "hidden" },
    { name: "Team B", url: "/display/team/B", windowRef: null, status: "hidden" },
    { name: "Team C", url: "/display/team/C", windowRef: null, status: "hidden" },
    { name: "Team D", url: "/display/team/D", windowRef: null, status: "hidden" },
    { name: "Audience", url: "/display/audience", windowRef: null, status: "hidden" },
  ])

  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set(["A"]))

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - gameStartTime) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [gameStartTime])

  useEffect(() => {
    const checkInterval = setInterval(() => {
      setDisplays((prev) =>
        prev.map((display) => {
          if (display.windowRef && !display.windowRef.closed) {
            try {
              display.windowRef.location.href
              return { ...display, status: "active" as const }
            } catch {
              return { ...display, status: "error" as const }
            }
          } else if (display.windowRef && display.windowRef.closed) {
            return { ...display, windowRef: null, status: "hidden" as const }
          }
          return display
        }),
      )
    }, 2000)

    return () => clearInterval(checkInterval)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const openDisplay = (index: number) => {
    setDisplays((prev) =>
      prev.map((display, i) => {
        if (i === index && (!display.windowRef || display.windowRef.closed)) {
          const newWindow = window.open(display.url, display.name, "width=1920,height=1080")
          return { ...display, windowRef: newWindow, status: "active" as const }
        }
        return display
      }),
    )
  }

  const toggleDisplay = (index: number) => {
    setDisplays((prev) =>
      prev.map((display, i) => {
        if (i === index) {
          if (display.windowRef && !display.windowRef.closed) {
            display.windowRef.close()
            return { ...display, windowRef: null, status: "hidden" as const }
          } else {
            const newWindow = window.open(display.url, display.name, "width=1920,height=1080")
            return { ...display, windowRef: newWindow, status: "active" as const }
          }
        }
        return display
      }),
    )
  }

  const toggleTeamSelection = (teamId: string) => {
    setSelectedTeams((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(teamId)) {
        newSet.delete(teamId)
      } else {
        newSet.add(teamId)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedTeams.size === 4) {
      setSelectedTeams(new Set())
    } else {
      setSelectedTeams(new Set(["A", "B", "C", "D"]))
    }
  }

  const applyScoreToSelected = (points: number) => {
    selectedTeams.forEach((teamId) => {
      updateScore(teamId, points)
    })
  }

  const handleResetScores = () => {
    if (showScoreResetConfirm) {
      selectedTeams.forEach((teamId) => {
        const team = state.teams.find((t) => t.id === teamId)
        if (team) {
          updateScore(teamId, -team.score)
        }
      })
      setShowScoreResetConfirm(false)
      setSelectedTeams(new Set())
    } else {
      setShowScoreResetConfirm(true)
      setTimeout(() => setShowScoreResetConfirm(false), 3000)
    }
  }

  const handleResetGame = () => {
    if (showResetConfirm) {
      resetGame()
      setShowResetConfirm(false)
    } else {
      setShowResetConfirm(true)
      setTimeout(() => setShowResetConfirm(false), 3000)
    }
  }

  const soundEffects = [
    { name: "Buzz", type: "buzz" as const },
    { name: "Ding", type: "ding" as const },
    { name: "Applause", type: "applause" as const },
    { name: "Wrong", type: "wrong" as const },
    { name: "Celebration", type: "celebration" as const },
    { name: "Drum Roll", type: "drumroll" as const },
  ]

  const getStatusColor = (status: DisplayWindow["status"]) => {
    switch (status) {
      case "active":
        return "text-green-500"
      case "error":
        return "text-red-500"
      case "hidden":
        return "text-gray-500"
    }
  }

  const openAllDisplays = () => {
    const screenWidth = window.screen.availWidth
    const screenHeight = window.screen.availHeight
    const cellWidth = Math.floor(screenWidth / 2)
    const cellHeight = Math.floor(screenHeight / 3)

    const gridPositions = [
      { left: 0, top: 0 }, // Game Board - top left
      { left: cellWidth, top: 0 }, // Team A - top right
      { left: 0, top: cellHeight }, // Team B - middle left
      { left: cellWidth, top: cellHeight }, // Team C - middle right
      { left: 0, top: cellHeight * 2 }, // Team D - bottom left
      { left: cellWidth, top: cellHeight * 2 }, // Audience - bottom right
    ]

    displays.forEach((display, index) => {
      setTimeout(() => {
        if (!display.windowRef || display.windowRef.closed) {
          const pos = gridPositions[index]
          const features = `width=${cellWidth},height=${cellHeight},left=${pos.left},top=${pos.top}`
          const newWindow = window.open(display.url, display.name, features)

          setDisplays((prev) =>
            prev.map((d, i) => (i === index ? { ...d, windowRef: newWindow, status: "active" as const } : d)),
          )
        }
      }, index * 150)
    })
  }

  const openAllTeamDisplays = () => {
    const screenWidth = window.screen.availWidth
    const screenHeight = window.screen.availHeight
    const cellWidth = Math.floor(screenWidth / 2)
    const cellHeight = Math.floor(screenHeight / 2)

    const gridPositions = [
      { left: 0, top: 0 }, // Team A - top left
      { left: cellWidth, top: 0 }, // Team B - top right
      { left: 0, top: cellHeight }, // Team C - bottom left
      { left: cellWidth, top: cellHeight }, // Team D - bottom right
    ]

    const teamDisplayIndices = [1, 2, 3, 4]

    teamDisplayIndices.forEach((displayIndex, gridIndex) => {
      setTimeout(() => {
        const display = displays[displayIndex]
        if (!display.windowRef || display.windowRef.closed) {
          const pos = gridPositions[gridIndex]
          const features = `width=${cellWidth},height=${cellHeight},left=${pos.left},top=${pos.top}`
          const newWindow = window.open(display.url, display.name, features)

          setDisplays((prev) =>
            prev.map((d, i) => (i === displayIndex ? { ...d, windowRef: newWindow, status: "active" as const } : d)),
          )
        }
      }, gridIndex * 150)
    })
  }

  const teams = state.teams || []

  return (
    <div className="min-h-screen bg-gray-900 p-2 text-white sm:p-4">
      <div className="mx-auto max-w-[1800px]">
        {/* Header Bar */}
        <Card className="mb-2 bg-gray-800 p-3 sm:mb-4 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <h1 className="font-display text-base sm:text-lg">Family Feud Controller</h1>
            </div>
            <div className="flex items-center gap-3 sm:gap-6">
              <div className="text-right">
                <div className="text-xs text-gray-400">Round</div>
                <div className="font-display text-xs sm:text-sm">
                  {state.currentQuestionIndex + 1} / {state.questions.length}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400">Time Elapsed</div>
                <div className="font-display text-xs sm:text-sm">{formatTime(elapsedTime)}</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Display Status */}
        <Card className="mb-2 bg-gray-800 p-3 sm:mb-4 sm:p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-display text-xs sm:text-sm">Display Status</h2>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={openAllTeamDisplays}
                variant="outline"
                size="sm"
                className="flex-1 bg-transparent text-xs sm:flex-none"
              >
                <ExternalLink className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Open All Team Displays</span>
                <span className="sm:hidden">Teams</span>
              </Button>
              <Button onClick={openAllDisplays} variant="default" size="sm" className="flex-1 text-xs sm:flex-none">
                <ExternalLink className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Open All Displays</span>
                <span className="sm:hidden">All</span>
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 sm:gap-3">
            {displays.map((display, index) => (
              <motion.div
                key={display.name}
                whileHover={{ scale: 1.02 }}
                className="flex items-center justify-between rounded-lg bg-gray-700 p-2 sm:p-3"
              >
                <div className="flex items-center gap-1 sm:gap-2">
                  <Monitor className={`h-3 w-3 sm:h-4 sm:w-4 ${getStatusColor(display.status)}`} />
                  <div>
                    <div className="text-xs font-semibold">{display.name}</div>
                    <div className="hidden text-xs capitalize text-gray-400 sm:block">{display.status}</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  {display.status === "hidden" && (
                    <Button
                      onClick={() => openDisplay(index)}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 sm:h-8 sm:w-8"
                      title="Open in new window"
                    >
                      <ExternalLink className="h-3 w-3 text-blue-400 sm:h-4 sm:w-4" />
                    </Button>
                  )}
                  <Button
                    onClick={() => toggleDisplay(index)}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 sm:h-8 sm:w-8"
                    title={display.status === "hidden" ? "Show display" : "Hide display"}
                  >
                    {display.status === "hidden" ? (
                      <EyeOff className="h-3 w-3 text-gray-500 sm:h-4 sm:w-4" />
                    ) : (
                      <Eye className={`h-3 w-3 sm:h-4 sm:w-4 ${getStatusColor(display.status)}`} />
                    )}
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>

        {/* Team Scores */}
        <Card className="mb-2 bg-gray-800/50 p-4 sm:mb-4 sm:p-6">
          <h2 className="mb-3 font-display text-xs sm:mb-4 sm:text-sm">Team Scores</h2>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4 lg:gap-4">
            {teams.map((team) => (
              <div
                key={team.id}
                className="group relative overflow-hidden rounded-xl border border-gray-700/50 bg-gray-900/50 p-3 transition-all hover:border-gray-600 sm:p-4"
              >
                <div className="mb-2 text-center sm:mb-3">
                  <AnimatedNumber
                    value={team.score}
                    color={team.color}
                    size="medium"
                    className="font-display tracking-tight"
                  />
                  <div className="mt-1 text-xs text-emerald-400">Round: +{formatScore(team.currentRoundScore)}</div>
                </div>

                <Input
                  value={team.name}
                  onChange={(e) => updateTeamName(team.id, e.target.value)}
                  className="mb-2 border-0 bg-gray-800/50 text-center text-xs font-medium text-white placeholder:text-gray-500 focus-visible:ring-1 focus-visible:ring-gray-600"
                  placeholder={`Team ${team.id}`}
                />

                <div className="flex items-center justify-center gap-2">
                  <div className="text-xs text-gray-500">Color</div>
                  <input
                    type="color"
                    value={team.color}
                    onChange={(e) => updateTeamColor(team.id, e.target.value)}
                    className="h-5 w-12 cursor-pointer rounded border-0 bg-transparent sm:h-6 sm:w-16"
                  />
                </div>

                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5 transition-all group-hover:h-1"
                  style={{ backgroundColor: team.color }}
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Question Control and Score Control */}
        <div className="mb-2 grid grid-cols-1 gap-2 sm:mb-4 sm:gap-4 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Card className="h-full bg-gray-800 p-3 sm:p-4">
              <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="font-display text-xs sm:text-sm">Question Control</h2>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={previousQuestion}
                    variant="outline"
                    size="sm"
                    disabled={state.currentQuestionIndex === 0}
                    className="flex-1 bg-transparent text-xs sm:flex-none"
                  >
                    <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Previous</span>
                  </Button>
                  <Button onClick={loadQuestion} variant="default" size="sm" className="flex-1 text-xs sm:flex-none">
                    Load Question
                  </Button>
                  <Button
                    onClick={nextQuestion}
                    variant="outline"
                    size="sm"
                    disabled={state.currentQuestionIndex >= state.questions.length - 1}
                    className="flex-1 text-xs sm:flex-none"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              </div>

              {state.currentQuestion ? (
                <div className="space-y-3 sm:space-y-4">
                  <div className="rounded-lg bg-gray-700 p-3 sm:p-4">
                    <div className="text-xs text-gray-400">Question {state.currentQuestionIndex + 1}</div>
                    <div className="font-display text-xs sm:text-sm">{state.currentQuestion.text}</div>
                  </div>

                  <div className="space-y-2">
                    <div className="mb-2 flex gap-2">
                      <Button onClick={revealAllAnswers} variant="secondary" size="sm" className="flex-1 text-xs">
                        <Eye className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                        Reveal All
                      </Button>
                      <Button onClick={hideAllAnswers} variant="secondary" size="sm" className="flex-1 text-xs">
                        <EyeOff className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                        Hide All
                      </Button>
                    </div>

                    {state.currentQuestion.answers.map((answer, index) => (
                      <motion.div
                        key={answer.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`flex cursor-pointer items-center justify-between rounded-lg p-3 transition-colors sm:p-4 ${
                          answer.revealed ? "bg-green-600" : "bg-gray-700 hover:bg-gray-600"
                        }`}
                        onClick={() => revealAnswer(answer.id)}
                      >
                        <div className="flex items-center gap-2 sm:gap-4">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 font-display text-xs sm:h-10 sm:w-10">
                            {index + 1}
                          </div>
                          <div className="text-xs font-semibold">{answer.text}</div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4">
                          <div className="font-display text-xs text-yellow-400 sm:text-sm">{answer.points}</div>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              revealAnswer(answer.id)
                            }}
                            variant={answer.revealed ? "secondary" : "default"}
                            size="sm"
                            className="text-xs"
                          >
                            {answer.revealed ? "Hide" : "Reveal"}
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-gray-700 p-8 text-center text-gray-400 sm:p-12">
                  <AlertCircle className="mx-auto mb-4 h-8 w-8 sm:h-12 sm:w-12" />
                  <div className="font-display text-xs sm:text-sm">No question loaded</div>
                  <div className="mt-2 text-xs">Click "Load Question" to start</div>
                </div>
              )}
            </Card>
          </div>

          <div className="lg:col-span-5">
            <Card className="h-full bg-gray-800 p-3 sm:p-4">
              <h2 className="mb-3 font-display text-xs sm:mb-4 sm:text-sm">Score Control</h2>

              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="block text-xs text-gray-400">Select Teams</label>
                  <div className="flex gap-2">
                    <Button
                      onClick={toggleSelectAll}
                      variant={selectedTeams.size === 4 ? "default" : "outline"}
                      size="sm"
                      className="flex-1 text-xs"
                    >
                      All Teams
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {teams.map((team) => (
                      <Button
                        key={team.id}
                        onClick={() => toggleTeamSelection(team.id)}
                        variant={selectedTeams.has(team.id) ? "default" : "outline"}
                        size="sm"
                        className="text-xs"
                        style={{
                          backgroundColor: selectedTeams.has(team.id) ? team.color : undefined,
                          borderColor: team.color,
                        }}
                      >
                        {team.name}
                      </Button>
                    ))}
                  </div>
                </div>

                {selectedTeams.size > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <div className="flex gap-2">
                      <Button
                        onClick={() => applyScoreToSelected(-10)}
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                      >
                        <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <Button
                        onClick={() => applyScoreToSelected(10)}
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                      >
                        <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button onClick={() => applyScoreToSelected(5)} variant="secondary" size="sm" className="text-xs">
                        +5
                      </Button>
                      <Button
                        onClick={() => applyScoreToSelected(10)}
                        variant="secondary"
                        size="sm"
                        className="text-xs"
                      >
                        +10
                      </Button>
                      <Button
                        onClick={() => applyScoreToSelected(20)}
                        variant="secondary"
                        size="sm"
                        className="text-xs"
                      >
                        +20
                      </Button>
                      <Button
                        onClick={() => applyScoreToSelected(50)}
                        variant="secondary"
                        size="sm"
                        className="text-xs"
                      >
                        +50
                      </Button>
                    </div>
                    <Button
                      onClick={handleResetScores}
                      variant={showScoreResetConfirm ? "destructive" : "outline"}
                      className="w-full text-xs"
                      size="sm"
                    >
                      <RotateCcw className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      {showScoreResetConfirm ? "Confirm Reset?" : "Reset Scores"}
                    </Button>
                  </motion.div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Strikes and Round Control */}
        <div className="mb-2 grid grid-cols-1 gap-2 sm:mb-4 sm:gap-4 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <Card className="bg-gray-800 p-3 sm:p-4">
              <h2 className="mb-3 font-display text-xs sm:mb-4 sm:text-sm">Strikes</h2>
              <div className="mb-3 flex justify-center sm:mb-4">
                <StrikeIndicator count={state.strikes} animated={false} size="medium" />
              </div>
              <div className="space-y-2">
                <Button
                  onClick={addStrike}
                  variant="destructive"
                  className="w-full text-xs"
                  size="lg"
                  disabled={state.strikes >= 3}
                >
                  Add Strike
                </Button>
                <Button onClick={resetStrikes} variant="outline" className="w-full bg-transparent text-xs" size="sm">
                  <RotateCcw className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  Reset Strikes
                </Button>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-6">
            <Card className="bg-gray-800 p-3 sm:p-4">
              <h2 className="mb-3 font-display text-xs sm:mb-4 sm:text-sm">Round Controls</h2>
              <div className="grid grid-cols-2 gap-2">
                {teams.map((team) => (
                  <Button
                    key={team.id}
                    onClick={() => awardRoundPoints(team.id)}
                    variant="default"
                    className="text-xs"
                    style={{ backgroundColor: team.color }}
                  >
                    <Trophy className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Award to {team.name}</span>
                    <span className="sm:hidden">{team.name}</span>
                  </Button>
                ))}
              </div>
              <Button onClick={clearQuestion} variant="outline" className="mt-2 w-full bg-transparent text-xs">
                Clear Question
              </Button>
            </Card>
          </div>
        </div>

        {/* Sound Effects and Game Actions */}
        <div className="grid grid-cols-1 gap-2 sm:gap-4 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Card className="bg-gray-800 p-3 sm:p-4">
              <h2 className="mb-3 font-display text-xs sm:mb-4 sm:text-sm">Sound Effects</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {soundEffects.map((sound) => (
                  <Button
                    key={sound.type}
                    onClick={() => console.log(`[v0] Playing sound: ${sound.type}`)}
                    variant="secondary"
                    size="sm"
                    className="gap-1 text-xs"
                  >
                    <Volume2 className="h-3 w-3" />
                    {sound.name}
                  </Button>
                ))}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-5">
            <Card className="bg-gray-800 p-3 sm:p-4">
              <h2 className="mb-3 font-display text-xs sm:mb-4 sm:text-sm">Game Actions</h2>
              <div className="space-y-2">
                <Button
                  onClick={handleResetGame}
                  variant={showResetConfirm ? "destructive" : "outline"}
                  className="w-full text-xs"
                >
                  <RotateCcw className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  {showResetConfirm ? "Confirm Reset?" : "Reset Game"}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
