"use client"

import { useState, useEffect, useRef } from "react"
import { motion, useSpring, useTransform } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Eye, EyeOff, Zap, Users, Timer, Play, Square, RotateCcw } from "lucide-react"
import type { LightningRoundState } from "@/hooks/use-game-state"

interface LightningRoundControllerProps {
  lightningRound: LightningRoundState
  onUpdateQuestion: (index: number, text: string) => void
  onUpdateContestantName: (contestant: 1 | 2, name: string) => void
  onUpdateAnswer: (contestant: 1 | 2, answerIndex: number, text: string, points: number) => void
  onRevealAnswer: (contestant: 1 | 2, answerIndex: number) => void
  onHideAnswer: (contestant: 1 | 2, answerIndex: number) => void
  onTogglePoints: (contestant: 1 | 2, answerIndex: number) => void
  onRevealAllAnswers: (contestant: 1 | 2) => void
  onHideAllAnswers: (contestant: 1 | 2) => void
  onPlaySound: (type: "ding" | "buzz" | "buzzer" | "duplicate" | "whoosh" | "answer-reveal" | "point-reveal") => void
  onStartTimer: (seconds: number) => void
  onStopTimer: () => void
  onToggleTimerVisibility: () => void
  onResetLightningRound: () => void
}

function AnimatedPoints({ value, revealed }: { value: number; revealed: boolean }) {
  const spring = useSpring(0, { duration: 1000 })
  const display = useTransform(spring, (current) => Math.round(current))
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const unsubscribe = display.onChange(setDisplayValue)
    return unsubscribe
  }, [display])

  useEffect(() => {
    if (revealed) {
      spring.set(value)
    } else {
      spring.set(0)
    }
  }, [value, revealed, spring])

  return (
    <p className="text-3xl font-black text-yellow-300">
      {revealed ? displayValue : "---"}
    </p>
  )
}

