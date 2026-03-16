"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import {
  Users,
  PartyPopper,
  BookOpen,
  Gamepad2,
  Trophy,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Coffee,
  Play,
  Pause,
  RotateCcw,
  BarChart3,
  Eye,
  X,
} from "lucide-react"
import { sessionsApi } from "@/lib/api-client"
import type { GameState, SessionStatusResponse, LeaderboardResponse } from "@/lib/api-types"

// The macro phases of the game lifecycle
type MacroPhase = "lobby" | "welcome" | "rules" | "game" | "completed"

interface MacroPhaseBarProps {
  sessionStatus: SessionStatusResponse | null
  sessionId: string
  leaderboard: LeaderboardResponse | null
  onRefreshStatus: () => Promise<unknown>
  hasRulesVideo?: boolean
  hasSponsorshipVideo?: boolean
}

// Map server GameState to macro phase
function getMacroPhase(gameState: GameState | null, status?: string): MacroPhase {
  if (!gameState) return "lobby"
  if (status === "completed" || gameState === "completed") return "completed"
  switch (gameState) {
    case "lobby": return "lobby"
    case "welcome": return "welcome"
    case "rules": return "rules"
    case "get_ready":
    case "announced":
    case "video_playing":
    case "options_revealed":
    case "timer_running":
    case "timer_ended":
    case "answer_reveal":
    case "break":
      return "game"
    default:
      return "lobby"
  }
}

const PHASES: { id: MacroPhase; label: string; icon: React.ElementType }[] = [
  { id: "lobby", label: "Lobby", icon: Users },
  { id: "welcome", label: "Welcome", icon: PartyPopper },
  { id: "rules", label: "Rules", icon: BookOpen },
  { id: "game", label: "Game", icon: Gamepad2 },
  { id: "completed", label: "Complete", icon: Trophy },
]

