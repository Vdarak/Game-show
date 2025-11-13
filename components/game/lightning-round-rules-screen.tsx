"use client"

import { motion } from "framer-motion"

interface LightningRoundRulesScreenProps {
  sponsorLogo1?: string | null
  sponsorLogo2?: string | null
}

export function LightningRoundRulesScreen({ sponsorLogo1, sponsorLogo2 }: LightningRoundRulesScreenProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 overflow-hidden">
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

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-6xl mx-auto space-y-8">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <h1
            className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black uppercase tracking-wider text-orange-500 mb-2"
            style={{
              textShadow: '4px 4px 0px #000, -2px -2px 0px #000, 2px -2px 0px #000, -2px 2px 0px #000, 6px 6px 12px rgba(0,0,0,0.6)',
              WebkitTextStroke: '3px #000',
              paintOrder: 'stroke fill',
            }}
          >
            Popularity
          </h1>
          <h2
            className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-wider text-yellow-400"
            style={{
              textShadow: '4px 4px 0px #000, -2px -2px 0px #000, 2px -2px 0px #000, -2px 2px 0px #000, 6px 6px 12px rgba(0,0,0,0.6)',
              WebkitTextStroke: '2.5px #000',
              paintOrder: 'stroke fill',
            }}
          >
            Speed Round
          </h2>
        </motion.div>

        {/* Presented By Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mx-auto max-w-4xl"
        >
          <div className="rounded-2xl border-4 border-yellow-400 bg-gradient-to-r from-black via-yellow-500 to-white p-6 shadow-2xl">
            <p className="text-center text-2xl sm:text-3xl font-bold text-white mb-4 uppercase tracking-wide">
              Presented By:
            </p>
            <div className="flex items-center justify-center gap-8">
              {/* Sponsor Logo 1 */}
              <div className="h-16 w-24 sm:h-20 sm:w-32 flex-shrink-0">
                <img
                  src={sponsorLogo1 || "/gate-logo.png"}
                  alt="Sponsor"
                  className="h-full w-full object-contain drop-shadow-lg"
                />
              </div>
              {/* Sponsor Logo 2 */}
              <div className="h-16 w-24 sm:h-20 sm:w-32 flex-shrink-0">
                <img
                  src={sponsorLogo2 || "/gate-logo.png"}
                  alt="Sponsor"
                  className="h-full w-full object-contain drop-shadow-lg"
                />
              </div>
              {/* GATE Logo (Always third) */}
              <div className="h-16 w-24 sm:h-20 sm:w-32 flex-shrink-0">
                <img
                  src="/gate-logo.png"
                  alt="GATE"
                  className="h-full w-full object-contain drop-shadow-lg"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Rule */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="text-center space-y-4"
        >
          <div className="bg-blue-900/80 border-4 border-blue-400 rounded-2xl p-8 sm:p-12 shadow-2xl">
            <h3
              className="text-4xl sm:text-5xl md:text-6xl font-black text-yellow-400 mb-4 uppercase"
              style={{
                textShadow: '3px 3px 0px #000, -1px -1px 0px #000, 1px -1px 0px #000, -1px 1px 0px #000',
                WebkitTextStroke: '2px #000',
                paintOrder: 'stroke fill',
              }}
            >
              25 Seconds
            </h3>
            <h4
              className="text-3xl sm:text-4xl md:text-5xl font-bold text-white uppercase"
              style={{
                textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
              }}
            >
              To Answer Six Questions
            </h4>
          </div>
        </motion.div>

        {/* Sub Rule */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="text-center"
        >
          <p className="text-white/90 text-xl sm:text-2xl font-semibold max-w-3xl mx-auto leading-relaxed">
            Points for matching with answers in the top spots
          </p>
        </motion.div>
      </div>
    </div>
  )
}
