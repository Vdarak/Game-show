"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  Play, 
  Eye,
  EyeOff,
  FileText, 
  Video, 
  Zap,
  Check,
  Circle,
  Home,
  ChevronRight,
  Settings,
  Flag,
  Plus,
  Trash2,
  Edit2,
  Save,
  X
} from "lucide-react"
import type { MacroState, MicroState, OrchestrationState, Question } from "@/hooks/use-game-state"

interface OrchestrationPanelProps {
  orchestration: OrchestrationState
  questionCount: number
  questions: Question[]
  currentQuestion: Question | null
  onGoToWelcome: () => void
  onGoToRules: () => void
  onGoToQuestionPreview: (index: number) => void
  onRevealQuestion: () => void
  onPlaySponsorVideo: (url: string) => void
  onGoToLightningRound: () => void
  currentQuestionIndex: number
  onRevealAnswer: (answerId: string) => void
  onRevealAllAnswers: () => void
  onHideAllAnswers: () => void
  onAddQuestion: (question: any) => void
  onUpdateQuestion: (id: string, question: any) => void
  onDeleteQuestion: (id: string) => void
  onPlaySound: (type: "ding" | "buzz" | "buzzer" | "duplicate") => void
  sponsorLogo: string | null
  onSponsorLogoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveSponsorLogo: () => void
  footerText: string
  onFooterTextChange: (text: string) => void
  showSurveyTotals: boolean
  onToggleSurveyTotals: () => void
}

type TimelineState = "welcome" | "rules" | "question" | "lightning" | "ending"

