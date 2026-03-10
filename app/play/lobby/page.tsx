"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { usePlayerSession } from "@/hooks/use-player-session"
import { sessionsApi } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Loader2, Users, LogOut, Clock, Wifi, QrCode } from "lucide-react"
import { GrainGradient } from "@paper-design/shaders-react"
import { TeamAvatar } from "@/components/game/team-avatar"
import type { Team } from "@/lib/api-types"

export default function LobbyPage() {
  const router = useRouter()
  const {
    team,
    roomCode,
    gameSessionId,
    sessionStatus,
    refreshSessionStatus,
    clearSession,
    isInSession,
    isHydrated,
  } = usePlayerSession()

  const [teams, setTeams] = useState<Team[]>([])
  const [isPolling, setIsPolling] = useState(true)
  const [showQR, setShowQR] = useState(false)

  // Generate join URL and QR code
  const joinUrl =
    typeof window !== "undefined" && roomCode
      ? `${window.location.origin}/play/join?code=${roomCode}`
      : ""
  const qrCodeUrl = roomCode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}&bgcolor=111827&color=ffffff`
    : ""

  // Redirect if not in session (only after hydration)
  useEffect(() => {
    if (isHydrated && !isInSession) {
      router.push("/play/join")
    }
  }, [isHydrated, isInSession, router])

  // Poll for session status and teams list
  useEffect(() => {
    if (!gameSessionId || !isPolling) return

    const poll = async () => {
      try {
        const [status, teamsList] = await Promise.all([
          refreshSessionStatus(),
          sessionsApi.teams(gameSessionId),
        ])

        setTeams(teamsList)

        // If game has started, redirect to game page
        if (status?.Status === "active") {
          router.push("/play/game")
        }
      } catch (error) {
        console.error("Polling error:", error)
      }
    }

    // Initial poll
    poll()

    // Poll every 2 seconds
    const interval = setInterval(poll, 2000)

    return () => clearInterval(interval)
  }, [gameSessionId, isPolling, refreshSessionStatus, router])

  const handleLeave = () => {
    setIsPolling(false)
    clearSession()
    router.push("/play/join")
  }

  if (!team || !roomCode) {
    return (
      <div className="fixed inset-0 bg-gray-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-950 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <GrainGradient
          colors={["#002185", "#faaf00", "#089659"]}
          colorBack="#740fa3"
          shape="wave"
          softness={0.68}
          intensity={0}
          noise={0}
          speed={0.3}
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-full bg-green-600/20 border border-green-500/30 flex items-center gap-2">
              <Wifi className="h-3 w-3 text-green-400" />
              <span className="text-green-400 text-xs font-medium">Connected</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLeave}
            className="text-gray-200 hover:text-white hover:bg-gray-800"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Leave
          </Button>
        </div>

        {/* Team Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-950/80 backdrop-blur-lg rounded-2xl p-6 border border-gray-700 mb-6"
        >
          <div className="flex items-center gap-4">
            <TeamAvatar avatarPath={team.AvatarBlobPath} teamName={team.TeamName} size="xl" />
            <div className="flex-1">
              <h2 className="text-2xl font-display font-bold text-white">
                {team.TeamName}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-gray-200 text-sm">Room:</span>
                <span className="font-display font-bold text-purple-300 tracking-wider">
                  {roomCode}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Waiting Status */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex-1 flex flex-col items-center justify-center"
        >

          <h3 className="text-2xl font-display font-bold text-white mb-2 text-center">
            Waiting for Host
          </h3>
          <p className="text-gray-200 text-center max-w-xs">
            The game will start automatically when the host begins
          </p>

          {/* Animated dots */}
          <div className="flex gap-2 mt-6">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-3 h-3 rounded-full bg-purple-500"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>

          {/* QR Code for sharing */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6"
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQR(!showQR)}
              className="border-purple-500/50 text-purple-400"
            >
              <QrCode className="h-4 w-4 mr-2" />
              {showQR ? "Hide QR Code" : "Share with Friends"}
            </Button>
          </motion.div>

          <AnimatePresence>
            {showQR && qrCodeUrl && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, height: 0 }}
                animate={{ opacity: 1, scale: 1, height: "auto" }}
                exit={{ opacity: 0, scale: 0.8, height: 0 }}
                className="mt-4 flex flex-col items-center"
              >
                <div className="bg-gray-900 p-4 rounded-xl">
                  <img src={qrCodeUrl} alt="QR Code" className="w-40 h-40" />
                </div>
                <p className="text-xs text-gray-300 mt-2 text-center">
                  Scan to join room <span className="text-purple-400 font-bold">{roomCode}</span>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Teams List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-950/80 backdrop-blur-lg rounded-2xl p-4 border border-gray-700"
        >
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-gray-200" />
            <span className="text-sm text-gray-200">
              {teams.length} {teams.length === 1 ? "team" : "teams"} joined
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {teams.map((t, index) => (
                <motion.div
                  key={t.IDTeam}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-2 ${t.IDTeam === team.IDTeam
                    ? "bg-purple-600/30 border border-purple-500/50 text-purple-300"
                    : "bg-gray-950/70 text-gray-100"
                    }`}
                >
                  <TeamAvatar avatarPath={t.AvatarBlobPath} teamName={t.TeamName} size="sm" />
                  <span className="truncate max-w-[120px]">{t.TeamName}</span>
                  {t.IDTeam === team.IDTeam && (
                    <span className="text-xs text-purple-400">(You)</span>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
