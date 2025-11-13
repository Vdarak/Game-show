"use client"

import { motion } from "framer-motion"

interface SponsorVideoScreenProps {
  videoUrl: string
}

export function SponsorVideoScreen({ videoUrl }: SponsorVideoScreenProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-black">
      {/* Video Player */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.5 }}
        className="relative w-full h-screen"
      >
        <video
          autoPlay
          muted
          playsInline
          className="w-full h-full object-contain"
          src={videoUrl}
        >
          <source src={videoUrl} type="video/mp4" />
        </video>
      </motion.div>

      {/* Skip hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="absolute bottom-8 right-8 text-white/70 text-sm"
      >
        Use controller to continue
      </motion.div>
    </div>
  )
}
