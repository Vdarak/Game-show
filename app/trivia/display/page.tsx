"use client"

import { useEffect, useState, useMemo, Suspense } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSearchParams } from "next/navigation"
import { sessionsApi } from "@/lib/api-client"
import { useSessionStatusWebSocket } from "@/hooks/use-session-status-websocket"
import { DitherBackground } from "@/components/game/dither-background"
import { TeamAvatar } from "@/components/game/team-avatar"
import { Loader2, Trophy, Clock, Users, QrCode, Medal } from "lucide-react"
import { getAvatarValue } from "@/lib/frontend-avatars"
import type {
  Session,
  SessionStatusResponse,
  LeaderboardResponse,
  Question,
  Round,
  EpisodeWithRounds,
} from "@/lib/api-types"

type DisplayMode = "lobby" | "question" | "leaderboard" | "completed"

function TriviaDisplayContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session")
  const roomCodeFromQuery = searchParams.get("room")

  const [session, setSession] = useState<Session | null>(null)
  const [sessionStatus, setSessionStatus] = useState<SessionStatusResponse | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null)
  const [teamCount, setTeamCount] = useState(0)
  const [displayMode, setDisplayMode] = useState<DisplayMode>("lobby")
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resolvedRoomCode, setResolvedRoomCode] = useState<string | null>(roomCodeFromQuery)
  const [roomResolveAttempted, setRoomResolveAttempted] = useState(false)
  const { status: realtimeStatus } = useSessionStatusWebSocket(resolvedRoomCode, {
    enabled: !!resolvedRoomCode,
  })

  // We need episode data to get question details - this would need to come from a display-specific endpoint
  // For now, we'll show what we can from session status

  useEffect(() => {
    setResolvedRoomCode(roomCodeFromQuery)
    setRoomResolveAttempted(false)
  }, [roomCodeFromQuery, sessionId])

  // Resolve room code once when opening via session ID only.
  useEffect(() => {
    if (!sessionId) {
      setError("No session ID provided. Add ?session=<id> to URL")
      return
    }

    if (resolvedRoomCode || roomResolveAttempted) return

    const resolveRoomCode = async () => {
      try {
        const status = await sessionsApi.status(sessionId)
        setResolvedRoomCode(status.RoomCode)
        setSessionStatus(status)
        setSession(status)
      } catch (err) {
        console.error("Failed to resolve room code:", err)
      }

      setRoomResolveAttempted(true)
    }

    void resolveRoomCode()
  }, [sessionId, resolvedRoomCode, roomResolveAttempted])

  useEffect(() => {
    if (!realtimeStatus) return

    setSessionStatus(realtimeStatus)
    setSession(realtimeStatus)
  }, [realtimeStatus])

  useEffect(() => {
    if (!sessionId || !sessionStatus) return

    const syncFromStatus = async () => {
      try {
        const [lb, teams] = await Promise.all([
          sessionsApi.leaderboard(sessionId),
          sessionsApi.teams(sessionId),
        ])

        setLeaderboard(lb)
        setTeamCount(teams.length)

        if (sessionStatus.Status === "lobby") {
          setDisplayMode("lobby")
        } else if (sessionStatus.Status === "completed") {
          setDisplayMode("completed")
        } else if (sessionStatus.Status === "active") {
          setDisplayMode("question")
        }
      } catch (err) {
        console.error("Realtime sync error:", err)
      }
    }

    void syncFromStatus()
  }, [
    sessionId,
    sessionStatus?.Status,
    sessionStatus?.CurrentRound,
    sessionStatus?.CurrentQuestion,
    sessionStatus?.GameState,
    sessionStatus?.team_count,
  ])

  // Handle fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") {
        if (document.fullscreenElement) {
          document.exitFullscreen()
        } else {
          document.documentElement.requestFullscreen()
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  const roomCode = sessionStatus?.RoomCode || session?.RoomCode || ""
  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/play/join?code=${roomCode}`
      : ""
  const qrCodeUrl = roomCode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(joinUrl)}&bgcolor=111827&color=ffffff`
    : ""

  if (error) {
    return (
      <div className="fixed inset-0 bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl">{error}</p>
          <p className="text-gray-500 text-sm mt-2">
            Usage: /trivia/display?session=SESSION_ID
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-950 overflow-hidden">
      {/* Dither Background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
        <DitherBackground
          colorBack="#00000000"
          colorFront={displayMode === "completed" ? "#FFD700" : "#6C5CE7"}
          speed={0.03}
          shape="wave"
          type="4x4"
          pxSize={3}
          scale={1}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full">
        <AnimatePresence mode="wait">
          {/* LOBBY MODE */}
          {displayMode === "lobby" && (
            <motion.div
              key="lobby"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex"
            >
              {/* Left side - QR Code */}
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <motion.h1
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="font-display text-6xl font-bold text-white mb-8"
                >
                  Trivi-Time
                </motion.h1>

                {qrCodeUrl && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gray-900 p-8 rounded-3xl shadow-2xl"
                  >
                    <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
                  </motion.div>
                )}

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mt-8 text-center"
                >
                  <p className="text-gray-400 text-xl mb-2">Scan to join or enter code:</p>
                  <p className="font-display text-6xl font-bold text-purple-400 tracking-[0.3em]">
                    {roomCode}
                  </p>
                </motion.div>
              </div>

              {/* Right side - Teams joined */}
              <div className="w-96 bg-gray-900/50 p-8 flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <Users className="h-6 w-6 text-purple-400" />
                  <span className="text-xl text-white font-semibold">
                    {teamCount} {teamCount === 1 ? "Team" : "Teams"} Joined
                  </span>
                </div>

                <div className="flex-1 overflow-auto">
                  {leaderboard?.entries.map((entry, index) => (
                    <motion.div
                      key={entry.IDTeam}
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 mb-2"
                    >
                        <TeamAvatar
                          avatarPath={getAvatarValue(entry)}
                          teamName={entry.TeamName}
                          teamId={entry.IDTeam}
                          size="lg"
                        />
                      <span className="text-white font-medium truncate">
                        {entry.TeamName}
                      </span>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-auto pt-6 border-t border-gray-800">
                  <p className="text-gray-500 text-center text-sm">
                    Waiting for host to start...
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* QUESTION MODE */}
          {displayMode === "question" && sessionStatus && (
            <motion.div
              key="question"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col p-8"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-6">
                  <span className="px-6 py-3 rounded-full bg-purple-600/20 text-purple-400 font-bold text-2xl lg:text-4xl">
                    Round {sessionStatus.CurrentRound}
                  </span>
                  <span className="text-gray-300 font-semibold text-2xl lg:text-4xl">
                    Question {sessionStatus.CurrentQuestion}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <Users className="h-5 w-5" />
                  <span>{teamCount} teams</span>
                </div>
              </div>

              {/* Main Question Area */}
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center max-w-4xl">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-gray-900/80 backdrop-blur rounded-3xl p-12 shadow-2xl"
                  >
                    <Clock className="h-16 w-16 text-purple-400 mx-auto mb-6" />
                    <h2 className="font-display text-4xl font-bold text-white mb-4">
                      Answer on your device!
                    </h2>
                    <p className="text-xl text-gray-400">
                      Submit your answer before time runs out
                    </p>
                  </motion.div>
                </div>
              </div>

              {/* Footer - Mini Leaderboard */}
              <div className="flex justify-center gap-4 mt-8">
                {leaderboard?.entries.slice(0, 5).map((entry, index) => (
                  <motion.div
                    key={entry.IDTeam}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-800/80"
                  >
                    <span className="font-display font-bold text-yellow-400">
                      #{entry.Rank}
                    </span>
                    <span className="text-white">{entry.TeamName}</span>
                    <span className="text-gray-400">{entry.TotalScore}pts</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* COMPLETED MODE */}
          {displayMode === "completed" && (
            <motion.div
              key="completed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center p-8"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center mb-12"
              >
                <h1 className="font-display text-6xl font-bold text-white mb-4">
                  Game Over!
                </h1>
              </motion.div>

              {/* Final Leaderboard */}
              <div className="w-full max-w-2xl">
                {leaderboard?.entries.slice(0, 10).map((entry, index) => {
                  const isTopThree = entry.Rank <= 3
                  const rankColors = ["text-yellow-400", "text-gray-300", "text-amber-600"]
                  const scale = isTopThree ? 1.1 - index * 0.05 : 1

                  return (
                    <motion.div
                      key={entry.IDTeam}
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.15, type: "spring" }}
                      style={{ transform: `scale(${scale})` }}
                      className={`flex items-center gap-4 p-4 rounded-xl mb-3 ${isTopThree
                          ? "bg-yellow-900/30 border border-yellow-600/30"
                          : "bg-gray-800/50"
                        }`}
                    >
                      <div className="w-16 text-center">
                        {isTopThree ? (
                          <Medal className={`h-8 w-8 mx-auto ${rankColors[entry.Rank - 1]}`} />
                        ) : (
                          <span className="text-2xl text-gray-400 font-display">
                            #{entry.Rank}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-1">
                        <TeamAvatar
                          avatarPath={getAvatarValue(entry)}
                          teamName={entry.TeamName}
                          teamId={entry.IDTeam}
                          size="xl"
                        />
                        <span className="text-xl text-white font-semibold truncate">
                          {entry.TeamName}
                        </span>
                      </div>
                      <div className="font-display text-3xl font-bold text-yellow-400">
                        {entry.TotalScore}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Fullscreen hint */}
      <div className="absolute bottom-4 right-4 text-gray-600 text-xs">
        Press F for fullscreen
      </div>
    </div>
  )
}

export default function TriviaDisplayPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 bg-gray-950 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      }
    >
      <TriviaDisplayContent />
    </Suspense>
  )
}
