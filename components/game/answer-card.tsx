"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"

interface AnswerCardProps {
  rank: number
  text: string
  points: number
  revealed: boolean
  onReveal?: () => void
  showControls?: boolean
}

export function AnswerCard({ rank, text, points, revealed, onReveal, showControls = false }: AnswerCardProps) {
  return (
    <motion.div
      initial={false}
      animate={{ rotateY: revealed ? 180 : 0 }}
      transition={{ duration: 0.6, type: "spring" }}
      style={{ transformStyle: "preserve-3d" }}
      className="relative h-20 w-full"
    >
      {/* Hidden side */}
      <div
        className="absolute inset-0 flex items-center justify-between rounded-lg bg-blue-900 px-6 py-4"
        style={{ backfaceVisibility: "hidden" }}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-700 text-xl font-bold text-white">
          {rank}
        </div>
        <div className="flex-1 text-center text-2xl font-bold text-white">?????</div>
        <div className="w-10"></div>
      </div>

      {/* Revealed side */}
      <div
        className="absolute inset-0 flex items-center justify-between rounded-lg bg-blue-600 px-6 py-4"
        style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-800 text-xl font-bold text-white">
          {rank}
        </div>
        <div className="flex-1 text-center text-2xl font-bold text-white">{text}</div>
        <div className="text-2xl font-bold text-yellow-400">{points}</div>
      </div>

      {/* Control button overlay */}
      {showControls && onReveal && (
        <Button
          onClick={onReveal}
          className="absolute inset-0 z-10 h-full w-full opacity-0 hover:opacity-100"
          variant="ghost"
        >
          {revealed ? "Hide" : "Reveal"}
        </Button>
      )}
    </motion.div>
  )
}
