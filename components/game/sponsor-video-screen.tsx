"use client"

import { motion } from "framer-motion"
import { useEffect, useRef } from "react"
import { useGameState } from "@/hooks/use-game-state"

interface SponsorVideoScreenProps {
  videoUrl: string
  sponsorLogo: string | null
  footerText: string
  onVideoEnd: () => void
}

export function SponsorVideoScreen({ videoUrl, sponsorLogo, footerText, onVideoEnd }: SponsorVideoScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { state } = useGameState()
  const lastPlayTrigger = useRef<number | null>(null)
  const lastPauseTrigger = useRef<number | null>(null)
  const lastStopTrigger = useRef<number | null>(null)

  // Handle play trigger - only play if trigger actually changed
  useEffect(() => {
    if (!videoRef.current || !state.orchestration.sponsorVideoTrigger) return
    if (state.orchestration.sponsorVideoTrigger === lastPlayTrigger.current) return
    
    lastPlayTrigger.current = state.orchestration.sponsorVideoTrigger
    const video = videoRef.current
    video.play().catch((error) => {
      console.error("Error playing video:", error)
    })
  }, [state.orchestration.sponsorVideoTrigger])

  // Handle pause trigger - only pause if trigger actually changed
  useEffect(() => {
    if (!videoRef.current || !state.orchestration.sponsorVideoPauseTrigger) return
    if (state.orchestration.sponsorVideoPauseTrigger === lastPauseTrigger.current) return
    
    lastPauseTrigger.current = state.orchestration.sponsorVideoPauseTrigger
    const video = videoRef.current
    video.pause()
  }, [state.orchestration.sponsorVideoPauseTrigger])

  // Handle stop trigger - only stop if trigger actually changed
  useEffect(() => {
    if (!videoRef.current || !state.orchestration.sponsorVideoStopTrigger) return
    if (state.orchestration.sponsorVideoStopTrigger === lastStopTrigger.current) return
    
    lastStopTrigger.current = state.orchestration.sponsorVideoStopTrigger
    const video = videoRef.current
    video.pause()
    video.currentTime = 0
  }, [state.orchestration.sponsorVideoStopTrigger])

  // Handle video end - just notify, don't auto-advance
  const handleVideoEnded = () => {
    onVideoEnd()
  }

  return (
    <div className="relative h-screen w-screen flex flex-col items-center justify-center p-4 sm:p-6 overflow-x-hidden overflow-y-hidden">
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
      <div className="absolute inset-0 bg-black/60 z-[1]" />

      {/* Header - GATE Logo, Popular Consensus Title, Sponsor Logo */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 py-3 sm:px-8 sm:py-4">
        <div className="mx-auto max-w-[90vw]">
          <div className="flex items-center justify-between gap-4 rounded-2xl border-4 border-orange-500 bg-gradient-to-r from-teal-600 via-emerald-500 to-teal-600 px-4 py-2 shadow-2xl sm:px-6 sm:py-3">
            {/* Left - GATE Logo */}
            <div className="flex-shrink-0">
              <div className="h-16 w-32 sm:h-24 sm:w-48">
                <img
                  src="/gate-logo.png"
                  alt="GATE"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>

            {/* Center - Popular Consensus Title */}
            <div className="flex-1 text-center">
              <h1
                className="font-display text-2xl font-black uppercase tracking-wider text-orange-500 sm:text-4xl md:text-5xl"
                style={{
                  textShadow: '3px 3px 0px #000, -1px -1px 0px #000, 1px -1px 0px #000, -1px 1px 0px #000, 4px 4px 8px rgba(0,0,0,0.5)',
                  WebkitTextStroke: '2px #000',
                  paintOrder: 'stroke fill',
                }}
              >
                Popular Consensus
              </h1>
            </div>

            {/* Right - Sponsor Logo */}
            <div className="flex-shrink-0">
              {sponsorLogo ? (
                <div className="h-16 w-32 rounded-lg bg-white/90 p-1 sm:h-24 sm:w-48">
                  <img
                    src={sponsorLogo}
                    alt="Sponsor"
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : (
                <div className="h-16 w-32 rounded-lg border-2 border-dashed border-white/30 bg-white/10 sm:h-24 sm:w-48" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Decorative border effect */}
      <div className="absolute inset-0 pointer-events-none z-[2]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-1 bg-gradient-to-r from-transparent via-teal-400 to-transparent blur-md opacity-40" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-1 bg-gradient-to-r from-transparent via-teal-400 to-transparent blur-md opacity-40" />
      </div>

      {/* Sponsor Video Content */}
      <div className="relative z-10 flex items-center justify-center w-full max-w-[90vw] h-[calc(100vh-180px)] mt-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.5 }}
          className="relative w-full max-w-[80vw] aspect-video rounded-3xl overflow-hidden shadow-2xl border-4 border-orange-500"
        >
          <video
            ref={videoRef}
            controls
            onEnded={handleVideoEnded}
            className="w-full h-full object-contain bg-black"
            src={videoUrl}
            preload="metadata"
          >
            <source src={videoUrl} type="video/mp4" />
          </video>
        </motion.div>
      </div>
    </div>
  )
}
