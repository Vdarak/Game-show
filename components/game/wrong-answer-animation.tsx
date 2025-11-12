"use client"

import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CircleSlash } from "lucide-react"

interface WrongAnswerAnimationProps {
  trigger: number | null
}

export function WrongAnswerAnimation({ trigger }: WrongAnswerAnimationProps) {
  const [showAnimation, setShowAnimation] = useState(false)
  const prevTriggerRef = useRef<number | null>(null)

  useEffect(() => {
    // Trigger changed and is not null - play animation
    if (trigger !== null && trigger !== prevTriggerRef.current) {
      prevTriggerRef.current = trigger
      setShowAnimation(true)

      const hideTimer = setTimeout(() => {
        setShowAnimation(false)
      }, 2300)

      return () => clearTimeout(hideTimer)
    }
  }, [trigger])

  return (
    <AnimatePresence>
      {showAnimation && (
        <>
          {/* Dark blurry overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.7, 0.7, 0] }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 2.2,
              times: [0, 0.1, 0.5, 1],
              ease: "easeOut",
            }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm pointer-events-none"
          />

          {/* CircleSlash icon */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [0, 0.7, 0.7, 0.7],
              opacity: [0, 1, 1, 0],
            }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{
              duration: 2.2,
              times: [0, 0.1, 0.5, 1],
              ease: "easeOut",
            }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <motion.div
              animate={{
                rotate: [0, -15, 15, -10, 10, -5, 5, 0],
                x: [0, -8, 8, -6, 6, -3, 3, 0],
              }}
              transition={{
                duration: 2.2,
                ease: "easeInOut",
              }}
            >
              <CircleSlash className="w-40 h-40 sm:w-56 sm:h-56 text-red-500 drop-shadow-[0_0_30px_rgba(239,68,68,0.8)]" strokeWidth={2} />
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

