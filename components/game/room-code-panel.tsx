"use client"

import { useState, useCallback } from "react"
import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Copy,
  Check,
  QrCode,
  Users,
  Play,
  RefreshCw,
  ExternalLink,
  Loader2,
  Share2,
  Link2,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Video,
  VideoOff,
  StopCircle,
} from "lucide-react"
import { hostLinksApi } from "@/lib/api-client"
import type { Session, SessionStatusResponse, HostLinkResponse } from "@/lib/api-types"
import { toast } from "sonner"

interface RoomCodePanelProps {
  session: Session | null
  sessionStatus: SessionStatusResponse | null
  teamCount: number
  isLoading: boolean
  onStartSession: () => Promise<void>
  onStopSession?: () => Promise<void>
  onRefreshTeams: () => Promise<unknown>
  showAnswer?: boolean
  onToggleShowAnswer?: () => void
  showVideo?: boolean
  onToggleShowVideo?: () => void
  musicEnabled?: boolean
  onToggleMusic?: () => void
}

export function RoomCodePanel({
  session,
  sessionStatus,
  teamCount,
  isLoading,
  onStartSession,
  onStopSession,
  onRefreshTeams,
  showAnswer = false,
  onToggleShowAnswer,
  showVideo = true,
  onToggleShowVideo,
  musicEnabled = true,
  onToggleMusic,
}: RoomCodePanelProps) {
  const [copied, setCopied] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [hostLink, setHostLink] = useState<HostLinkResponse | null>(null)
  const [isGeneratingHostLink, setIsGeneratingHostLink] = useState(false)

  const roomCode = session?.RoomCode || ""
  const joinUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/play/join?code=${roomCode}`
    : ""
  
  // Generate QR code URL using a free API
  const qrCodeUrl = roomCode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}&bgcolor=1f2937&color=ffffff`
    : ""

  const handleCopy = useCallback(async () => {
    if (!roomCode) return
    
    try {
      await navigator.clipboard.writeText(roomCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }, [roomCode])

  const handleCopyUrl = useCallback(async () => {
    if (!joinUrl) return
    
    try {
      await navigator.clipboard.writeText(joinUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }, [joinUrl])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await onRefreshTeams()
    setIsRefreshing(false)
  }, [onRefreshTeams])

  const handleGenerateHostLink = useCallback(async () => {
    if (!session?.IDEpisode) return
    
    setIsGeneratingHostLink(true)
    try {
      const link = await hostLinksApi.generate({ IDEpisode: session.IDEpisode })
      setHostLink(link)
      toast.success("Host link generated!")
    } catch (err) {
      toast.error("Failed to generate host link")
    }
    setIsGeneratingHostLink(false)
  }, [session?.IDEpisode])

  const handleCopyHostLink = useCallback(async () => {
    if (!hostLink) return
    const hostUrl = typeof window !== "undefined"
      ? `${window.location.origin}/trivia/host/${hostLink.token}`
      : ""
    
    try {
      await navigator.clipboard.writeText(hostUrl)
      toast.success("Host link copied!")
    } catch (err) {
      toast.error("Failed to copy")
    }
  }, [hostLink])

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
    <Card className="bg-gray-800 border-gray-700 overflow-hidden">
      {/* Header */}
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

      {/* QR Code */}
      <div className="p-6 flex flex-col items-center">
        {qrCodeUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 p-4 rounded-xl mb-4"
          >
            <img
              src={qrCodeUrl}
              alt="QR Code"
              className="w-40 h-40"
            />
          </motion.div>
        )}

        {/* Room Code */}
        <div className="text-center mb-4">
          <p className="text-xs text-gray-400 mb-1">ROOM CODE</p>
          <div className="flex items-center gap-2">
            <span className="font-display text-4xl font-bold text-white tracking-[0.3em]">
              {roomCode}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
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

        {/* Join URL */}
        <button
          onClick={handleCopyUrl}
          className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          {joinUrl.replace(/^https?:\/\//, "").slice(0, 40)}...
        </button>
      </div>

      {/* Team Count */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-300">
              {teamCount} {teamCount === 1 ? "team" : "teams"} joined
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-gray-400 hover:text-white h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Host Link Sharing */}
      {isInLobby && (
        <div className="px-4 pb-4">
          {!hostLink ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateHostLink}
              disabled={isGeneratingHostLink}
              className="w-full border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
            >
              {isGeneratingHostLink ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Share2 className="h-4 w-4 mr-2" />
              )}
              Generate Shareable Host Link
            </Button>
          ) : (
            <div className="p-3 rounded-lg bg-purple-900/20 border border-purple-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-purple-300 flex items-center gap-1">
                  <Link2 className="h-3 w-3" />
                  Host Link Ready
                </span>
                <span className="text-xs text-gray-500">
                  Expires: {new Date(hostLink.expires_at).toLocaleTimeString()}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyHostLink}
                className="w-full text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Host Link
              </Button>
              <p className="text-xs text-gray-500 text-center mt-2">
                Share this link to let someone else control the game
              </p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {isInLobby && (
        <div className="p-4 border-t border-gray-700 bg-gray-900/50">
          <Button
            onClick={onStartSession}
            disabled={isLoading || teamCount === 0}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Start Game
          </Button>
          {teamCount === 0 && (
            <p className="text-xs text-gray-500 text-center mt-2">
              Wait for teams to join before starting
            </p>
          )}
        </div>
      )}

      {isActive && sessionStatus && (
        <div className="p-4 border-t border-gray-700 bg-gray-900/50 space-y-3">
          <div className="text-center text-sm text-gray-400">
            Round {sessionStatus.CurrentRound || "-"} • Question{" "}
            {sessionStatus.CurrentQuestion || "-"}
          </div>
          
          {/* Game Controls */}
          <div className="flex gap-2">
            {onToggleShowAnswer && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleShowAnswer}
                className={`flex-1 ${showAnswer ? "border-green-500/50 text-green-400" : "border-gray-600 text-gray-400"}`}
              >
                {showAnswer ? (
                  <>
                    <Eye className="h-4 w-4 mr-1" />
                    Answer Shown
                  </>
                ) : (
                  <>
                    <EyeOff className="h-4 w-4 mr-1" />
                    Show Answer
                  </>
                )}
              </Button>
            )}
            {onToggleShowVideo && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleShowVideo}
                className={`${showVideo ? "border-blue-500/50 text-blue-400" : "border-gray-600 text-gray-400"}`}
              >
                {showVideo ? (
                  <Video className="h-4 w-4" />
                ) : (
                  <VideoOff className="h-4 w-4" />
                )}
              </Button>
            )}
            {onToggleMusic && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleMusic}
                className={`${musicEnabled ? "border-purple-500/50 text-purple-400" : "border-gray-600 text-gray-400"}`}
              >
                {musicEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>

          {/* Stop Game Button */}
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
        </div>
      )}
    </Card>
  )
}
