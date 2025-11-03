"use client"

import { motion, useSpring, useTransform } from "framer-motion"
import { useEffect } from "react"

interface ScoreDisplayProps {
  score: number
  label?: string
  size?: "small" | "large"
  color?: string
}

export function ScoreDisplay({ score, label, size = "large", color = "#FFD700" }: ScoreDisplayProps) {
  const spring = useSpring(0, { stiffness: 100, damping: 30 })
  const display = useTransform(spring, (current) => Math.round(current).toLocaleString())

  useEffect(() => {
    spring.set(score)
  }, [spring, score])

  const sizeClasses = {
    small: "text-4xl",
    large: "text-8xl",
  }

  const labelSizeClasses = {
    small: "text-lg",
    large: "text-2xl",
  }

  return (
    <div className="flex flex-col items-center">
      {label && (
        <div className={`mb-2 font-bold uppercase tracking-wider ${labelSizeClasses[size]}`} style={{ color }}>
          {label}
        </div>
      )}
      <motion.div
        className={`font-bold tabular-nums ${sizeClasses[size]}`}
        style={{
          color,
          textShadow: `0 0 20px ${color}40, 0 0 40px ${color}20`,
        }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 0.3 }}
        key={score}
      >
        {display}
      </motion.div>
    </div>
  )
}
