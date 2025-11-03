"use client"

import { motion } from "framer-motion"

interface TeamBadgeProps {
  teamName: string
  color: string
  size?: "small" | "medium" | "large"
  variant?: "circular" | "rectangular"
}

export function TeamBadge({ teamName, color, size = "medium", variant = "rectangular" }: TeamBadgeProps) {
  const sizeClasses = {
    small: "px-4 py-2 text-sm",
    medium: "px-6 py-3 text-lg",
    large: "px-8 py-4 text-2xl",
  }

  const shapeClasses = {
    circular: "rounded-full",
    rectangular: "rounded-lg",
  }

  return (
    <motion.div
      className={`font-bold text-white ${sizeClasses[size]} ${shapeClasses[variant]}`}
      style={{
        backgroundColor: color,
        boxShadow: `0 0 20px ${color}60, 0 0 40px ${color}30`,
      }}
      animate={{
        boxShadow: [
          `0 0 20px ${color}60, 0 0 40px ${color}30`,
          `0 0 30px ${color}80, 0 0 60px ${color}50`,
          `0 0 20px ${color}60, 0 0 40px ${color}30`,
        ],
      }}
      transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
    >
      {teamName}
    </motion.div>
  )
}