export function OrchestrationPanel({
  orchestration,
  questionCount,
  questions,
  currentQuestion,
  onGoToWelcome,
  onGoToRules,
  onGoToQuestionPreview,
  onRevealQuestion,
  onPlaySponsorVideo,
  onGoToLightningRound,
  currentQuestionIndex,
  onRevealAnswer,
  onRevealAllAnswers,
  onHideAllAnswers,
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onPlaySound,
  sponsorLogo,
  onSponsorLogoUpload,
  onRemoveSponsorLogo,
  footerText,
  onFooterTextChange,
  showSurveyTotals,
  onToggleSurveyTotals,
}: OrchestrationPanelProps) {
  const [selectedTimeline, setSelectedTimeline] = useState<TimelineState | null>(null)
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null)
  const [sponsorVideoUrl, setSponsorVideoUrl] = useState("")
  
  // Question manager state
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [questionText, setQuestionText] = useState("")
  const [answers, setAnswers] = useState<Array<{ text: string; points: number }>>([
    { text: "", points: 0 },
    { text: "", points: 0 },
    { text: "", points: 0 },
    { text: "", points: 0 },
    { text: "", points: 0 },
    { text: "", points: 0 },
    { text: "", points: 0 },
    { text: "", points: 0 },
    { text: "", points: 0 },
    { text: "", points: 0 },
  ])

  // Sync selectedQuestionIndex with currentQuestionIndex when in question mode
  useEffect(() => {
    if (orchestration.macroState === "questions") {
      setSelectedTimeline("question")
      setSelectedQuestionIndex(currentQuestionIndex)
    }
  }, [currentQuestionIndex, orchestration.macroState])

  // Question manager functions
  const handleEdit = (question: Question) => {
    setEditingId(question.id)
    setQuestionText(question.text)
    setAnswers(question.answers.map(a => ({ text: a.text, points: a.points })))
  }

  const handleSaveQuestion = () => {
    const questionData = {
      text: questionText,
      answers: answers
        .filter(a => a.text.trim() !== "")
        .map((a, i) => ({
          id: String(i + 1),
          text: a.text,
          points: a.points,
          revealed: false,
        })),
    }

    if (editingId) {
      onUpdateQuestion(editingId, questionData)
    } else {
      onAddQuestion(questionData)
    }

    handleCancelEdit()
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setQuestionText("")
    setAnswers([
      { text: "", points: 0 },
      { text: "", points: 0 },
      { text: "", points: 0 },
      { text: "", points: 0 },
      { text: "", points: 0 },
      { text: "", points: 0 },
      { text: "", points: 0 },
      { text: "", points: 0 },
      { text: "", points: 0 },
      { text: "", points: 0 },
    ])
  }

  const handleDeleteQuestion = (id: string) => {
    if (confirm("Are you sure you want to delete this question?")) {
      onDeleteQuestion(id)
    }
  }

  const updateAnswer = (index: number, field: "text" | "points", value: string | number) => {
    const newAnswers = [...answers]
    if (field === "text") {
      newAnswers[index].text = value as string
    } else {
      newAnswers[index].points = Number(value)
    }
    setAnswers(newAnswers)
  }

  const getTimelineStates = () => {
    const states = [
      { id: "welcome", label: "Welcome", icon: Home },
      { id: "rules", label: "Rules", icon: FileText },
    ]
    
    for (let i = 0; i < questionCount; i++) {
      states.push({
        id: `question-${i}`,
        label: `Survey Q${i + 1}`,
        icon: Play,
      })
    }
    
    states.push(
      { id: "lightning", label: "Lightning Round", icon: Zap },
      { id: "ending", label: "Ending", icon: Flag }
    )
    
    return states
  }

  const getStateStatus = (stateId: string) => {
    if (stateId === "welcome" && orchestration.macroState === "welcome") return "active"
    if (stateId === "rules" && orchestration.macroState === "rules") return "active"
    if (stateId === "lightning" && orchestration.macroState === "lightning-round") return "active"
    if (stateId === "ending" && orchestration.macroState === "final") return "active"
    if (stateId.startsWith("question-")) {
      const index = parseInt(stateId.split("-")[1])
      if (orchestration.macroState === "questions" && orchestration.currentQuestionInFlow === index) {
        return "active"
      }
      if (orchestration.currentQuestionInFlow > index) return "completed"
    }
    return "inactive"
  }

  const handleTimelineClick = (stateId: string) => {
    if (stateId === "welcome") {
      onGoToWelcome()
      setSelectedTimeline("welcome")
      setSelectedQuestionIndex(null)
    } else if (stateId === "rules") {
      onGoToRules()
      setSelectedTimeline("rules")
      setSelectedQuestionIndex(null)
    } else if (stateId === "lightning") {
      onGoToLightningRound()
      setSelectedTimeline("lightning")
      setSelectedQuestionIndex(null)
    } else if (stateId === "ending") {
      setSelectedTimeline("ending")
      setSelectedQuestionIndex(null)
    } else if (stateId.startsWith("question-")) {
      const index = parseInt(stateId.split("-")[1])
      onGoToQuestionPreview(index)
      setSelectedTimeline("question")
      setSelectedQuestionIndex(index)
    }
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questionCount - 1) {
      onGoToQuestionPreview(currentQuestionIndex + 1)
      setSelectedQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const handlePlaySponsorVideoAndNext = () => {
    if (sponsorVideoUrl) {
      onPlaySponsorVideo(sponsorVideoUrl)
      setTimeout(() => {
        handleNextQuestion()
      }, 500)
    }
  }

  const timelineStates = getTimelineStates()

  return (
    <Card className="bg-gray-800 p-4">
      {/* Header with Sponsor Logo and Question Manager */}
      <div className="mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Game Orchestration</h2>
          
          <Dialog open={isQuestionDialogOpen} onOpenChange={setIsQuestionDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="default" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Manage Questions
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-800 text-white border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-2xl font-display">Question Manager</DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Question List */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Existing Questions</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {questions.map((question, idx) => (
                      <motion.div
                        key={question.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between gap-2 rounded-lg bg-gray-700 p-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">Q{idx + 1}: {question.text}</div>
                          <div className="text-xs text-gray-400">
                            {question.answers.length} answers
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleEdit(question)}
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteQuestion(question.id)}
                            variant="destructive"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Add/Edit Form */}
                <div className="space-y-4 border-t border-gray-700 pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      {editingId ? "Edit Question" : "Add New Question"}
                    </h3>
                    {editingId && (
                      <Button onClick={handleCancelEdit} variant="ghost" size="sm">
                        <X className="mr-2 h-4 w-4" />
                        Cancel Edit
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Question Text</label>
                      <Input
                        value={questionText}
                        onChange={(e) => setQuestionText(e.target.value)}
                        placeholder="Enter your question..."
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Answers (up to 10)</label>
                      <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                        {answers.map((answer, index) => (
                          <div key={index} className="flex gap-2 items-center">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-600 text-xs font-bold">
                              {index + 1}
                            </div>
                            <Input
                              value={answer.text}
                              onChange={(e) => updateAnswer(index, "text", e.target.value)}
                              placeholder={`Answer ${index + 1}`}
                              className="flex-1 bg-gray-700 border-gray-600 text-white text-sm"
                            />
                            <Input
                              type="number"
                              value={answer.points}
                              onChange={(e) => updateAnswer(index, "points", e.target.value)}
                              placeholder="Points"
                              className="w-24 bg-gray-700 border-gray-600 text-white text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button
                      onClick={handleSaveQuestion}
                      variant="default"
                      className="w-full"
                      disabled={!questionText.trim() || answers.filter(a => a.text.trim()).length === 0}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {editingId ? "Update Question" : "Add Question"}
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Sponsor Logo Section */}
        {sponsorLogo && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50 border border-gray-600">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-24 rounded border border-gray-600 bg-gray-700 p-1">
                <img
                  src={sponsorLogo}
                  alt="Sponsor Logo"
                  className="h-full w-full object-contain"
                />
              </div>
              <span className="text-xs text-gray-400">Sponsor Logo</span>
            </div>
            <div className="flex gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={onSponsorLogoUpload}
                  className="hidden"
                />
                <Button variant="outline" size="sm" className="text-xs" asChild>
                  <div>Change</div>
                </Button>
              </label>
              <Button
                onClick={onRemoveSponsorLogo}
                variant="outline"
                size="sm"
                className="text-xs text-red-400 hover:text-red-300"
              >
                Remove
              </Button>
            </div>
          </div>
        )}
        {!sponsorLogo && (
          <div className="flex items-center justify-center p-3 rounded-lg bg-gray-700/50 border border-gray-600">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={onSponsorLogoUpload}
                className="hidden"
              />
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Plus className="h-4 w-4" />
                <span>Upload Sponsor Logo</span>
              </div>
            </label>
          </div>
        )}
      </div>

      {/* Horizontal Timeline */}
      <div className="relative mb-6 -mx-4 px-6 py-4">
        <div className="flex items-center justify-between pb-2 min-h-[120px]" style={{ scrollbarWidth: 'thin' }}>
          {timelineStates.map((state, index) => {
            const status = getStateStatus(state.id)
            const Icon = state.icon
            const connectorColor = status === "completed" || status === "active" ? "bg-blue-500" : "bg-gray-600"
            
            return (
              <div key={state.id} className="flex items-center flex-1">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleTimelineClick(state.id)}
                  className={`relative flex flex-col items-center justify-center rounded-lg border-2 p-4 transition-all w-full ${
                    status === "active"
                      ? "border-green-500 bg-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.5)]"
                      : status === "completed"
                      ? "border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                      : "border-gray-600 bg-gray-700/50 hover:bg-gray-700"
                  }`}
                >
                  {/* Status Indicator */}
                  <div className="absolute -top-2 -right-2 z-10">
                    {status === "completed" && (
                      <div className="rounded-full bg-blue-500 p-1">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                    {status === "active" && (
                      <div className="rounded-full bg-green-500 p-1 animate-pulse">
                        <Circle className="h-3 w-3 text-white fill-white" />
                      </div>
                    )}
                  </div>

                  <Icon className={`h-6 w-6 mb-2 ${
                    status === "active" ? "text-green-400" : status === "completed" ? "text-blue-400" : "text-gray-400"
                  }`} />
                  <span className={`text-xs font-medium text-center ${
                    status === "active" ? "text-green-300" : status === "completed" ? "text-blue-300" : "text-gray-400"
                  }`}>
                    {state.label}
                  </span>
                </motion.button>

                {/* Connector Line */}
                {index < timelineStates.length - 1 && (
                  <div className={`h-1 w-full mx-2 transition-all duration-300 ${connectorColor}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Controls Area */}
      <AnimatePresence mode="wait">
        {selectedTimeline === "question" && selectedQuestionIndex !== null && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* Current Question Display */}
            {currentQuestion && (
              <div className="rounded-lg bg-gray-700/50 border border-gray-600 p-4">
                <div className="flex flex-col gap-3 mb-3">
                  <div>
                    <div className="text-xs text-gray-400">Survey Question {selectedQuestionIndex + 1}</div>
                    <div className="font-display text-sm font-semibold mt-1">{currentQuestion.text}</div>
                  </div>
                  
                  {/* Control Buttons Row */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={onRevealQuestion}
                      size="sm"
                      variant={orchestration.microState === "reveal-question" || orchestration.microState === "playing" ? "default" : "default"}
                      className="text-xs"
                      disabled={orchestration.microState === "reveal-question" || orchestration.microState === "playing"}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      {orchestration.microState === "reveal-question" || orchestration.microState === "playing" ? "Question Revealed" : "Reveal Question"}
                    </Button>
                    
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-md border border-gray-600">
                      <span className="text-xs text-gray-400">Survey Totals:</span>
                      <Button 
                        onClick={onToggleSurveyTotals} 
                        variant={showSurveyTotals ? "default" : "outline"} 
                        size="sm" 
                        className="h-7 px-2 text-xs"
                      >
                        {showSurveyTotals ? <><Eye className="h-3 w-3 mr-1" />On</> : <><EyeOff className="h-3 w-3 mr-1" />Off</>}
                      </Button>
                    </div>

                    <div className="flex gap-2 ml-auto">
                      <Button 
                        onClick={onRevealAllAnswers} 
                        variant="secondary" 
                        size="sm" 
                        className="text-xs"
                        disabled={orchestration.microState === "preview"}
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        Reveal All
                      </Button>
                      <Button 
                        onClick={onHideAllAnswers} 
                        variant="secondary" 
                        size="sm" 
                        className="text-xs"
                        disabled={orchestration.microState === "preview"}
                      >
                        <EyeOff className="mr-1 h-3 w-3" />
                        Hide All
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Answer Controls */}
                <div className="space-y-2">
                  {/* Answers Grid */}
                  {currentQuestion.answers.length < 6 ? (
                    <div className="flex flex-col gap-2">
                      {currentQuestion.answers.map((answer, index) => (
                        <motion.button
                          key={answer.id}
                          whileHover={orchestration.microState !== "preview" ? { scale: 1.02 } : {}}
                          whileTap={orchestration.microState !== "preview" ? { scale: 0.98 } : {}}
                          disabled={orchestration.microState === "preview"}
                          className={`flex items-center justify-between gap-2 rounded-lg p-2 transition-colors text-left ${
                            orchestration.microState === "preview" 
                              ? "bg-gray-800 opacity-50 cursor-not-allowed"
                              : answer.revealed 
                                ? "bg-green-600" 
                                : "bg-gray-700 hover:bg-gray-600"
                          }`}
                          onClick={() => {
                            if (orchestration.microState === "preview") return
                            if (!answer.revealed) {
                              onPlaySound("ding")
                            }
                            onRevealAnswer(answer.id)
                          }}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-800 font-display text-xs">
                              {index + 1}
                            </div>
                            <div className="text-xs font-semibold truncate">{answer.text}</div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="font-display text-xs text-yellow-400">{answer.points}</div>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (orchestration.microState === "preview") return
                                if (!answer.revealed) {
                                  onPlaySound("ding")
                                }
                                onRevealAnswer(answer.id)
                              }}
                              disabled={orchestration.microState === "preview"}
                              variant={answer.revealed ? "secondary" : "default"}
                              size="sm"
                              className="text-xs h-6 px-2"
                            >
                              {answer.revealed ? "Hide" : "Show"}
                            </Button>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {currentQuestion.answers.map((answer, index) => (
                        <motion.button
                          key={answer.id}
                          whileHover={orchestration.microState !== "preview" ? { scale: 1.02 } : {}}
                          whileTap={orchestration.microState !== "preview" ? { scale: 0.98 } : {}}
                          disabled={orchestration.microState === "preview"}
                          className={`flex items-center justify-between gap-2 rounded-lg p-2 transition-colors text-left ${
                            orchestration.microState === "preview" 
                              ? "bg-gray-800 opacity-50 cursor-not-allowed"
                              : answer.revealed 
                                ? "bg-green-600" 
                                : "bg-gray-700 hover:bg-gray-600"
                          }`}
                          onClick={() => {
                            if (orchestration.microState === "preview") return
                            if (!answer.revealed) {
                              onPlaySound("ding")
                            }
                            onRevealAnswer(answer.id)
                          }}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-800 font-display text-xs">
                              {index + 1}
                            </div>
                            <div className="text-xs font-semibold truncate">{answer.text}</div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="font-display text-xs text-yellow-400">{answer.points}</div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Controls */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Input
                  value={sponsorVideoUrl}
                  onChange={(e) => setSponsorVideoUrl(e.target.value)}
                  placeholder="/videos/sponsor.mp4"
                  className="h-8 text-xs bg-gray-700"
                />
                <Button
                  onClick={handlePlaySponsorVideoAndNext}
                  variant="outline"
                  className="w-full text-xs h-8"
                  disabled={!sponsorVideoUrl || currentQuestionIndex >= questionCount - 1}
                >
                  <Video className="mr-1 h-3 w-3" />
                  Play Video & Next
                </Button>
              </div>

              <Button
                onClick={handleNextQuestion}
                variant="default"
                className="text-xs h-full"
                disabled={currentQuestionIndex >= questionCount - 1}
              >
                <ChevronRight className="mr-1 h-4 w-4" />
                Next Question
              </Button>
            </div>
          </motion.div>
        )}

        {(selectedTimeline === "welcome" || selectedTimeline === "rules" || selectedTimeline === "ending") && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="rounded-lg bg-gray-700/50 border border-gray-600 p-6 text-center"
          >
            <Settings className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-400">
              No controls available for this screen.
              <br />
              <span className="text-xs">Controls will appear for Survey Questions and Lightning Round.</span>
            </p>
          </motion.div>
        )}

        {selectedTimeline === "lightning" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="rounded-lg bg-gray-700/50 border border-gray-600 p-6 text-center"
          >
            <Zap className="h-8 w-8 mx-auto mb-2 text-yellow-400" />
            <p className="text-sm text-gray-300 font-semibold">Lightning Round Coming Soon!</p>
            <p className="text-xs text-gray-400 mt-2">Controls for Lightning Round will be added here.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Text Input Section */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <label className="text-sm font-medium text-gray-400 mb-2 block">Footer Text</label>
        <Input
          value={footerText}
          onChange={(e) => onFooterTextChange(e.target.value)}
          placeholder="Enter text to display at bottom of game screen..."
          className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
        />
      </div>
    </Card>
  )
}
