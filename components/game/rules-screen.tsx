"use client"

import { motion } from "framer-motion"
import { useGameState } from "@/hooks/use-game-state"

export function RulesScreen() {
  const { state } = useGameState()

  return (
    <div className="relative flex h-screen flex-col items-center justify-center p-4 sm:p-6 overflow-x-hidden overflow-y-hidden">
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
        <div className="mx-auto max-w-[80vw]">
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
              {state.sponsorLogo ? (
                <div className="h-16 w-32 rounded-lg bg-white/90 p-1 sm:h-24 sm:w-48">
                  <img
                    src={state.sponsorLogo}
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

      {/* Bento Grid Layout */}
      <div className="relative z-10 w-[85vw] max-w-[80vw] h-[70vh] mt-24 grid grid-cols-12 gap-3">
        {/* OBJECTIVE - Top Left */}
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1, type: "spring", stiffness: 100 }}
          className="col-span-6 row-span-4 rounded-xl border-4 border-teal-500 bg-gradient-to-br from-cyan-900/90 to-teal-900/90 p-4 shadow-xl backdrop-blur-sm flex flex-col"
        >
          <h2
            className="font-display text-2xl sm:text-3xl font-bold text-yellow-400 mb-3"
            style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
          >
            OBJECTIVE
          </h2>
          <div className="flex-1 flex items-center">
            <p className="text-white text-base sm:text-lg leading-relaxed" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
              • Be the <span className="font-bold text-emerald-400">Team</span> that wins the most <span className="font-bold text-yellow-300">Surveys</span>… <span className="text-orange-400 font-bold">OR</span> … Be the <span className="font-bold text-emerald-400">Team</span> that scores the most <span className="font-bold text-yellow-300">points</span>.
            </p>
          </div>
        </motion.div>

        {/* FACEOFF - Top Right */}
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.15, type: "spring", stiffness: 100 }}
          className="col-span-6 row-span-4 rounded-xl border-4 border-teal-500 bg-gradient-to-br from-purple-900/90 to-indigo-900/90 p-4 shadow-xl backdrop-blur-sm flex flex-col"
        >
          <h2
            className="font-display text-2xl sm:text-3xl font-bold text-yellow-400 mb-3"
            style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
          >
            FACEOFF
          </h2>
          <div className="flex-1 flex flex-col justify-center space-y-2 text-sm sm:text-base">
            <p className="text-white leading-relaxed" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
              • The <span className="font-bold text-emerald-400">Team</span> that goes <span className="font-bold text-cyan-300">first</span> is selected by the <span className="font-bold text-yellow-300">Faceoff</span>, which happens at the <span className="font-bold text-orange-400">start of every new survey</span>.
            </p>
            <p className="text-white leading-relaxed" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
              • The <span className="font-bold text-pink-400">Host</span> will tell how many answers are available and will read the prompt.
            </p>
            <p className="text-white leading-relaxed" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
              • The player that buzzes in <span className="font-bold text-green-400">1st</span>, and provides the <span className="font-bold text-yellow-300">highest rated</span> or <span className="font-bold text-yellow-300">(Top)</span> correct answer, gets the choice to have their team <span className="font-bold text-emerald-400">play</span> the remainder of the round or <span className="font-bold text-red-400">Pass</span> the round to the other team.
            </p>
          </div>
        </motion.div>

        {/* GAMEPLAY - Bottom Left */}
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2, type: "spring", stiffness: 100 }}
          className="col-span-6 row-span-5 rounded-xl border-4 border-teal-500 bg-gradient-to-br from-indigo-900/90 to-blue-900/90 p-4 shadow-xl backdrop-blur-sm flex flex-col"
        >
          <h2
            className="font-display text-2xl sm:text-3xl font-bold text-yellow-400 mb-3"
            style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
          >
            GAMEPLAY
          </h2>
          <div className="flex-1 flex flex-col justify-center space-y-2 text-sm sm:text-base">
            <p className="text-white leading-relaxed" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
              • Split into <span className="font-bold text-cyan-300">2 even teams</span>. (<span className="font-bold text-orange-400">6 people max</span>)
            </p>
            <p className="text-white leading-relaxed" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
              • Each player is assigned a <span className="font-bold text-yellow-300">"player number"</span>. Players now match up at the start of each survey for a <span className="font-bold text-pink-400">Faceoff question</span>.
            </p>
            <p className="text-white leading-relaxed" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
              • The winner of the <span className="font-bold text-yellow-300">Faceoff</span> chooses if their team will <span className="font-bold text-emerald-400">Play</span> or <span className="font-bold text-red-400">Pass</span> the remainder of the survey.
            </p>
            <p className="text-white leading-relaxed" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
              • The goal is to answer all survey questions on the board without messing up <span className="font-bold text-red-400">3 times</span>. If you get <span className="font-bold text-red-400">3 wrong answers</span>, the other team can <span className="font-bold text-yellow-300">steal the points</span> away, by providing <span className="font-bold text-emerald-400">JUST ONE</span> of the leftover answers on the board.
            </p>
          </div>
        </motion.div>

        {/* SCORING - Bottom Right */}
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.25, type: "spring", stiffness: 100 }}
          className="col-span-6 row-span-5 rounded-xl border-4 border-teal-500 bg-gradient-to-br from-pink-900/90 to-purple-900/90 p-4 shadow-xl backdrop-blur-sm flex flex-col"
        >
          <h2
            className="font-display text-2xl sm:text-3xl font-bold text-yellow-400 mb-3"
            style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
          >
            SCORING
          </h2>
          <div className="flex-1 flex flex-col justify-center space-y-2 text-sm sm:text-base">
            <p className="text-white leading-relaxed" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
              • Correct answers are added up one of <span className="font-bold text-cyan-300">two ways</span>:
            </p>
            <div className="pl-4 space-y-1">
              <p className="text-white leading-relaxed" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                <span className="font-bold text-emerald-400">A)</span> <span className="font-bold text-yellow-300">"Surveys Won"</span> - each full survey is worth <span className="font-bold text-orange-400">one point</span>. First team to reach <span className="font-bold text-green-400">3 points</span> is the winner
              </p>
              <p className="text-white leading-relaxed" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                <span className="font-bold text-emerald-400">B)</span> <span className="font-bold text-yellow-300">"Points"</span> - each answer on the survey is worth a designated point value.
              </p>
              <p className="text-white text-xs sm:text-sm leading-relaxed pl-4" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                (ex. <span className="font-bold text-yellow-300">#1</span> answer is worth <span className="font-bold text-orange-400">10pts</span>, <span className="font-bold text-yellow-300">#2</span>=<span className="font-bold text-orange-400">9pts</span>, <span className="font-bold text-yellow-300">#3</span>=<span className="font-bold text-orange-400">8pts</span>, <span className="font-bold text-yellow-300">#4</span>=<span className="font-bold text-orange-400">7pts</span>, <span className="font-bold text-yellow-300">#5</span>=<span className="font-bold text-orange-400">6pts</span>, <span className="font-bold text-yellow-300">#6</span>=<span className="font-bold text-orange-400">5pts</span>, <span className="font-bold text-yellow-300">#7</span>=<span className="font-bold text-orange-400">4pts</span>, <span className="font-bold text-yellow-300">#8</span>=<span className="font-bold text-orange-400">3pts</span>, <span className="font-bold text-yellow-300">#9</span>=<span className="font-bold text-orange-400">2pts</span>, <span className="font-bold text-yellow-300">#10</span>=<span className="font-bold text-orange-400">1pt</span>)
              </p>
            </div>
            <p className="text-white leading-relaxed" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
              • If there is a <span className="font-bold text-red-400">Tie</span>, one player from each team plays the <span className="font-bold text-pink-400">Final Feud Question</span>. First to buzz with the <span className="font-bold text-yellow-300">#1 ranked answer</span> wins.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
