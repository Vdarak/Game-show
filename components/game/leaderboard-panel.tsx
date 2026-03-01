"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, RefreshCw, Loader2, Eye, EyeOff } from "lucide-react"
import type { LeaderboardResponse } from "@/lib/api-types"
import { TeamAvatar } from "./team-avatar"

interface LeaderboardPanelProps {
  leaderboard: LeaderboardResponse | null
  isLoading: boolean
  onRefresh: () => Promise<unknown>
  isVisible?: boolean
  onToggleVisibility?: () => void
}

export function LeaderboardPanel({
  leaderboard,
  isLoading,
  onRefresh,
  isVisible = true,
  onToggleVisibility,
}: LeaderboardPanelProps) {
  const entries = leaderboard?.entries || []

  return (
    <Card className="bg-gray-800 border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-400" />
            Leaderboard
          </h3>
          <div className="flex items-center gap-2">
            {onToggleVisibility && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleVisibility}
                className={`h-8 w-8 p-0 ${
                  isVisible ? "text-green-400" : "text-gray-400"
                }`}
                title={isVisible ? "Hide from display" : "Show on display"}
              >
                {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="text-gray-400 hover:text-white h-8 w-8 p-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Leaderboard Entries */}
      <div className="max-h-[400px] overflow-auto">
        {entries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No scores yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700/50">
            <AnimatePresence>
              {entries.map((entry, index) => {
                const isTopThree = entry.Rank <= 3
                const medal = ["🥇", "🥈", "🥉"][entry.Rank - 1]

                return (
                  <motion.div
                    key={entry.IDTeam}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center gap-3 p-3 ${
                      isTopThree ? "bg-yellow-900/10" : ""
                    }`}
                  >
                    {/* Rank */}
                    <div className="w-10 text-center font-display font-bold">
                      {isTopThree ? (
                        <span className="text-2xl">{medal}</span>
                      ) : (
                        <span className="text-gray-400">#{entry.Rank}</span>
                      )}
                    </div>

                    {/* Team Info */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <TeamAvatar
                        avatarPath={entry.AvatarBlobPath}
                        teamName={entry.TeamName}
                        size="md"
                      />
                      <span className="text-white font-medium truncate">
                        {entry.TeamName}
                      </span>
                    </div>

                    {/* Scores */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Round</div>
                        <div className="text-sm text-gray-400">
                          {entry.RoundScore > 0 ? `+${entry.RoundScore}` : entry.RoundScore}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Total</div>
                        <div className="font-display text-xl font-bold text-yellow-400">
                          {entry.TotalScore}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </Card>
  )
}
