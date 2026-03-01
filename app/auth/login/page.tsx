"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Loader2, LogIn, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const { login, isLoading, error } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [localError, setLocalError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    if (!email || !password) {
      setLocalError("Please enter both email and password")
      return
    }

    try {
      await login(email, password)
      router.push("/trivia")
    } catch {
      // Error is already set in auth context
    }
  }

  const displayError = localError || error

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      {/* Background decorative elements */}
      <div className="pointer-events-none fixed inset-0 opacity-20">
        <motion.div
          className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-purple-600 blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-blue-600 blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -50, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="bg-gray-900/80 border-gray-800 backdrop-blur-sm p-8">
          {/* Logo / Title */}
          <div className="text-center mb-8">
            <h1 className="font-display text-4xl font-bold text-white mb-2">
              Trivi-Time
            </h1>
            <p className="text-gray-400 text-sm">
              Host Login
            </p>
          </div>

          {/* Error Display */}
          {displayError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-400 text-sm"
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{displayError}</span>
            </motion.div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@trivitime.com"
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white mt-6"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-800 text-center">
            <p className="text-xs text-gray-500">
              This is a host-only login. Players join via room code.
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
