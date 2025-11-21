"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { useGameState } from "@/hooks/use-game-state"
import { useAudio } from "@/hooks/use-audio"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { StrikeIndicator } from "@/components/game/strike-indicator"
import { formatScore } from "@/lib/game-utils"
import { AnimatedNumber } from "@/components/game/animated-number"
import { NetworkIndicator } from "@/components/pwa/network-indicator"
import { InstallPWA } from "@/components/pwa/install-prompt"
import { themes } from "@/lib/themes"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"
import { OrchestrationPanel } from "@/components/game/orchestration-panel"
import {
  ExternalLink,
  Plus,
  Minus,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Trophy,
  Volume2,
  AlertCircle,
  Monitor,
  Play,
  Square,
} from "lucide-react"

type DisplayWindow = {
  name: string
  url: string
  windowRef: Window | null
  status: "active" | "error" | "hidden"
}

export default function ControllerPage() {
  const {
    state,
    updateScore,
    addStrike,
    resetStrikes,
    revealAnswer,
    revealAllAnswers,
    hideAllAnswers,
    loadQuestion,
    nextQuestion,
    previousQuestion,
    updateTeamName,
    updateTeamColor,
    updateTeamTheme,
    addTeamStrike,
    resetTeamStrikes,
    awardRoundPoints,
    resetGame,
    clearQuestion,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    updateSponsorLogo,
    updateSponsorVideo,
    updateFooterText,
    triggerWrongAnswer,
    toggleSurveyTotals,
    // Orchestration functions
    goToWelcome,
    goToRules,
    goToQuestions,
    goToQuestionPreview,
    revealQuestionPrompt,
    goToSponsorVideo,
    playSponsorVideo,
    pauseSponsorVideo,
    stopSponsorVideo,
    videoEnded,
    goToLightningRound,
    goToLightningRoundRules,
    goToEnding,
    // Lightning Round functions
    updateLightningRoundQuestion,
    updateLightningContestantName,
    updateLightningAnswer,
    revealLightningAnswer,
    toggleLightningPoints,
    revealAllLightningAnswers,
    hideAllLightningAnswers,
    startLightningTimer,
    stopLightningTimer,
    toggleLightningTimerVisibility,
    resetLightningRound,
    // Ending screen functions
    updateChibiImage,
    updateSponsorName,
    updateLightningRulesSponsorLogo,
    // Episode management
    episodes,
    currentEpisodeName,
    saveEpisode,
    loadEpisode,
    renameEpisode,
    deleteEpisode,
  } = useGameState()

  const { playSound, preloadSound, playingSound, isReady } = useAudio()

  const [copied, setCopied] = useState(false)

  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [introMusicPlaying, setIntroMusicPlaying] = useState(false)
  const [currentBackgroundMusic, setCurrentBackgroundMusic] = useState<"intro" | "excitement" | null>(null)
  const introMusicRef = useRef<HTMLAudioElement | null>(null)

  const [displays, setDisplays] = useState<DisplayWindow[]>([
    { name: "Game Board", url: "/display/game-board", windowRef: null, status: "hidden" },
    { name: "Team Scores", url: "/display/teams", windowRef: null, status: "hidden" },
  ])


  // Define sound effects before using them
  const soundEffects = [
    { name: "Correct", type: "ding" as const, filename: "dong.wav", color: "border-green-600" },
    { name: "Ring In", type: "buzzer" as const, filename: "player-buzzer.wav", color: "border-purple-600" },
    { name: "Duplicate", type: "duplicate" as const, filename: "duplicate-answer.wav", color: "border-yellow-600" },
    { name: "Wrong", type: "buzz" as const, filename: "wrong-buzzer.wav", color: "border-red-600" },
    { name: "Whoosh", type: "whoosh" as const, filename: "answer-box-fly-whoosh.wav", color: "border-blue-600" },
  ]

  // Preload sound effects immediately when audio is ready
  useEffect(() => {
    if (isReady) {
      console.log("[Controller] Audio ready, preloading all sounds...")
      soundEffects.forEach((sound) => {
        console.log(`[Controller] Preloading: ${sound.name} (${sound.type} -> ${sound.filename})`)
        preloadSound(sound.type, sound.filename)
      })
    }
  }, [isReady, preloadSound])

  // Lightning Round Timer - Play buzzer when time is up
  useEffect(() => {
    if (!state.lightningRound.timerActive || !state.lightningRound.timerStartTime) {
      return
    }

    const checkTimer = () => {
      const elapsed = (Date.now() - state.lightningRound.timerStartTime!) / 1000
      const remaining = state.lightningRound.timerSeconds - elapsed
      
      if (remaining <= 0) {
        // Play wrong buzzer sound when time is up
        console.log('[Controller] Timer ended, playing buzz sound')
        playSound("buzz")
        // Auto stop the timer
        stopLightningTimer()
      }
    }

    // Check immediately
    checkTimer()

    // Then check every 100ms
    const interval = setInterval(checkTimer, 100)
    
    return () => clearInterval(interval)
  }, [state.lightningRound.timerActive, state.lightningRound.timerStartTime, state.lightningRound.timerSeconds, playSound, stopLightningTimer])

  useEffect(() => {
    const checkInterval = setInterval(() => {
      setDisplays((prev) =>
        prev.map((display) => {
          if (display.windowRef && !display.windowRef.closed) {
            try {
              display.windowRef.location.href
              return { ...display, status: "active" as const }
            } catch {
              return { ...display, status: "error" as const }
            }
          } else if (display.windowRef && display.windowRef.closed) {
            return { ...display, windowRef: null, status: "hidden" as const }
          }
          return display
        }),
      )
    }, 2000)

    return () => clearInterval(checkInterval)
  }, [])

  const openDisplay = (index: number) => {
    setDisplays((prev) =>
      prev.map((display, i) => {
        if (i === index && (!display.windowRef || display.windowRef.closed)) {
          const newWindow = window.open(display.url, display.name, "width=1920,height=1080")
          return { ...display, windowRef: newWindow, status: "active" as const }
        }
        return display
      }),
    )
  }

  const toggleDisplay = (index: number) => {
    setDisplays((prev) =>
      prev.map((display, i) => {
        if (i === index) {
          if (display.windowRef && !display.windowRef.closed) {
            display.windowRef.close()
            return { ...display, windowRef: null, status: "hidden" as const }
          } else {
            const newWindow = window.open(display.url, display.name, "width=1920,height=1080")
            return { ...display, windowRef: newWindow, status: "active" as const }
          }
        }
        return display
      }),
    )
  }

  const handleSponsorLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        updateSponsorLogo(base64String)
        toast.success("Sponsor logo updated!", { position: "top-center" })
      }
      reader.readAsDataURL(file)
    }
  }

  const removeSponsorLogo = () => {
    updateSponsorLogo(null)
    toast.success("Sponsor logo removed!", { position: "top-center" })
  }

  const handleSponsorVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("[Controller] handleSponsorVideoUpload triggered")
    const file = event.target.files?.[0]
    console.log("[Controller] File selected:", file?.name, "Type:", file?.type, "Size:", file?.size)
    if (file && file.type.startsWith('video/')) {
      const reader = new FileReader()
      reader.onloadstart = () => {
        console.log("[Controller] FileReader onloadstart")
      }
      reader.onprogress = (e) => {
        console.log("[Controller] FileReader progress:", e.loaded, "/", e.total)
      }
      reader.onloadend = async () => {
        const base64String = reader.result as string
        console.log("[Controller] FileReader onloadend, base64 length:", base64String.length)
        try {
          console.log("[Controller] Calling updateSponsorVideo...")
          await updateSponsorVideo(base64String)
          console.log("[Controller] updateSponsorVideo completed successfully")
          toast.success("Sponsor video updated!", { position: "top-center" })
        } catch (error) {
          console.error("[Controller] Failed to save video:", error)
          toast.error("Failed to save video. File may be too large.", { position: "top-center" })
        }
        // Reset the input
        event.target.value = ""
      }
      reader.onerror = (error) => {
        console.error("[Controller] FileReader error:", error)
      }
      console.log("[Controller] Starting FileReader.readAsDataURL")
      reader.readAsDataURL(file)
    } else {
      console.log("[Controller] Invalid file type or no file selected")
      toast.error("Please select a valid video file!", { position: "top-center" })
      // Reset the input
      event.target.value = ""
    }
  }

  const removeSponsorVideo = async () => {
    try {
      await updateSponsorVideo(null)
      toast.success("Sponsor video removed!", { position: "top-center" })
    } catch (error) {
      console.error("Failed to remove video:", error)
      toast.error("Failed to remove video.", { position: "top-center" })
    }
  }

  const handleLightningRulesSponsorLogoUpload = (logoNumber: 1 | 2, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        updateLightningRulesSponsorLogo(logoNumber, base64String)
        toast.success(`Lightning rules sponsor logo ${logoNumber} updated!`, { position: "top-center" })
      }
      reader.readAsDataURL(file)
    }
  }

  const removeLightningRulesSponsorLogo = (logoNumber: 1 | 2) => {
    updateLightningRulesSponsorLogo(logoNumber, null)
    toast.success(`Lightning rules sponsor logo ${logoNumber} removed!`, { position: "top-center" })
  }

  // Play whoosh sound sequentially for answer boxes
  const playAnswerBoxSounds = (answerCount: number) => {
    for (let i = 0; i < answerCount; i++) {
      setTimeout(() => {
        playSound('whoosh', 0.5)
      }, i * 250) // 250ms delay between each sound
    }
  }

  // Wrapper for goToQuestionPreview that triggers sounds
  const handleGoToQuestionPreview = (index: number) => {
    goToQuestionPreview(index)
    const question = state.questions[index]
    if (question) {
      // Small delay before starting sounds to sync with animation
      setTimeout(() => {
        playAnswerBoxSounds(question.answers.length)
      }, 300)
    }
  }

  const handleResetGame = () => {
    if (showResetConfirm) {
      resetGame()
      setShowResetConfirm(false)
    } else {
      setShowResetConfirm(true)
      setTimeout(() => setShowResetConfirm(false), 3000)
    }
  }

  const getStatusColor = (status: DisplayWindow["status"]) => {
    switch (status) {
      case "active":
        return "text-green-500"
      case "error":
        return "text-red-500"
      case "hidden":
        return "text-gray-500"
    }
  }

  const openAllDisplays = () => {
    const screenWidth = window.screen.availWidth
    const screenHeight = window.screen.availHeight
    
    // Game board on left half
    const gameBoardWindow = window.open(
      displays[0].url,
      displays[0].name,
      `width=${Math.floor(screenWidth / 2)},height=${screenHeight},left=0,top=0`
    )
    
    // Team scores on right half
    const teamsWindow = window.open(
      displays[1].url,
      displays[1].name,
      `width=${Math.floor(screenWidth / 2)},height=${screenHeight},left=${Math.floor(screenWidth / 2)},top=0`
    )

    setDisplays([
      { ...displays[0], windowRef: gameBoardWindow, status: "active" },
      { ...displays[1], windowRef: teamsWindow, status: "active" },
    ])
  }

  const handleCopyRoomCode = () => {
    // Room code feature removed - single instance mode
  }

  const fallbackCopyToClipboard = (text: string) => {
    const textArea = document.createElement("textarea")
    textArea.value = text
    textArea.style.position = "fixed"
    textArea.style.left = "-999999px"
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    try {
      document.execCommand("copy")
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
    document.body.removeChild(textArea)
  }

  const teams = state.teams || []

  return (
    <div className="min-h-screen bg-gray-900 p-2 text-white sm:p-4">
      <Toaster />
      <div className="mx-auto max-w-[1800px]">
        {/* Header Bar */}
        <Card className="mb-2 bg-gray-800 p-3 sm:mb-4 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <img src="/logo.svg" alt="Popular Consensus logo" className="h-10 w-10" />
              <h1 className="font-display text-base sm:text-lg">GATE: Popular Consensus Controller</h1>
            </div>
            <div className="flex items-center gap-3 sm:gap-6">
              <InstallPWA />
              <NetworkIndicator />
            </div>
          </div>
        </Card>

        {/* Tutorial Section */}
        <Card className="mb-2 bg-gradient-to-r from-blue-900/50 to-purple-900/50 border-blue-500 p-3 sm:mb-4 sm:p-4">
          <details className="group">
            <summary className="cursor-pointer flex items-center gap-2 mb-3">
              <AlertCircle className="h-5 w-5 text-blue-400" />
              <h2 className="font-display text-sm sm:text-base font-bold text-blue-300">Setup Tutorial</h2>
              <span className="ml-auto text-blue-400 text-xs group-open:rotate-90 transition-transform">▶</span>
            </summary>
            <div className="space-y-2">
            <details className="group">
              <summary className="cursor-pointer rounded-lg bg-gray-800/50 p-3 hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-semibold text-yellow-300">Step 1: Initial Setup</span>
                </div>
              </summary>
              <div className="mt-2 ml-4 space-y-2 text-xs sm:text-sm text-gray-300">
                <p className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span><strong className="text-white">Check Internet Connection:</strong> Verify stable internet. If connection is poor, switch to offline mode by installing the PWA (use Install PWA button above) and turning off internet.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span><strong className="text-white">Upload Assets:</strong> Go to Orchestration Panel → Select relevant timeline section → Upload sponsor logos, videos, and banners → Update footer text (Survey Sample)</span>
                </p>
              </div>
            </details>

            <details className="group">
              <summary className="cursor-pointer rounded-lg bg-gray-800/50 p-3 hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-semibold text-yellow-300">Step 2: Content Verification</span>
                </div>
              </summary>
              <div className="mt-2 ml-4 space-y-2 text-xs sm:text-sm text-gray-300">
                <p className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span><strong className="text-white">Review Questions:</strong> Click "Survey Questions" or "Lightning Questions" to add/edit questions and answers.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span><strong className="text-white">Test Sound Effects:</strong> Click each sound button (Ding, Ring In, Duplicate, Wrong, Whoosh) to verify audio is working. Use Play/Stop for background music.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span><strong className="text-white">Preview Locally:</strong> Navigate through timeline sections (Welcome, Rules, Questions, Lightning) on this laptop before sharing to external displays.</span>
                </p>
              </div>
            </details>

            <details className="group">
              <summary className="cursor-pointer rounded-lg bg-gray-800/50 p-3 hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-semibold text-yellow-300">Step 3: Display Testing</span>
                </div>
              </summary>
              <div className="mt-2 ml-4 space-y-2 text-xs sm:text-sm text-gray-300">
                <p className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span><strong className="text-white">Open Displays:</strong> Click "Open All Displays" below to launch Game Board and Teams screens in new windows.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span><strong className="text-white">Verify Screens:</strong> Check that logos appear correctly on Welcome, Rules, Lightning Rules, and Ending screens.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span><strong className="text-white">Test Gameplay:</strong> Navigate through timeline, reveal answers, test strikes, and verify team scores update on both Game Board and Teams displays.</span>
                </p>
              </div>
            </details>

            <details className="group">
              <summary className="cursor-pointer rounded-lg bg-gray-800/50 p-3 hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-semibold text-yellow-300">Step 4: Go Live</span>
                </div>
              </summary>
              <div className="mt-2 ml-4 space-y-2 text-xs sm:text-sm text-gray-300">
                <p className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span><strong className="text-white">Position Displays:</strong> Drag display windows to external monitors/projectors and press F for fullscreen.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span><strong className="text-white">Start Game:</strong> Begin with Welcome screen, then navigate through timeline using Orchestration Panel.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span><strong className="text-white">Control Gameplay:</strong> Use buttons to reveal answers, manage strikes, play sounds, and control the lightning round timer.</span>
                </p>
              </div>
            </details>
          </div>
          <div className="mt-3 p-2 bg-yellow-900/30 border border-yellow-600/50 rounded text-xs text-yellow-200">
            <strong>💡 Pro Tip:</strong> Always test everything locally before displaying to audience. Use the eye icons below to hide/show displays during setup.
          </div>
          </details>
        </Card>

        {/* Display Status */}
        <Card className="mb-2 bg-gray-800 p-3 sm:mb-4 sm:p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-display text-xs sm:text-sm">Display Status</h2>
            <div className="flex flex-wrap gap-2">
              <Button onClick={openAllDisplays} variant="default" size="sm" className="flex-1 text-xs sm:flex-none">
                <ExternalLink className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Open All Displays</span>
                <span className="sm:hidden">All</span>
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {displays.map((display, index) => (
              <motion.div
                key={display.name}
                whileHover={{ scale: 1.02 }}
                className="flex items-center justify-between rounded-lg bg-gray-700 p-2 sm:p-3"
              >
                <div className="flex items-center gap-1 sm:gap-2">
                  <Monitor className={`h-3 w-3 sm:h-4 sm:w-4 ${getStatusColor(display.status)}`} />
                  <div>
                    <div className="text-xs font-semibold">{display.name}</div>
                    <div className="hidden text-xs capitalize text-gray-400 sm:block">{display.status}</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  {display.status === "hidden" && (
                    <Button
                      onClick={() => openDisplay(index)}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 sm:h-8 sm:w-8"
                      title="Open in new window"
                    >
                      <ExternalLink className="h-3 w-3 text-blue-400 sm:h-4 sm:w-4" />
                    </Button>
                  )}
                  <Button
                    onClick={() => toggleDisplay(index)}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 sm:h-8 sm:w-8"
                    title={display.status === "hidden" ? "Show display" : "Hide display"}
                  >
                    {display.status === "hidden" ? (
                      <EyeOff className="h-3 w-3 text-gray-500 sm:h-4 sm:w-4" />
                    ) : (
                      <Eye className={`h-3 w-3 sm:h-4 sm:w-4 ${getStatusColor(display.status)}`} />
                    )}
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>

        {/* Game Orchestration Panel */}
        <div className="mb-2 sm:mb-4">
          <OrchestrationPanel
            orchestration={state.orchestration}
            questionCount={state.questions.length}
            questions={state.questions}
            currentQuestion={state.currentQuestion}
            onGoToWelcome={goToWelcome}
            onGoToRules={goToRules}
            onGoToQuestionPreview={handleGoToQuestionPreview}
            onRevealQuestion={revealQuestionPrompt}
            onGoToSponsorVideo={goToSponsorVideo}
            onPlaySponsorVideo={playSponsorVideo}
            onPauseSponsorVideo={pauseSponsorVideo}
            onStopSponsorVideo={stopSponsorVideo}
            onGoToLightningRound={goToLightningRound}
            onGoToLightningRoundRules={goToLightningRoundRules}
            currentQuestionIndex={state.currentQuestionIndex}
            onRevealAnswer={revealAnswer}
            onRevealAllAnswers={revealAllAnswers}
            onHideAllAnswers={hideAllAnswers}
            onAddQuestion={addQuestion}
            onUpdateQuestion={updateQuestion}
            onDeleteQuestion={deleteQuestion}
            onPlaySound={playSound}
            sponsorLogo={state.sponsorLogo}
            onSponsorLogoUpload={handleSponsorLogoUpload}
            onRemoveSponsorLogo={removeSponsorLogo}
            hasSponsorVideo={state.hasSponsorVideo}
            onSponsorVideoUpload={handleSponsorVideoUpload}
            onRemoveSponsorVideo={removeSponsorVideo}
            surveyFooterTexts={state.surveyFooterTexts}
            onFooterTextChange={updateFooterText}
            showSurveyTotals={state.showSurveyTotals}
            onToggleSurveyTotals={toggleSurveyTotals}
            lightningRound={state.lightningRound}
            onUpdateLightningQuestion={updateLightningRoundQuestion}
            onUpdateLightningContestantName={updateLightningContestantName}
            onUpdateLightningAnswer={updateLightningAnswer}
            onRevealLightningAnswer={revealLightningAnswer}
            onToggleLightningPoints={toggleLightningPoints}
            onRevealAllLightningAnswers={revealAllLightningAnswers}
            onHideAllLightningAnswers={hideAllLightningAnswers}
            onStartLightningTimer={startLightningTimer}
            onStopLightningTimer={stopLightningTimer}
            onToggleLightningTimerVisibility={toggleLightningTimerVisibility}
            onResetLightningRound={resetLightningRound}
            chibiImage={state.chibiImage}
            onChibiImageChange={updateChibiImage}
            sponsorName={state.sponsorName}
            onSponsorNameChange={updateSponsorName}
            lightningRulesSponsorLogo1={state.lightningRulesSponsorLogo1}
            lightningRulesSponsorLogo2={state.lightningRulesSponsorLogo2}
            onLightningRulesSponsorLogoUpload={handleLightningRulesSponsorLogoUpload}
            onRemoveLightningRulesSponsorLogo={removeLightningRulesSponsorLogo}
            onGoToEnding={goToEnding}
            teams={teams}
            onUpdateScore={updateScore}
            onTriggerWrongAnswer={triggerWrongAnswer}
            onAddStrike={addStrike}
            soundEffects={soundEffects}
            playingSound={playingSound}
            currentBackgroundMusic={currentBackgroundMusic}
            onPlayBackgroundMusic={(type) => {
              // Stop any currently playing music
              if (introMusicRef.current) {
                introMusicRef.current.pause()
                introMusicRef.current.currentTime = 0
              }
              setIntroMusicPlaying(false)
              setCurrentBackgroundMusic(null)
              
              // Play selected music
              const audio = new Audio(`/sounds/${type === "intro" ? "intro-music.wav" : "excitement.wav"}`)
              introMusicRef.current = audio
              audio.play()
              setIntroMusicPlaying(true)
              setCurrentBackgroundMusic(type)
              audio.onended = () => {
                setIntroMusicPlaying(false)
                setCurrentBackgroundMusic(null)
              }
            }}
            onStopBackgroundMusic={() => {
              // Stop intro music
              if (introMusicRef.current) {
                introMusicRef.current.pause()
                introMusicRef.current.currentTime = 0
              }
              setIntroMusicPlaying(false)
              setCurrentBackgroundMusic(null)
            }}
            episodes={episodes}
            currentEpisodeName={currentEpisodeName}
            onSaveEpisode={saveEpisode}
            onLoadEpisode={loadEpisode}
            onRenameEpisode={renameEpisode}
            onDeleteEpisode={deleteEpisode}
          />
        </div>

        {/* Team Scores - Full Width */}
        <div className="mb-2 grid grid-cols-1 gap-2 sm:mb-4 sm:gap-4 lg:grid-cols-12">
          <div className="lg:col-span-12">
            <Card className="bg-gray-800/50 p-4 sm:p-6">
              <h2 className="mb-3 font-display text-xs sm:mb-4 sm:text-sm">Team Scores</h2>
              <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            {teams.map((team) => (
              <div
                key={team.id}
                className="group relative overflow-hidden rounded-xl border border-gray-700/50 p-3 transition-all hover:border-gray-600 sm:p-4"
              >
                <div className="mb-3 text-center">
                  <AnimatedNumber value={team.score} color={team.color} size="medium" />
                  <div className="mt-1 text-xs text-emerald-400">Round: +{formatScore(team.currentRoundScore)}</div>
                </div>

                <Input
                  value={team.name}
                  onChange={(e) => updateTeamName(team.id, e.target.value)}
                  className="mb-3 border-0 bg-transparent text-center text-xs font-medium text-white placeholder:text-gray-500 focus-visible:ring-1 focus-visible:ring-gray-600"
                  placeholder={`Team ${team.id}`}
                />

                <div className="mb-3 space-y-1">
                  <div className="flex flex-wrap justify-center gap-1">
                    {Object.values(themes).map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => updateTeamTheme(team.id, theme.id)}
                        className={`rounded-full px-2 py-1 text-xs transition-all ${
                          team.theme === theme.id
                            ? "bg-blue-500 text-white"
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        }`}
                      >
                        {theme.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <div className="text-sm font-medium text-gray-400">Strikes</div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => addTeamStrike(team.id)}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                      style={{ backgroundColor: "#374151" }}
                      disabled={team.strikes >= 3}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <span className="text-xl font-bold text-red-400">{team.strikes}</span>
                    <Button
                      onClick={() => resetTeamStrikes(team.id)}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-gray-400 hover:text-gray-300"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5 transition-all group-hover:h-1"
                  style={{ backgroundColor: team.color }}
                />
              </div>
            ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Game Actions */}
        <div className="grid grid-cols-1 gap-2 sm:gap-4 lg:grid-cols-12">
          <div className="lg:col-span-12">
            <Card className="bg-gray-800 p-3 sm:p-4">
              <h2 className="mb-3 font-display text-xs sm:mb-4 sm:text-sm">Game Actions</h2>
              <div className="space-y-2">
                <Button
                  onClick={handleResetGame}
                  variant={showResetConfirm ? "destructive" : "outline"}
                  className="w-full text-xs"
                >
                  <RotateCcw className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  {showResetConfirm ? "Confirm Reset?" : "Reset Game"}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

