"use client"

import { motion } from "framer-motion"
import { X } from "lucide-react"

interface StrikeIndicatorProps {
  count: number
  animated?: boolean
  size?: "small" | "medium" | "large"
}

export function StrikeIndicator({ count, animated = true, size = "medium" }: StrikeIndicatorProps) {
  const strikes = [0, 1, 2]

  const sizeClasses = {
    small: "h-6 w-6",
    medium: "h-10 w-10",
    large: "h-16 w-16",
  }

  return (
    <div className="flex items-center gap-2">
      {strikes.map((index) => {
        const isActive = index < count
        const isThirdStrike = count === 3 && index === 2

        return (
          <motion.div
            key={index}
            initial={animated && isActive ? { scale: 0, rotate: -180 } : false}
            animate={
              animated && isActive
                ? {
                    scale: 1,
                    rotate: 0,
                    ...(isThirdStrike && {
                      rotate: [0, -10, 10, -10, 10, 0],
                      transition: { duration: 0.5 },
                    }),
                  }
                : {}
            }
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className={`flex items-center justify-center rounded-full ${sizeClasses[size]} ${
              isActive ? "bg-red-500" : "bg-gray-600"
            }`}
          >
            <X className={`${size === "small" ? "h-4 w-4" : size === "medium" ? "h-6 w-6" : "h-10 w-10"} text-white`} />
          </motion.div>
        )
      })}
    </div>
  )
}
