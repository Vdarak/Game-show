"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"

interface AnimatedNumberProps {
  value: number
  className?: string
  color?: string
  size?: "small" | "medium" | "large" | "massive"
}

export function AnimatedNumber({ value, className = "", color, size = "large" }: AnimatedNumberProps) {
  const [prevValue, setPrevValue] = useState(value)
  const [digits, setDigits] = useState<string[]>([])
  const [changedIndices, setChangedIndices] = useState<Set<number>>(new Set())
  const isIncreasing = value > prevValue

  const sizeClasses = {
    small: "text-2xl gap-1",
    medium: "text-5xl gap-2",
    large: "text-7xl gap-3",
    massive: "text-9xl gap-4",
  }

  useEffect(() => {
    const valueStr = value.toString()
    const prevStr = prevValue.toString()
    const newDigits = valueStr.split("")

    // Pad with leading zeros if needed to match length
    const maxLength = Math.max(newDigits.length, prevStr.length)
    const paddedNew = newDigits.map((d) => d.padStart(maxLength, "0"))
    const paddedPrev = prevStr.split("").map((d) => d.padStart(maxLength, "0"))

    // Find which digits changed
    const changed = new Set<number>()
    paddedNew.forEach((digit, index) => {
      if (paddedPrev[index] !== digit) {
        changed.add(index)
      }
    })

    setChangedIndices(changed)
    setDigits(paddedNew)
    setPrevValue(value)

    // Clear the changed indices after animation
    const timeout = setTimeout(() => {
      setChangedIndices(new Set())
    }, 600)

    return () => clearTimeout(timeout)
  }, [value, prevValue])

  const [sizeClass, gapClass] = sizeClasses[size].split(" gap-")

  return (
    <div className={`flex flex-row-reverse justify-center gap-${gapClass} ${className}`}>
      {digits
        .slice()
        .reverse()
        .map((digit, reverseIndex) => {
          const actualIndex = digits.length - 1 - reverseIndex
          const isChanged = changedIndices.has(actualIndex)

          return (
            <DigitColumn
              key={`${actualIndex}-${digit}`}
              digit={Number.parseInt(digit)}
              isChanged={isChanged}
              isIncreasing={isIncreasing}
              color={color}
              size={sizeClass}
            />
          )
        })}
    </div>
  )
}

interface DigitColumnProps {
  digit: number
  isChanged: boolean
  isIncreasing: boolean
  color?: string
  size: string
}

function DigitColumn({ digit, isChanged, isIncreasing, color, size }: DigitColumnProps) {
  const [displayDigit, setDisplayDigit] = useState(digit)
  const columnRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isChanged) {
      // Animate through digits
      const start = displayDigit
      const end = digit
      const direction = end > start ? 1 : -1
      let current = start

      const interval = setInterval(() => {
        current = (current + direction + 10) % 10
        setDisplayDigit(current)

        if (current === end) {
          clearInterval(interval)
        }
      }, 50)

      return () => clearInterval(interval)
    } else {
      setDisplayDigit(digit)
    }
  }, [digit, isChanged, displayDigit])

  return (
    <div className="relative overflow-hidden px-1">
      {/* Hidden placeholder to maintain height */}
      <div className={`invisible ${size} font-bold tabular-nums`} style={{ color }}>
        8
      </div>

      {/* Animated digit column */}
      <motion.div
        ref={columnRef}
        className="absolute inset-0 flex flex-col items-center justify-start"
        animate={{
          y: `${-displayDigit * 100}%`,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <div
            key={num}
            className={`flex h-full items-center justify-center ${size} font-bold tabular-nums`}
            style={{
              color: color || "currentColor",
              textShadow: color ? `0 0 20px ${color}40` : undefined,
            }}
          >
            {num}
          </div>
        ))}
      </motion.div>
    </div>
  )
}
