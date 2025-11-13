"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import { Phone, Mail, Globe } from "lucide-react"

interface EndingScreenProps {
  sponsorName?: string
  sponsorLogo?: string
  chibiImage?: string
}

export function EndingScreen({
  sponsorName = "Our Amazing Sponsors",
  sponsorLogo = "/logos/sponsor-logo.png",
  chibiImage = "/chibi-swag.png",
}: EndingScreenProps) {
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-blue-900 via-purple-900 to-indigo-900 flex flex-col overflow-hidden">
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
      <div className="relative z-10 px-4 py-3 sm:px-8 sm:py-4">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between gap-4 rounded-2xl border-4 border-orange-500 bg-gradient-to-r from-teal-600 via-emerald-500 to-teal-600 px-4 py-2 shadow-2xl sm:px-6 sm:py-3">
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

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-4 sm:px-8 sm:py-6">
        {/* Thank You Message */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-center mb-4 sm:mb-6"
        >
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 leading-tight">
            Thanks for Opening your{" "}
            <span className="text-yellow-300 text-3xl md:text-4xl lg:text-5xl">GATE</span>{" "}
            to Fun
          </h2>
          <p className="text-lg md:text-2xl lg:text-3xl font-semibold text-blue-200">
            with{" "}
            <span className="text-yellow-300">
              Games And Trivia Entertainment
            </span>
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-6xl">
          {/* Left Column - Full Height Chibi */}
          <div className="flex items-center justify-center">
            {/* Dancing Chibi - Full Height */}
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
              className="relative w-64 h-full min-h-[500px] md:w-80 lg:w-96"
            >
              <Image
                src={chibiImage}
                alt="GATE Chibi"
                fill
                className="object-contain drop-shadow-2xl"
                priority
              />
            </motion.div>
          </div>

          {/* Right Column - Grid with Connect With Us and Sponsor/Contact */}
          <div className="grid grid-cols-3 gap-4 h-full">
            {/* Connect With Us - Left Side, 1 column width */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1 }}
              className="bg-white/10 backdrop-blur-md rounded-xl p-3 border-2 border-white/30 flex flex-col justify-around"
            >
              <h3 className="text-lg md:text-xl font-bold text-yellow-300 mb-2 text-center">
                Connect!
              </h3>
              <div className="flex flex-col gap-3">
                {/* Google QR */}
                <div className="flex flex-col items-center">
                  <div className="bg-white rounded-lg p-1.5 mb-1 w-20 h-20 relative">
                    <Image
                      src="/google-QR.png"
                      alt="Google Review"
                      fill
                      className="object-contain p-0.5"
                    />
                  </div>
                  <p className="text-xs text-white text-center font-semibold">
                    Review Us
                  </p>
                </div>

                {/* Website QR */}
                <div className="flex flex-col items-center">
                  <div className="bg-white rounded-lg p-1.5 mb-1 w-20 h-20 relative">
                    <Image
                      src="/website-QR.png"
                      alt="Website"
                      fill
                      className="object-contain p-0.5"
                    />
                  </div>
                  <p className="text-xs text-white text-center font-semibold">
                    Visit Website
                  </p>
                </div>

                {/* Survey QR */}
                <div className="flex flex-col items-center">
                  <div className="bg-white rounded-lg p-1.5 mb-1 w-20 h-20 relative">
                    <Image
                      src="/survey-QR.png"
                      alt="Survey"
                      fill
                      className="object-contain p-0.5"
                    />
                  </div>
                  <p className="text-xs text-white text-center font-semibold">
                    Take Survey
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Right Side - Sponsor and Contact Stacked, 2 columns width */}
            <div className="col-span-2 flex flex-col gap-4 h-full">
              {/* Sponsor Section */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="bg-white/10 backdrop-blur-md rounded-xl p-4 border-2 border-yellow-400 flex-1 flex flex-col justify-center"
              >
                <h3 className="text-sm md:text-base font-bold text-white mb-2 text-center">
                  Tonight's Game was sponsored in part by:
                </h3>
                <div className="bg-white rounded-lg p-3 flex items-center justify-center flex-1">
                  <div className="relative w-full h-full max-h-24">
                    <Image
                      src={sponsorLogo}
                      alt={sponsorName}
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>
                <p className="text-center text-yellow-300 font-bold text-sm md:text-base mt-2">
                  {sponsorName}
                </p>
              </motion.div>

              {/* Contact Information */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="bg-white/10 backdrop-blur-md rounded-xl p-4 border-2 border-white/30 flex-1 flex flex-col justify-around"
              >
                <h3 className="text-lg font-bold text-yellow-300 mb-3 text-center">
                  Contact GATE
                </h3>
                <div className="space-y-2 text-white">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-yellow-300 flex-shrink-0" />
                    <span className="text-lg md:text-sm">(XXX) XXX-XXXX</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-yellow-300 flex-shrink-0" />
                    <span className="text-lg md:text-sm">info@gatevents.com</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-yellow-300 flex-shrink-0" />
                    <span className="text-lg md:text-sm">www.gatevents.com</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-3 text-center"
        >
          <p className="text-base md:text-lg lg:text-xl font-bold text-yellow-300">
            See you at the next event! 🎮✨
          </p>
        </motion.div>
      </div>
    </div>
  )
}
