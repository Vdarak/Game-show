"use client"

import { motion } from "framer-motion"
import Image from "next/image"

interface EndingScreenProps {
  sponsorName?: string
  sponsorLogo?: string
  chibiImage?: string
  onSponsorNameChange?: (name: string) => void
}

export function EndingScreen({
  sponsorName = "Our Amazing Sponsors",
  sponsorLogo = "/logos/sponsor-logo.png",
  chibiImage = "/chibi-swag.png",
  onSponsorNameChange,
}: EndingScreenProps) {
  return (
    <div className="relative h-screen w-screen bg-gradient-to-b from-blue-900 via-purple-900 to-indigo-900 flex flex-col overflow-x-hidden overflow-y-hidden">
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

      {/* Header - Same as game board */}
      <div className="relative z-10 px-2 py-2 sm:px-4 sm:py-3 flex-shrink-0">
        <div className="mx-auto max-w-[90vw]">
          <div className="flex items-center justify-between gap-2 sm:gap-4 rounded-xl border-3 border-orange-500 bg-gradient-to-r from-teal-600 via-emerald-500 to-teal-600 px-2 py-1 sm:px-4 sm:py-2 shadow-2xl">
            {/* Left - GATE Logo */}
            <div className="flex-shrink-0">
              <div className="h-12 w-24 sm:h-16 sm:w-32">
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
                className="font-display text-lg font-black uppercase tracking-wider text-orange-500 sm:text-2xl md:text-3xl"
                style={{
                  textShadow: '2px 2px 0px #000, -1px -1px 0px #000, 1px -1px 0px #000, -1px 1px 0px #000, 3px 3px 6px rgba(0,0,0,0.5)',
                  WebkitTextStroke: '1px #000',
                  paintOrder: 'stroke fill',
                }}
              >
                Popular Consensus
              </h1>
            </div>

            {/* Right - Sponsor Logo */}
            <div className="flex-shrink-0">
              {sponsorLogo ? (
                <div className="h-12 w-24 rounded-lg bg-white/90 p-1 sm:h-16 sm:w-32">
                  <img
                    src={sponsorLogo}
                    alt="Sponsor"
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : (
                <div className="h-12 w-24 rounded-lg border-2 border-dashed border-white/30 bg-white/10 sm:h-16 sm:w-32" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Centered with max-w-90vw */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center min-h-0 px-2 py-2 sm:px-4 sm:py-3">
        <div className="w-full max-w-[90vw] flex flex-col gap-2 sm:gap-3 h-full min-h-0">
          {/* Top Row - Chibi, Sponsor, Contact */}
          <div className="flex gap-2 sm:gap-3 flex-1 min-h-0">
            {/* Left - Chibi */}
            <motion.div
              animate={{
                rotate: [-5, 5, -5],
                y: [0, -10, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="w-1/4 flex items-center justify-center flex-shrink-0"
            >
              <div className="relative w-full h-full min-w-[20vw] max-w-[30vw] sm:max-w-[150px]">
                <Image
                  src={chibiImage}
                  alt="GATE Chibi"
                  fill
                  className="object-contain drop-shadow-2xl"
                  priority
                />
              </div>
            </motion.div>

            {/* Middle - Sponsor Section */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex-1 border-4 border-teal-500 rounded-lg bg-gradient-to-br from-purple-900/90 to-indigo-900/90 p-1.5 sm:p-3 flex flex-col justify-between min-h-0 shadow-xl backdrop-blur-sm"
            >
              <div className="flex-shrink-0">
                <h3
                  className="text-sm sm:text-lg md:text-xl font-black text-yellow-400 text-center leading-tight mb-1 uppercase tracking-wider"
                  style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
                >
                  {sponsorName}
                </h3>
              </div>
              <div className="flex-1 flex items-center justify-center min-h-0 my-1">
                {sponsorLogo && (
                  <div className="relative w-full h-full">
                    <Image
                      src={sponsorLogo}
                      alt={sponsorName}
                      fill
                      className="object-contain"
                    />
                  </div>
                )}
              </div>
            </motion.div>

            {/* Right - Contact Section */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex-1 border-4 border-teal-500 rounded-lg bg-gradient-to-br from-cyan-900/90 to-teal-900/90 p-1.5 sm:p-3 flex flex-col justify-center min-h-0 shadow-xl backdrop-blur-sm"
            >
                <div className="space-y-2 sm:space-y-4 text-white text-xl sm:text-3xl md:text-4xl font-bold text-center leading-tight">
                <div className="text-emerald-400 font-black text-2xl sm:text-4xl md:text-5xl">Jordan White</div>
                <div className="break-all text-lg sm:text-2xl md:text-3xl">gatentertainment.org</div>
                <div className="text-lg sm:text-2xl md:text-3xl">+1 (303) 332-2449</div>
                </div>
            </motion.div>
          </div>

          

          {/* Bottom Row - QR Codes (Full Width - 1/3rd of screen) */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1 }}
            className="w-full bg-white border-4 border-teal-500 rounded-lg p-3 sm:p-6 flex-shrink-0 shadow-xl"
            style={{ minHeight: '33vh' }}
          >
            <div className="flex gap-3 sm:gap-6 justify-between items-center h-full">
              {/* Google Reviews QR */}
              <div className="flex-1 flex flex-col items-center gap-2 sm:gap-3 h-full justify-center">
                <div className="bg-white border-3 border-teal-500 rounded p-2 sm:p-3 w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 relative flex-shrink-0 shadow-lg">
                  <Image
                    src="/google-QR.png"
                    alt="Google Reviews"
                    fill
                    className="object-contain p-1"
                  />
                </div>
                <p className="text-sm sm:text-base md:text-lg font-bold text-teal-600 text-center leading-tight">
                  Leave a Review
                </p>
              </div>

              {/* Take Surveys QR */}
              <div className="flex-1 flex flex-col items-center gap-2 sm:gap-3 h-full justify-center">
                <div className="bg-white border-3 border-teal-500 rounded p-2 sm:p-3 w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 relative flex-shrink-0 shadow-lg">
                  <Image
                    src="/survey-QR.png"
                    alt="Take Surveys"
                    fill
                    className="object-contain p-1"
                  />
                </div>
                <p className="text-sm sm:text-base md:text-lg font-bold text-teal-600 text-center leading-tight">
                  Survey
                </p>
              </div>

              {/* Website QR */}
              <div className="flex-1 flex flex-col items-center gap-2 sm:gap-3 h-full justify-center">
                <div className="bg-white border-3 border-teal-500 rounded p-2 sm:p-3 w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 relative flex-shrink-0 shadow-lg">
                  <Image
                    src="/website-QR.png"
                    alt="Website"
                    fill
                    className="object-contain p-1"
                  />
                </div>
                <p className="text-sm sm:text-base md:text-lg font-bold text-teal-600 text-center leading-tight">
                  Website
                </p>
              </div>
            </div>
          </motion.div>
          {/* Cognijin Credit Card */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="w-full bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 border-3 border-purple-400 rounded-lg p-2 sm:p-3 flex-shrink-0 shadow-xl"
          >
            <div className="flex items-center justify-center gap-3">
              <div className="h-8 w-12 sm:h-10 sm:w-16 relative flex-shrink-0">
                <Image
                  src="/cognijin.svg"
                  alt="Cognijin"
                  fill
                  className="object-contain bg-white/80 rounded-md"
                />
              </div>
              <p className="text-white text-[0.6rem] sm:text-xs font-bold text-center leading-tight">
                Popular Consensus Designed & Developed by <span className="font-black">Cognijin</span>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