export function MacroPhaseBar({
  sessionStatus,
  sessionId,
  leaderboard,
  onRefreshStatus,
  hasRulesVideo,
  hasSponsorshipVideo,
}: MacroPhaseBarProps) {
  const [advancing, setAdvancing] = useState(false)
  const [leaderboardVisible, setLeaderboardVisible] = useState(true)
  const [leaderboardRevealMode, setLeaderboardRevealMode] = useState(false)
  const [revealedRanks, setRevealedRanks] = useState<number[]>([])
  const [rulesVideoPlaying, setRulesVideoPlaying] = useState(true)
  const [sponsorVideoPlaying, setSponsorVideoPlaying] = useState(true)

  const gameState = sessionStatus?.GameState || null
  const currentPhase = getMacroPhase(gameState, sessionStatus?.Status)
  const phaseIndex = PHASES.findIndex(p => p.id === currentPhase)
  const isOnBreak = gameState === "break"
  const hasBreakSponsorVideo = !!(hasSponsorshipVideo || sessionStatus?.SponsorshipVideoUrl)

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

  const handleSetBreak = useCallback(async () => {
    setAdvancing(true)
    try {
      await sessionsApi.setBreak(sessionId)
      await onRefreshStatus()
    } catch (err) {
      console.error("Failed to set break:", err)
      const { toast } = await import("sonner")
      toast.error("Failed to set break")
    } finally {
      setAdvancing(false)
    }
  }, [sessionId, onRefreshStatus])

  // Determine if the advance button should appear for pre-game phases
  const canAdvancePreGame =
    currentPhase === "welcome" ||
    currentPhase === "rules"

  const getAdvanceLabel = () => {
    if (currentPhase === "welcome") {
      return hasRulesVideo ? "Show Rules with Video" : "Show Rules"
    }
    if (currentPhase === "rules") return "Start Game"
    return "Next"
  }

  return (
    <div className="space-y-0">
      {/* Phase Stepper Bar */}
      <div className="bg-gray-950 border border-gray-800 rounded-xl px-4 py-3">
        {/* Section Label */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-widest text-gray-600 font-semibold">
            Game Phase
          </span>
          {isOnBreak && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
              <Coffee className="h-3 w-3" />
              Break Active
            </span>
          )}
        </div>

        {/* Stepper */}
        <div className={`flex items-start ${currentPhase === "rules" && hasRulesVideo ? "pb-12" : ""}`}>
          {PHASES.map((phase, i) => {
            const Icon = phase.icon
            const isDone = i < phaseIndex
            const isActive = i === phaseIndex
            const isUpcoming = i > phaseIndex

            return (
              <div key={phase.id} className="contents">
                {/* Phase Step */}
                <div className="flex flex-col items-center flex-1 min-w-0 relative">
                  {/* Icon Circle */}
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${isDone
                        ? "bg-green-500/20 border-2 border-green-500/50"
                        : isActive
                          ? "bg-purple-500/20 border-2 border-purple-500 shadow-lg shadow-purple-500/20"
                          : "bg-gray-800 border-2 border-gray-700"
                      }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                    ) : isActive ? (
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Icon className="h-4 w-4 text-purple-400" />
                      </motion.div>
                    ) : (
                      <Icon className="h-4 w-4 text-gray-600" />
                    )}
                  </div>
                  {/* Label */}
                  <span
                    className={`text-[10px] mt-1.5 font-medium truncate ${isDone
                        ? "text-green-400"
                        : isActive
                          ? "text-purple-400"
                          : "text-gray-600"
                      }`}
                  >
                    {phase.label}
                  </span>

                  {/* Rules Video Controls — positioned below without affecting layout */}
                  {phase.id === "rules" && isActive && hasRulesVideo && (
                    <div className="absolute top-full mt-1 flex flex-col items-center gap-0.5">
                      <span className="text-[9px] text-gray-500 font-medium">Rules Video</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            if (rulesVideoPlaying) {
                              setRulesVideoPlaying(false)
                              try {
                                const bc = new BroadcastChannel(`trivitime-host-${sessionId}`)
                                bc.postMessage({ type: "RULES_VIDEO_PAUSE" })
                                bc.close()
                              } catch { /* not supported */ }
                            } else {
                              setRulesVideoPlaying(true)
                              try {
                                const bc = new BroadcastChannel(`trivitime-host-${sessionId}`)
                                bc.postMessage({ type: "RULES_VIDEO_PLAY" })
                                bc.close()
                              } catch { /* not supported */ }
                            }
                          }}
                          className={`w-7 h-7 rounded-full flex items-center justify-center border transition-colors ${
                            rulesVideoPlaying
                              ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
                              : "border-green-500/50 bg-green-500/10 text-green-400 hover:bg-green-500/20"
                          }`}
                          title={rulesVideoPlaying ? "Pause" : "Play"}
                        >
                          {rulesVideoPlaying ? (
                            <Pause className="h-3 w-3" />
                          ) : (
                            <Play className="h-3 w-3" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setRulesVideoPlaying(true)
                            try {
                              const bc = new BroadcastChannel(`trivitime-host-${sessionId}`)
                              bc.postMessage({ type: "RULES_VIDEO_RESTART" })
                              bc.close()
                            } catch { /* not supported */ }
                          }}
                          className="w-7 h-7 rounded-full flex items-center justify-center border border-blue-500/50 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                          title="Restart"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Connector Line */}
                {i < PHASES.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 min-w-4 mt-4 rounded-full transition-colors ${i < phaseIndex ? "bg-green-500/50" : "bg-gray-800"
                      }`}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Pre-game Advance Button */}
        {canAdvancePreGame && (
          <div className="mt-4 flex justify-end">
            <Button
              onClick={handleAdvanceState}
              disabled={advancing}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              size="sm"
            >
              {advancing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-1.5" />
              )}
              {getAdvanceLabel()}
            </Button>
          </div>
        )}

        {/* Macro Toolbar — interrupt actions during game phase */}
        {currentPhase === "game" && (
          <div className="mt-4 pt-3 border-t border-gray-800">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Break Button */}
              {!isOnBreak ? (
                <Button
                  onClick={handleSetBreak}
                  disabled={advancing}
                  variant="outline"
                  size="sm"
                  className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                >
                  <Coffee className="h-3.5 w-3.5 mr-1.5" />
                  Break
                </Button>
              ) : (
                <Button
                  onClick={handleAdvanceState}
                  disabled={advancing}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {advancing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Play className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Resume
                </Button>
              )}

              {isOnBreak && hasBreakSponsorVideo && (
                <>
                  <div className="h-4 w-px bg-gray-800" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-400">Sponsor Video</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (sponsorVideoPlaying) {
                          setSponsorVideoPlaying(false)
                          try {
                            const bc = new BroadcastChannel(`trivitime-host-${sessionId}`)
                            bc.postMessage({ type: "SPONSOR_VIDEO_PAUSE" })
                            bc.close()
                          } catch { /* not supported */ }
                        } else {
                          setSponsorVideoPlaying(true)
                          try {
                            const bc = new BroadcastChannel(`trivitime-host-${sessionId}`)
                            bc.postMessage({ type: "SPONSOR_VIDEO_PLAY" })
                            bc.close()
                          } catch { /* not supported */ }
                        }
                      }}
                      className={
                        sponsorVideoPlaying
                          ? "h-8 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                          : "h-8 border-green-500/50 text-green-400 hover:bg-green-500/10"
                      }
                    >
                      {sponsorVideoPlaying ? (
                        <Pause className="h-3.5 w-3.5 mr-1.5" />
                      ) : (
                        <Play className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      {sponsorVideoPlaying ? "Pause" : "Play"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSponsorVideoPlaying(true)
                        try {
                          const bc = new BroadcastChannel(`trivitime-host-${sessionId}`)
                          bc.postMessage({ type: "SPONSOR_VIDEO_RESTART" })
                          bc.close()
                        } catch { /* not supported */ }
                      }}
                      className="h-8 border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                      Restart
                    </Button>
                  </div>
                </>
              )}

              <div className="h-4 w-px bg-gray-800" />

              {/* Toggle Leaderboard */}
              <Button
                onClick={() => {
                  setLeaderboardVisible(prev => !prev)
                  try {
                    const bc = new BroadcastChannel(`trivitime-host-${sessionId}`)
                    bc.postMessage({ type: "TOGGLE_LEADERBOARD" })
                    bc.close()
                  } catch { /* not supported */ }
                }}
                variant="outline"
                size="sm"
                className={
                  leaderboardVisible
                    ? "border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                    : "border-gray-600 text-gray-400 hover:bg-gray-700/50"
                }
              >
                <Trophy className="h-3.5 w-3.5 mr-1.5" />
                {leaderboardVisible ? "Hide" : "Show"} Leaderboard
              </Button>

              {/* Leaderboard Reveal */}
              <Button
                onClick={() => {
                  if (leaderboardRevealMode) {
                    setLeaderboardRevealMode(false)
                    setRevealedRanks([])
                    try {
                      const bc = new BroadcastChannel(`trivitime-host-${sessionId}`)
                      bc.postMessage({ type: "EXIT_FULLSCREEN_LEADERBOARD" })
                      bc.close()
                    } catch { /* not supported */ }
                  } else {
                    setLeaderboardRevealMode(true)
                    setRevealedRanks([])
                    try {
                      const bc = new BroadcastChannel(`trivitime-host-${sessionId}`)
                      bc.postMessage({ type: "SHOW_FULLSCREEN_LEADERBOARD" })
                      bc.close()
                    } catch { /* not supported */ }
                  }
                }}
                variant="outline"
                size="sm"
                className={
                  leaderboardRevealMode
                    ? "border-amber-500 text-amber-400 hover:bg-amber-500/20 bg-amber-500/10"
                    : "border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                }
              >
                <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                {leaderboardRevealMode ? "Hide Rankings Screen" : "Show Rankings Screen"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Leaderboard Reveal Panel (overlay) */}
      <AnimatePresence>
        {leaderboardRevealMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-3"
          >
            <div className="border border-amber-500/30 bg-gray-950 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-amber-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-amber-400" />
                  <span className="font-display text-sm font-bold text-amber-400">
                    Leaderboard Reveal
                  </span>
                  <span className="text-xs text-gray-500">
                    ({revealedRanks.length}/{leaderboard?.entries.length || 0} revealed)
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setLeaderboardRevealMode(false)
                    setRevealedRanks([])
                    try {
                      const bc = new BroadcastChannel(`trivitime-host-${sessionId}`)
                      bc.postMessage({ type: "EXIT_FULLSCREEN_LEADERBOARD" })
                      bc.close()
                    } catch { /* not supported */ }
                  }}
                  className="text-gray-400 hover:text-white h-7 w-7 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-4 space-y-2 max-h-64 overflow-auto">
                {leaderboard?.entries
                  .slice()
                  .sort((a, b) => b.Rank - a.Rank)
                  .map((entry) => {
                    const isRevealed = revealedRanks.includes(entry.Rank)
                    return (
                      <motion.button
                        key={entry.IDTeam}
                        layout
                        disabled={isRevealed}
                        onClick={() => {
                          setRevealedRanks(prev => [...prev, entry.Rank])
                          try {
                            const bc = new BroadcastChannel(`trivitime-host-${sessionId}`)
                            bc.postMessage({ type: "REVEAL_RANK", rank: entry.Rank })
                            bc.close()
                          } catch { /* not supported */ }
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${isRevealed
                            ? "border-green-500/30 bg-green-500/10 opacity-60"
                            : "border-gray-700 bg-gray-800/60 hover:border-amber-500/50 hover:bg-amber-500/5 cursor-pointer"
                          }`}
                      >
                        <span className="w-8 text-center font-display font-bold text-sm text-gray-400">
                          #{entry.Rank}
                        </span>
                        {isRevealed ? (
                          <>
                            <span className="text-sm font-medium text-green-400 flex-1 text-left">
                              {entry.TeamName}
                            </span>
                            <span className="text-sm font-bold text-green-400">
                              {entry.TotalScore} pts
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-sm font-medium text-amber-400 flex-1 text-left">
                              Tap to reveal
                            </span>
                            <Eye className="h-4 w-4 text-amber-400" />
                          </>
                        )}
                      </motion.button>
                    )
                  })}
              </div>
              {revealedRanks.length === (leaderboard?.entries.length || 0) &&
                (leaderboard?.entries.length || 0) > 0 && (
                  <div className="px-5 py-3 border-t border-amber-500/20 text-center">
                    <p className="text-sm text-amber-400 font-medium">
                      🎉 All rankings revealed!
                    </p>
                  </div>
                )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
