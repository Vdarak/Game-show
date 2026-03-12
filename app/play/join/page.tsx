"use client"

import { useState, useEffect, Suspense } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter, useSearchParams } from "next/navigation"
import { usePlayerSession } from "@/hooks/use-player-session"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Users, ArrowRight, AlertCircle, QrCode } from "lucide-react"
import { GrainGradient } from "@paper-design/shaders-react"

// Avatars for selection
const AVATARS = ["🦊", "🐻", "🦁", "🐼", "🐸", "🐵", "🐯", "🦄", "🐲", "🦅", "🐺", "🦈"]

// Convert emoji to base64 PNG image
function emojiToBase64(emoji: string): string {
  const canvas = document.createElement("canvas")
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext("2d")
  if (!ctx) return ""

  // Clear canvas
  ctx.clearRect(0, 0, 128, 128)

  // Use emoji-specific font stack so the correct glyph is rendered
  ctx.font = '100px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif'
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(emoji, 64, 68)

  // Get base64 data (strip the data:image/png;base64, prefix)
  const dataUrl = canvas.toDataURL("image/png")
  return dataUrl.split(",")[1] || ""
}

function JoinPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const {
    joinSession,
    isLoading,
    error,
    clearError,
    isInSession,
    isHydrated,
    team,
    roomCode: existingRoomCode,
  } = usePlayerSession()

  // Form state
  const [roomCode, setRoomCode] = useState("")
  const [teamName, setTeamName] = useState("")
  const [selectedAvatar, setSelectedAvatar] = useState<string>(AVATARS[0])
  const [step, setStep] = useState<"room" | "team">("room")

  // Get room code from URL if provided
  useEffect(() => {
    const code = searchParams.get("code")
    if (code) {
      setRoomCode(code.toUpperCase())
      setStep("team")
    }
  }, [searchParams])

  // Redirect if already in session (only after hydration)
  // BUT don't redirect if the user navigated here with a new room code - they want to join a new room
  const codeFromUrl = searchParams.get("code")
  useEffect(() => {
    // If there's a room code in the URL, user intends to join a new/different room
    // So don't redirect to the old session
    if (codeFromUrl) {
      return
    }

    if (isHydrated && isInSession && team) {
      router.push("/play/lobby")
    }
  }, [isHydrated, isInSession, team, router, codeFromUrl])

  const handleRoomCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (roomCode.length >= 4) {
      setStep("team")
    }
  }

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    if (!teamName.trim()) return

    try {
      const avatarBase64 = emojiToBase64(selectedAvatar)
      await joinSession(roomCode, teamName.trim(), avatarBase64 || undefined)
      router.push("/play/lobby")
    } catch {
      // Error handled by hook
    }
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
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="font-display text-5xl font-bold text-white mb-2">
            Trivi-Time
          </h1>
          <p className="text-purple-200 text-lg">Join the Game</p>
        </motion.div>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center gap-3 text-red-400 max-w-md w-full"
            >
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Container */}
        <AnimatePresence mode="wait">
          {step === "room" ? (
            <motion.form
              key="room-step"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleRoomCodeSubmit}
              className="w-full max-w-md"
            >
              <div className="bg-gray-950/80 backdrop-blur-lg rounded-2xl p-8 border border-gray-700">
                <div className="flex items-center justify-center mb-6">
                  <div className="p-3 rounded-full bg-purple-600/20">
                    <QrCode className="h-8 w-8 text-purple-400" />
                  </div>
                </div>

                <h2 className="font-display text-xl font-semibold text-white text-center mb-6">
                  Enter Room Code
                </h2>

                <Input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="ABCDEF"
                  maxLength={8}
                  className="text-center text-3xl font-display tracking-[0.5em] bg-gray-950/90 border-gray-600 text-white placeholder:text-gray-500 h-16 mb-6"
                  autoFocus
                />

                <Button
                  type="submit"
                  disabled={roomCode.length < 4}
                  className="w-full h-14 text-lg bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Continue
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </motion.form>
          ) : (
            <motion.form
              key="team-step"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleJoinSubmit}
              className="w-full max-w-md"
            >
              <div className="bg-gray-950/80 backdrop-blur-lg rounded-2xl p-8 border border-gray-700">
                {/* Room code badge */}
                <div className="flex justify-center mb-6">
                  <div className="px-4 py-2 rounded-full bg-purple-600/20 border border-purple-500/30">
                    <span className="text-purple-400 text-sm">Room: </span>
                    <span className="text-white font-display font-bold tracking-wider">{roomCode}</span>
                  </div>
                </div>

                <h2 className="font-display text-xl font-semibold text-white text-center mb-6">
                  Create Your Team
                </h2>

                {/* Avatar Selection */}
                <div className="mb-6">
                  <label className="text-sm text-gray-200 mb-3 block text-center">
                    Choose Your Avatar
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {AVATARS.map((avatar) => (
                      <motion.button
                        key={avatar}
                        type="button"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedAvatar(avatar)}
                        className={`p-3 text-2xl rounded-xl transition-colors ${selectedAvatar === avatar
                          ? "bg-purple-600 ring-2 ring-purple-400"
                          : "bg-gray-950/70 hover:bg-gray-800"
                          }`}
                      >
                        {avatar}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Team Name */}
                <div className="mb-6">
                  <label className="text-sm text-gray-200 mb-2 block">
                    Team Name
                  </label>
                  <Input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="The Trivia Kings"
                    maxLength={30}
                    className="bg-gray-950/90 border-gray-600 text-white placeholder:text-gray-400 h-12"
                    autoFocus
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={!teamName.trim() || isLoading}
                  className="w-full h-14 text-lg bg-green-600 hover:bg-green-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <Users className="mr-2 h-5 w-5" />
                      Join Game
                    </>
                  )}
                </Button>

                {/* Back button */}
                <button
                  type="button"
                  onClick={() => setStep("room")}
                  className="w-full mt-4 text-gray-200 hover:text-white text-sm transition-colors"
                >
                  ← Change room code
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-gray-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    }>
      <JoinPageContent />
    </Suspense>
  )
}
