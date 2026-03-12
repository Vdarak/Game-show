"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Copy,
  Check,
  QrCode,
  Users,
  Play,
  Loader2,
  StopCircle,
  RefreshCw,
} from "lucide-react"
import type { Session, SessionStatusResponse, Team } from "@/lib/api-types"
import { toast } from "sonner"
import { TeamAvatar } from "./team-avatar"

interface RoomCodePanelProps {
  session: Session | null
  sessionStatus: SessionStatusResponse | null
  teams: Team[]
  isLoading: boolean
  onStartSession: () => Promise<void>
  onStopSession?: () => Promise<void>
  onRestartSession?: () => Promise<void>
  isRestarting?: boolean
}

export function RoomCodePanel({
  session,
  sessionStatus,
  teams,
  isLoading,
  onStartSession,
  onStopSession,
  onRestartSession,
  isRestarting = false,
}: RoomCodePanelProps) {
  const [copied, setCopied] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)

  const roomCode = session?.RoomCode || ""
  const joinUrl = typeof window !== "undefined"
    ? `${window.location.origin}/play/join?code=${roomCode}`
    : ""

  const qrCodeUrl = roomCode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}&bgcolor=1f2937&color=ffffff`
    : ""

  const fallbackCopy = useCallback((text: string) => {
    const textarea = document.createElement("textarea")
    textarea.value = text
    textarea.style.position = "fixed"
    textarea.style.opacity = "0"
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand("copy")
      return true
    } catch {
      return false
    } finally {
      document.body.removeChild(textarea)
    }
  }, [])

  const handleCopy = useCallback(async () => {
    if (!roomCode) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(roomCode)
      } else {
        fallbackCopy(roomCode)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      if (fallbackCopy(roomCode)) {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } else {
        console.error("Failed to copy:", err)
      }
    }
  }, [roomCode, fallbackCopy])

  const handleCopyUrl = useCallback(async () => {
    if (!joinUrl) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(joinUrl)
      } else {
        fallbackCopy(joinUrl)
      }
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    } catch (err) {
      if (fallbackCopy(joinUrl)) {
        setCopiedUrl(true)
        setTimeout(() => setCopiedUrl(false), 2000)
      } else {
        console.error("Failed to copy:", err)
      }
    }
  }, [joinUrl, fallbackCopy])

  const isInLobby = sessionStatus?.Status === "lobby"
  const isActive = sessionStatus?.Status === "active"
  const isCompleted = sessionStatus?.Status === "completed"

  if (!session) {
    return (
      <Card className="bg-gray-800 border-gray-700 p-6">
        <div className="flex items-center justify-center gap-2 text-gray-400">
          <QrCode className="h-5 w-5" />
          <span>No active session</span>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Room Code, Teams & Controls — single card */}
      <Card className="bg-gray-800 border-gray-700 overflow-hidden">
        {/* Header with status badge */}
        <div className="px-4 pt-4 pb-3 flex items-center justify-between">
          <h3 className="font-display font-semibold text-white text-sm flex items-center gap-2">
            <QrCode className="h-4 w-4 text-purple-400" />
            Room Code
          </h3>
          <div
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${isActive
              ? "bg-green-600/20 text-green-400"
              : isInLobby
                ? "bg-yellow-600/20 text-yellow-400"
                : "bg-gray-600/20 text-gray-400"
              }`}
          >
            {isActive ? "Live" : isInLobby ? "Lobby" : isCompleted ? "Ended" : "Unknown"}
          </div>
        </div>

        {/* QR + Join Link (copiable) + Room Code (small underneath) */}
        <div className="px-4 pb-4">
          <div className="flex items-center gap-4">
            {/* QR Code — compact */}
            {qrCodeUrl && (
              <div className="bg-gray-900 p-2 rounded-lg flex-shrink-0">
                <img
                  src={qrCodeUrl}
                  alt="QR Code"
                  className="w-20 h-20"
                />
              </div>
            )}

            {/* Join Link (primary, copiable) + Room Code (small) */}
            <div className="flex-1 min-w-0">
              <button
                onClick={handleCopyUrl}
                className="flex items-center gap-2 mb-1.5 group"
              >
                <span className="text-sm text-purple-400 group-hover:text-purple-300 truncate transition-colors">
                  {joinUrl.replace(/^https?:\/\//, "").slice(0, 40)}
                </span>
                {copiedUrl ? (
                  <Check className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-gray-500 group-hover:text-purple-300 flex-shrink-0 transition-colors" />
                )}
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Room Code:</span>
                <span className="font-mono text-xs text-gray-400 tracking-wider">
                  {roomCode}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="text-gray-500 hover:text-white h-5 w-5 p-0"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-green-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Start Game — lobby only */}
        {isInLobby && (
          <div className="px-4 pb-4">
            <Button
              onClick={onStartSession}
              disabled={isLoading || teams.length === 0}
              className="w-full bg-green-600 hover:bg-green-700 h-11"
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
                Waiting for teams to join
              </p>
            )}
          </div>
        )}

        {/* Active session controls — End Game + Restart */}
        {isActive && (
          <div className="px-4 pb-4 space-y-2">
            {onStopSession && (
              <Button
                variant="destructive"
                size="sm"
                onClick={onStopSession}
                disabled={isLoading}
                className="w-full"
              >
                <StopCircle className="h-4 w-4 mr-2" />
                End Game
              </Button>
            )}
            {onRestartSession && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRestartSession}
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
        )}

        {/* Teams — merged into same card */}
        <div className="border-t border-gray-700">
          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <h3 className="font-display font-semibold text-white text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-400" />
              Teams
            </h3>
            <span className="text-xs text-gray-500">{teams.length} joined</span>
          </div>

          <div className="px-4 pb-4">
            {teams.length === 0 ? (
              <div className="py-4 text-center">
                <Users className="h-8 w-8 text-gray-700 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Waiting for teams to join...</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <AnimatePresence>
                  {teams.map((team, index) => (
                    <motion.div
                      key={team.IDTeam}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ delay: index * 0.03 }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-gray-900/70 border border-gray-700/60"
                    >
                      <TeamAvatar
                        avatarPath={team.AvatarBlobPath}
                        teamName={team.TeamName}
                        size="sm"
                      />
                      <span className="text-xs text-gray-300 font-medium max-w-[80px] truncate">
                        {team.TeamName}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
