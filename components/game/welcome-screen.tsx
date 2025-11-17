"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"

export function WelcomeScreen() {
  const [stage, setStage] = useState<"logo" | "title" | "subtitle">("logo")

  useEffect(() => {
    // Logo appears first
    const logoTimer = setTimeout(() => {
      setStage("title")
    }, 1500)

    // Title spins in
    const titleTimer = setTimeout(() => {
      setStage("subtitle")
    }, 3500)

    return () => {
      clearTimeout(logoTimer)
      clearTimeout(titleTimer)
    }
  }, [])

  return (
    <div className="relative h-screen w-screen flex flex-col items-center justify-center overflow-x-hidden overflow-y-hidden">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src="/videos/welcome-background.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/30 z-[1]" />

      {/* Content Container */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-6xl px-8">
        {/* GATE Logo - Slides from top */}
        <motion.div
          initial={{ y: -300, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 100,
            damping: 20,
            duration: 1,
          }}
          className="mb-4"
        >
          <img
            src="/gate-logo.png"
            alt="GATE Logo"
            className="h-9 w-auto sm:h-10 md:h-11 drop-shadow-2xl"
          />
        </motion.div>

        {/* "presents" text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={stage !== "logo" ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-white text-lg sm:text-xl font-semibold tracking-widest mb-8"
          style={{
            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
          }}
        >
          Presents
        </motion.div>

        {/* Oval Container for Title */}
        <div className="relative w-full max-w-5xl aspect-[2.7/1] mb-16 mt-8 overflow-visible">
          {/* Animated Oval Background */}
          <motion.div
            initial={{ scale: 0, rotate: 720, opacity: 0 }}
            animate={stage !== "logo" ? { scale: 1.2, rotate: 0, opacity: 1 } : {}}
            transition={{
              type: "spring",
              stiffness: 60,
              damping: 15,
              duration: 1.5,
            }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <img
              src="/Oval.png"
              alt="Title Frame"
              className="w-[120%] h-[120%] object-contain drop-shadow-[0_0_30px_rgba(0,0,0,0.8)]"
            />
          </motion.div>

          {/* Popular Consensus Title - Spins into place */}
          <motion.div
            initial={{ scale: 0, rotate: 720, opacity: 0 }}
            animate={stage !== "logo" ? { scale: 0.96, rotate: 0, opacity: 1 } : {}}
            transition={{
              type: "spring",
              stiffness: 60,
              damping: 15,
              duration: 1.5,
              delay: 0.05,
            }}
            className="absolute inset-0 flex items-center justify-center px-10"
          >
            <h1
              className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black uppercase tracking-wider text-orange-500 text-center leading-tight"
              style={{
                textShadow: '4px 4px 0px #000, -2px -2px 0px #000, 2px -2px 0px #000, -2px 2px 0px #000, 6px 6px 12px rgba(0,0,0,0.7)',
                WebkitTextStroke: '3px #000',
                paintOrder: 'stroke fill',
              }}
            >
              Popular
              <br />
              Consensus
            </h1>
          </motion.div>
        </div>

        {/* Subtitle - Slides up from bottom */}
        <motion.div
          initial={{ y: 300, opacity: 0 }}
          animate={stage === "subtitle" ? { y: 0, opacity: 1 } : {}}
          transition={{
            type: "spring",
            stiffness: 80,
            damping: 20,
            delay: 0.4,
          }}
          className="mt-2 text-center text-white"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 tracking-wide">
            A Head-To-Head Party Game
          </h2>
          <div className="text-xl sm:text-2xl font-light mt-6">
            <p className="mb-2">Brought to you by:</p>
            <p className="font-semibold text-teal-300 tracking-widest">
              Games And Trivia Entertainment
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