export function LightningRoundController({
  lightningRound,
  onUpdateQuestion,
  onUpdateContestantName,
  onUpdateAnswer,
  onRevealAnswer,
  onHideAnswer,
  onTogglePoints,
  onRevealAllAnswers,
  onHideAllAnswers,
  onPlaySound,
  onStartTimer,
  onStopTimer,
  onToggleTimerVisibility,
  onResetLightningRound,
}: LightningRoundControllerProps) {
  const [customTimerValue, setCustomTimerValue] = useState("25")
  const revealTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (revealTimeoutRef.current) {
        clearTimeout(revealTimeoutRef.current)
      }
    }
  }, [])

  const handleSequentialReveal = (contestant: 1 | 2) => {
    const contestantData = contestant === 1 ? lightningRound.contestant1 : lightningRound.contestant2
    const answers = contestantData.answers
    
    // Reveal answers sequentially with sound
    let currentIndex = 0
    
    const revealNext = () => {
      if (currentIndex < answers.length) {
        // Play whoosh sound in controller
        onPlaySound("whoosh")
        
        // Reveal the answer
        onRevealAnswer(contestant, currentIndex)
        
        currentIndex++
        
        // Schedule next reveal after 400ms
        revealTimeoutRef.current = setTimeout(revealNext, 400)
      }
    }
    
    // Start revealing after a small delay
    setTimeout(revealNext, 300)
  }

  const contestant1 = lightningRound.contestant1
  const contestant2 = lightningRound.contestant2
  const allAnswersRevealed1 = contestant1.answers.every(a => a.revealed)
  const allAnswersRevealed2 = contestant2.answers.every(a => a.revealed)
  const anyAnswerRevealed1 = contestant1.answers.some(a => a.revealed)
  const anyAnswerRevealed2 = contestant2.answers.some(a => a.revealed)

  return (
    <div className="space-y-4">
      {/* Timer Controls */}
      <Card className="bg-blue-900/30 border-blue-600 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Timer className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-bold">Timer Controls</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Button
            onClick={() => onStartTimer(25)}
            variant="outline"
            size="sm"
            className="text-sm"
            disabled={lightningRound.timerActive}
          >
            <Play className="mr-2 h-4 w-4" />
            25 Seconds
          </Button>
          <Button
            onClick={() => onStartTimer(30)}
            variant="outline"
            size="sm"
            className="text-sm"
            disabled={lightningRound.timerActive}
          >
            <Play className="mr-2 h-4 w-4" />
            30 Seconds
          </Button>
        </div>
        
        <div className="flex gap-2 mb-3">
          <Input
            type="number"
            value={customTimerValue}
            onChange={(e) => setCustomTimerValue(e.target.value)}
            placeholder="Custom seconds"
            className="bg-gray-800 border-gray-600 text-white text-sm flex-1"
            min="1"
            max="120"
          />
          <Button
            onClick={() => onStartTimer(parseInt(customTimerValue) || 25)}
            variant="outline"
            size="sm"
            disabled={lightningRound.timerActive}
          >
            <Play className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={onStopTimer}
            variant="destructive"
            size="sm"
            className="flex-1"
            disabled={!lightningRound.timerActive}
          >
            <Square className="mr-2 h-4 w-4" />
            Stop Timer
          </Button>
          <Button
            onClick={onToggleTimerVisibility}
            variant={lightningRound.showTimer ? "secondary" : "outline"}
            size="sm"
            className="flex-1"
          >
            {lightningRound.showTimer ? (
              <>
                <EyeOff className="mr-2 h-4 w-4" />
                Hide
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Show
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Two Column Layout for Contestants */}
      <div className="grid grid-cols-2 gap-4">
        {/* Contestant 1 Column */}
        <Card className="bg-gray-700/50 border-gray-600 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-bold">Contestant 1</h3>
          </div>

          {/* Contestant Name */}
          <div className="mb-3">
            <Input
              value={contestant1.name}
              onChange={(e) => onUpdateContestantName(1, e.target.value)}
              placeholder="Contestant 1 Name"
              className="bg-gray-800 border-gray-600 text-white font-bold text-center"
            />
          </div>

          {/* Total Points Display */}
          <div className="mb-3 rounded-lg border-2 border-yellow-400 bg-gradient-to-r from-orange-600 to-red-600 p-2 text-center">
            <p className="text-xs font-bold text-white mb-1">TOTAL POINTS</p>
            <AnimatedPoints value={contestant1.totalPoints} revealed={anyAnswerRevealed1} />
          </div>

          {/* Reveal All Button */}
          <Button
            onClick={() => {
              if (allAnswersRevealed1) {
                onHideAllAnswers(1)
              } else {
                handleSequentialReveal(1)
              }
            }}
            variant="default"
            className="w-full mb-3"
            size="sm"
          >
            {allAnswersRevealed1 ? (
              <>
                <EyeOff className="mr-2 h-4 w-4" />
                Hide All Answers
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Reveal All Answers
              </>
            )}
          </Button>

          {/* Answers */}
          <div className="space-y-2">
            {contestant1.answers.map((answer, index) => (
              <div
                key={answer.id}
                className={`rounded-lg border-2 p-2 ${
                  answer.revealed 
                    ? "bg-green-900/50 border-green-500" 
                    : "bg-gray-800 border-gray-600"
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold">
                    {index + 1}
                  </span>
                  <span className="text-xs text-gray-400 truncate">
                    Q: {lightningRound.questions[index]}
                  </span>
                </div>
                
                <div className="grid grid-cols-[1fr,auto] gap-2 mb-2">
                  <Input
                    value={answer.text}
                    onChange={(e) => onUpdateAnswer(1, index, e.target.value, answer.points)}
                    placeholder="Answer..."
                    className="bg-gray-900 border-gray-700 text-white text-xs h-8"
                  />
                  <Input
                    type="number"
                    value={answer.points}
                    onChange={(e) => onUpdateAnswer(1, index, answer.text, parseInt(e.target.value) || 0)}
                    placeholder="Pts"
                    min="0"
                    max="5"
                    className="w-16 bg-gray-900 border-gray-700 text-yellow-400 font-bold text-xs h-8"
                  />
                </div>
                
                {/* Control Buttons */}
                <div className="flex gap-1">
                  <Button
                    onClick={() => {
                      if (answer.revealed) {
                        onHideAnswer(1, index)
                      } else {
                        onRevealAnswer(1, index)
                        onPlaySound("answer-reveal")
                      }
                    }}
                    variant={answer.revealed ? "secondary" : "default"}
                    size="sm"
                    className="flex-1 h-7 text-xs"
                  >
                    {answer.revealed ? (
                      <>
                        <EyeOff className="mr-1 h-3 w-3" />
                        Hide
                      </>
                    ) : (
                      <>
                        <Eye className="mr-1 h-3 w-3" />
                        Reveal
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      onTogglePoints(1, index)
                      if (!answer.pointsRevealed) {
                        onPlaySound("point-reveal")
                      }
                    }}
                    variant={answer.pointsRevealed ? "secondary" : "outline"}
                    size="sm"
                    className="flex-1 h-7 text-xs"
                    disabled={!answer.revealed}
                  >
                    {answer.pointsRevealed ? "Hide Pts" : "Show Pts"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Contestant 2 Column */}
        <Card className="bg-gray-700/50 border-gray-600 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-400" />
            <h3 className="text-lg font-bold">Contestant 2</h3>
          </div>

          {/* Contestant Name */}
          <div className="mb-3">
            <Input
              value={contestant2.name}
              onChange={(e) => onUpdateContestantName(2, e.target.value)}
              placeholder="Contestant 2 Name"
              className="bg-gray-800 border-gray-600 text-white font-bold text-center"
            />
          </div>

          {/* Total Points Display */}
          <div className="mb-3 rounded-lg border-2 border-yellow-400 bg-gradient-to-r from-orange-600 to-red-600 p-2 text-center">
            <p className="text-xs font-bold text-white mb-1">TOTAL POINTS</p>
            <AnimatedPoints value={contestant2.totalPoints} revealed={anyAnswerRevealed2} />
          </div>

          {/* Reveal All Button */}
          <Button
            onClick={() => {
              if (allAnswersRevealed2) {
                onHideAllAnswers(2)
              } else {
                handleSequentialReveal(2)
              }
            }}
            variant="default"
            className="w-full mb-3"
            size="sm"
          >
            {allAnswersRevealed2 ? (
              <>
                <EyeOff className="mr-2 h-4 w-4" />
                Hide All Answers
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Reveal All Answers
              </>
            )}
          </Button>

          {/* Answers */}
          <div className="space-y-2">
            {contestant2.answers.map((answer, index) => (
              <div
                key={answer.id}
                className={`rounded-lg border-2 p-2 ${
                  answer.revealed 
                    ? "bg-green-900/50 border-green-500" 
                    : "bg-gray-800 border-gray-600"
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-purple-600 text-xs font-bold">
                    {index + 1}
                  </span>
                  <span className="text-xs text-gray-400 truncate">
                    Q: {lightningRound.questions[index]}
                  </span>
                </div>
                
                <div className="grid grid-cols-[1fr,auto] gap-2 mb-2">
                  <Input
                    value={answer.text}
                    onChange={(e) => onUpdateAnswer(2, index, e.target.value, answer.points)}
                    placeholder="Answer..."
                    className="bg-gray-900 border-gray-700 text-white text-xs h-8"
                  />
                  <Input
                    type="number"
                    value={answer.points}
                    onChange={(e) => onUpdateAnswer(2, index, answer.text, parseInt(e.target.value) || 0)}
                    placeholder="Pts"
                    min="0"
                    max="5"
                    className="w-16 bg-gray-900 border-gray-700 text-yellow-400 font-bold text-xs h-8"
                  />
                </div>
                
                {/* Control Buttons */}
                <div className="flex gap-1">
                  <Button
                    onClick={() => {
                      if (answer.revealed) {
                        onHideAnswer(2, index)
                      } else {
                        onRevealAnswer(2, index)
                        onPlaySound("answer-reveal")
                      }
                    }}
                    variant={answer.revealed ? "secondary" : "default"}
                    size="sm"
                    className="flex-1 h-7 text-xs"
                  >
                    {answer.revealed ? (
                      <>
                        <EyeOff className="mr-1 h-3 w-3" />
                        Hide
                      </>
                    ) : (
                      <>
                        <Eye className="mr-1 h-3 w-3" />
                        Reveal
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      onTogglePoints(2, index)
                      if (!answer.pointsRevealed) {
                        onPlaySound("point-reveal")
                      }
                    }}
                    variant={answer.pointsRevealed ? "secondary" : "outline"}
                    size="sm"
                    className="flex-1 h-7 text-xs"
                    disabled={!answer.revealed}
                  >
                    {answer.pointsRevealed ? "Hide Pts" : "Show Pts"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Reset Button */}
      <Card className="bg-red-900/20 border-red-600/50 p-3">
        <Button
          onClick={onResetLightningRound}
          variant="destructive"
          className="w-full"
          size="sm"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset Lightning Round
        </Button>
        <p className="text-xs text-red-200 mt-2 text-center">
          Resets all answers, points, and reveals back to default state
        </p>
      </Card>

      {/* Instructions */}
      <Card className="bg-yellow-900/20 border-yellow-600/50 p-3">
        <p className="text-xs text-yellow-200">
          <strong>Point System:</strong> #1 answer = 5pts, #2 = 4pts, #3 = 3pts, #4 = 2pts, #5 = 1pt
          <br />
          <strong>Workflow:</strong> Enter all answers and points, then click "Reveal All Answers" for dramatic sequential reveal with whoosh sounds.
        </p>
      </Card>
    </div>
  )
}
