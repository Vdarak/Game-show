"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { useRoomSync } from "@/hooks/use-room-sync"
import { NetworkIndicator } from "@/components/pwa/network-indicator"
import { InstallPWA } from "@/components/pwa/install-prompt"
import { motion } from "framer-motion"
import { Users, Play, Copy, Check } from "lucide-react"

export default function Home() {
  const router = useRouter()
  const { roomState, createRoom, joinRoom, isOnline } = useRoomSync()
  const [roomCodeInput, setRoomCodeInput] = useState("")
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    // If already in a room, redirect to controller
    if (roomState.roomCode && roomState.connected) {
      router.push("/controller")
    }
  }, [roomState, router])

  const handleCreateRoom = () => {
    const code = createRoom()
    console.log("Room created:", code)
  }

  const handleJoinRoom = () => {
    if (!roomCodeInput.trim()) {
      setError("Please enter a room code")
      return
    }
    const success = joinRoom(roomCodeInput.toUpperCase())
    if (success) {
      router.push("/controller")
    } else {
      setError("Failed to join room")
    }
  }

  const handleCopyCode = () => {
    if (roomState.roomCode) {
      const code = roomState.roomCode
      // Try modern clipboard API first, fallback to older method
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code)
          .then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          })
          .catch(() => {
            // Fallback if clipboard API fails
            fallbackCopyToClipboard(code)
          })
      } else {
        // Fallback for browsers without clipboard API
        fallbackCopyToClipboard(code)
      }
    }
  }

  const fallbackCopyToClipboard = (text: string) => {
    const textArea = document.createElement("textarea")
    textArea.value = text
    textArea.style.position = "fixed"
    textArea.style.left = "-999999px"
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    try {
      document.execCommand("copy")
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
    document.body.removeChild(textArea)
  }

  if (roomState.roomCode && roomState.connected) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="mb-4 text-gray-400">Redirecting to controller...</div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <InstallPWA />
      
      <div className="absolute right-4 top-4">
        <NetworkIndicator />
      </div>

      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-12 text-center"
      >
        <h1 className="mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text font-display text-6xl font-bold text-transparent">
          Family Feud
        </h1>
        <p className="font-display text-xl text-gray-400">Game Show Experience</p>
      </motion.div>

      <Card className="w-full max-w-md border-gray-700 bg-gray-800/50 p-8 backdrop-blur">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          <div className="text-center">
            <Users className="mx-auto mb-4 h-12 w-12 text-blue-400" />
            <h2 className="mb-2 font-display text-2xl font-bold text-white">Get Started</h2>
            <p className="font-display text-sm text-gray-400">
              Create a new game room or join an existing one
            </p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={handleCreateRoom}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 py-6 text-lg font-semibold hover:from-blue-600 hover:to-purple-600"
              size="lg"
            >
              <Play className="mr-2 h-5 w-5" />
              Create New Game Room
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-600" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gray-800 px-2 font-display text-gray-400">Or join existing</span>
              </div>
            </div>

            <div className="space-y-3">
              <Input
                value={roomCodeInput}
                onChange={(e) => {
                  setRoomCodeInput(e.target.value.toUpperCase())
                  setError("")
                }}
                placeholder="Enter Room Code"
                className="border-gray-600 bg-gray-900/50 py-6 text-center font-display text-lg uppercase tracking-widest text-white placeholder:text-gray-500"
                maxLength={6}
              />
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-display text-sm text-red-400"
                >
                  {error}
                </motion.p>
              )}
              <Button
                onClick={handleJoinRoom}
                variant="outline"
                className="w-full border-blue-500/50 py-6 text-lg hover:bg-blue-500/10"
                size="lg"
              >
                Join Game Room
              </Button>
            </div>
          </div>

          {!isOnline && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-4 text-sm text-orange-300"
            >
              <p className="font-display font-semibold">Offline Mode</p>
              <p className="mt-1 font-display text-xs">
                You're currently offline. Games created will be local to this device network.
                Connect to the internet for online multiplayer.
              </p>
            </motion.div>
          )}
        </motion.div>
      </Card>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 text-center text-sm text-gray-500"
      >
        <p className="font-display">Works offline • Multi-screen support • Real-time sync</p>
      </motion.div>
    </div>
  )
}
