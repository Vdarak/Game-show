"use client"

import { motion } from "framer-motion"

export function LightningRoundScreen() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src="/videos/background.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50 z-[1]" />

      {/* Content */}
      <div className="relative z-10 text-center">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 100,
            damping: 15,
            duration: 1,
          }}
          className="mb-8"
        >
          <h1
            className="font-display text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black uppercase tracking-wider text-yellow-400"
            style={{
              textShadow: '5px 5px 0px #000, -2px -2px 0px #000, 2px -2px 0px #000, -2px 2px 0px #000, 8px 8px 16px rgba(0,0,0,0.8)',
              WebkitTextStroke: '3px #000',
              paintOrder: 'stroke fill',
            }}
          >
            Lightning
            <br />
            Round
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="space-y-4"
        >
          <p className="text-white text-2xl sm:text-3xl font-bold">
            Coming Soon!
          </p>
          <p className="text-white/80 text-lg sm:text-xl">
            This feature is under development
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.5 }}
          className="mt-12 text-white/60 text-base"
        >
          Use the controller to navigate
        </motion.div>
      </div>
    </div>
  )
}
