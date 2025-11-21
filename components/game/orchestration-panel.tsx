"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { getVideoFromIndexedDB } from "@/lib/video-storage"
import { toast } from "sonner"
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
  X,
  BookOpen,
  Minus,
  RotateCcw,
  Volume2,
  Square
} from "lucide-react"
import type { MacroState, MicroState, OrchestrationState, Question, LightningRoundState, Team } from "@/hooks/use-game-state"
import { LightningRoundController } from "./lightning-round-controller"
import { AnimatedNumber } from "./animated-number"
import { formatScore } from "@/lib/game-utils"

interface OrchestrationPanelProps {
  orchestration: OrchestrationState
  questionCount: number
  questions: Question[]
  currentQuestion: Question | null
  onGoToWelcome: () => void
  onGoToRules: () => void
  onGoToQuestionPreview: (index: number) => void
  onRevealQuestion: () => void
  onGoToSponsorVideo: () => void
  onPlaySponsorVideo: () => void
  onPauseSponsorVideo: () => void
  onStopSponsorVideo: () => void
  onGoToLightningRound: () => void
  onGoToLightningRoundRules: () => void
  currentQuestionIndex: number
  onRevealAnswer: (answerId: string) => void
  onRevealAllAnswers: () => void
  onHideAllAnswers: () => void
  onAddQuestion: (question: any) => void
  onUpdateQuestion: (id: string, question: any) => void
  onDeleteQuestion: (id: string) => void
  onPlaySound: (type: "ding" | "buzz" | "buzzer" | "duplicate" | "whoosh") => void
  sponsorLogo: string | null
  onSponsorLogoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveSponsorLogo: () => void
  hasSponsorVideo: boolean
  onSponsorVideoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveSponsorVideo: () => void
  surveyFooterTexts: string[]
  onFooterTextChange: (surveyIndex: number, text: string) => void
  showSurveyTotals: boolean
  onToggleSurveyTotals: () => void
  lightningRound: LightningRoundState
  onUpdateLightningQuestion: (index: number, text: string) => void
  onUpdateLightningContestantName: (contestant: 1 | 2, name: string) => void
  onUpdateLightningAnswer: (contestant: 1 | 2, answerIndex: number, text: string, points: number) => void
  onRevealLightningAnswer: (contestant: 1 | 2, answerIndex: number) => void
  onToggleLightningPoints: (contestant: 1 | 2, answerIndex: number) => void
  onRevealAllLightningAnswers: (contestant: 1 | 2) => void
  onHideAllLightningAnswers: (contestant: 1 | 2) => void
  onStartLightningTimer: (seconds: number) => void
  onStopLightningTimer: () => void
  onToggleLightningTimerVisibility: () => void
  chibiImage: string
  onChibiImageChange: (imageUrl: string) => void
  sponsorName: string
  onSponsorNameChange: (name: string) => void
  lightningRulesSponsorLogo1: string | null
  lightningRulesSponsorLogo2: string | null
  onLightningRulesSponsorLogoUpload: (logoNumber: 1 | 2, event: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveLightningRulesSponsorLogo: (logoNumber: 1 | 2) => void
  onGoToEnding: () => void
  // Sound effects and score control props
  teams: Team[]
  onUpdateScore: (teamId: string, points: number) => void
  onTriggerWrongAnswer: () => void
  onAddStrike: () => void
  soundEffects: Array<{ name: string; type: "ding" | "buzz" | "buzzer" | "duplicate" | "whoosh"; filename: string; color: string }>
  playingSound: string | null
  currentBackgroundMusic: "intro" | "excitement" | null
  onPlayBackgroundMusic: (type: "intro" | "excitement") => void
  onStopBackgroundMusic: () => void
}

type TimelineState = "welcome" | "rules" | "question" | "lightning-rules" | "lightning" | "ending"

export function OrchestrationPanel({
  orchestration,
  questionCount,
  questions,
  currentQuestion,
  onGoToWelcome,
  onGoToRules,
  onGoToQuestionPreview,
  onRevealQuestion,
  onGoToSponsorVideo,
  onPlaySponsorVideo,
  onPauseSponsorVideo,
  onStopSponsorVideo,
  onGoToLightningRound,
  onGoToLightningRoundRules,
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
  hasSponsorVideo,
  onSponsorVideoUpload,
  onRemoveSponsorVideo,
  surveyFooterTexts,
  onFooterTextChange,
  showSurveyTotals,
  onToggleSurveyTotals,
  lightningRound,
  onUpdateLightningQuestion,
  onUpdateLightningContestantName,
  onUpdateLightningAnswer,
  onRevealLightningAnswer,
  onToggleLightningPoints,
  onRevealAllLightningAnswers,
  onHideAllLightningAnswers,
  onStartLightningTimer,
  onStopLightningTimer,
  onToggleLightningTimerVisibility,
  chibiImage,
  onChibiImageChange,
  sponsorName,
  onSponsorNameChange,
  lightningRulesSponsorLogo1,
  lightningRulesSponsorLogo2,
  onLightningRulesSponsorLogoUpload,
  onRemoveLightningRulesSponsorLogo,
  onGoToEnding,
  // Sound effects and score control props
  teams,
  onUpdateScore,
  onTriggerWrongAnswer,
  onAddStrike,
  soundEffects,
  playingSound,
  currentBackgroundMusic,
  onPlayBackgroundMusic,
  onStopBackgroundMusic,
}: OrchestrationPanelProps) {
  const [selectedTimeline, setSelectedTimeline] = useState<TimelineState | null>(null)
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null)
  const [sponsorVideoData, setSponsorVideoData] = useState<string | null>(null)
  
  // Load video from IndexedDB when component mounts or flag changes
  useEffect(() => {
    console.log("[OrchestrationPanel] hasSponsorVideo changed to:", hasSponsorVideo)
    if (hasSponsorVideo) {
      console.log("[OrchestrationPanel] Fetching video from IndexedDB...")
      getVideoFromIndexedDB().then(video => {
        console.log("[OrchestrationPanel] Video fetched, length:", video?.length || 0)
        console.log("[OrchestrationPanel] Setting sponsorVideoData state...")
        setSponsorVideoData(video)
        console.log("[OrchestrationPanel] State setter called, will re-render with video")
      }).catch(error => {
        console.error("[OrchestrationPanel] Failed to fetch video:", error)
      })
    } else {
      console.log("[OrchestrationPanel] Clearing video data")
      setSponsorVideoData(null)
    }
  }, [hasSponsorVideo])

  // Debug effect to track sponsorVideoData state
  useEffect(() => {
    console.log("[OrchestrationPanel] sponsorVideoData state updated:", sponsorVideoData ? `${sponsorVideoData.length} bytes` : "null")
  }, [sponsorVideoData])
  
  // Question manager state (Survey Questions)
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false)
  
  // Lightning Questions manager state
  const [isLightningQuestionsDialogOpen, setIsLightningQuestionsDialogOpen] = useState(false)
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

  // Score control state
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set(["A"]))
  const [scorePreset, setScorePreset] = useState<"default" | "alternative">("default")
  const [scoreChangeValue, setScoreChangeValue] = useState(100)
  const [showScoreResetConfirm, setShowScoreResetConfirm] = useState(false)

  const handlePresetChange = (preset: "default" | "alternative") => {
    setScorePreset(preset)
    if (preset === "default") {
      setScoreChangeValue(100)
    } else {
      setScoreChangeValue(20)
    }
  }

  const presetValues = scorePreset === "default" ? [10, 20, 50, 100] : [25, 50, 100, 500]

  const toggleTeamSelection = (teamId: string) => {
    setSelectedTeams((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(teamId)) {
        newSet.delete(teamId)
      } else {
        newSet.add(teamId)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedTeams.size === 4) {
      setSelectedTeams(new Set())
    } else {
      setSelectedTeams(new Set(["A", "B", "C", "D"]))
    }
  }

  const applyScoreToSelected = (points: number) => {
    const changedTeams: Array<{ name: string; color: string; points: number }> = []
    
    selectedTeams.forEach((teamId) => {
      onUpdateScore(teamId, points)
      const team = teams.find(t => t.id === teamId)
      if (team) {
        changedTeams.push({ name: team.name, color: team.color, points })
      }
    })
    
    // Show single toast with all teams
    if (changedTeams.length > 0) {
      const toastContent = (
        <div className="flex flex-row gap-2">
          {changedTeams.map((team, idx) => (
            <div 
              key={idx} 
              className="flex items-center gap-2 p-2 rounded whitespace-nowrap"
              style={{ 
                border: `2px solid ${team.color}`,
                backgroundColor: 'rgba(255, 255, 255, 0.05)'
              }}
            >
              <span className="font-semibold" style={{ color: team.color }}>{team.name}</span>
              <span 
                className="font-bold text-lg"
                style={{ color: team.points > 0 ? '#22c55e' : '#ef4444' }}
              >
                {team.points > 0 ? '+' : ''}{team.points}
              </span>
            </div>
          ))}
        </div>
      )
      
      toast(toastContent, {
        duration: 3000,
        position: 'top-center',
        style: {
          background: '#1f2937',
          color: 'white',
          border: '2px solid #374151',
          padding: '1rem',
          width: 'fit-content',
          maxWidth: 'calc(100vw - 2rem)',
        },
      })
    }
  }

  const handleResetScores = () => {
    if (showScoreResetConfirm) {
      selectedTeams.forEach((teamId) => {
        const team = teams.find((t) => t.id === teamId)
        if (team) {
          onUpdateScore(teamId, -team.score)
        }
      })
      setShowScoreResetConfirm(false)
      setSelectedTeams(new Set())
    } else {
      setShowScoreResetConfirm(true)
      setTimeout(() => setShowScoreResetConfirm(false), 3000)
    }
  }


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
      { id: "lightning-rules", label: "Lightning Rules", icon: BookOpen },
      { id: "lightning", label: "Lightning Round", icon: Zap },
      { id: "ending", label: "Ending", icon: Flag }
    )
    
    return states
  }

  const getStateStatus = (stateId: string) => {
    if (stateId === "welcome" && orchestration.macroState === "welcome") return "active"
    if (stateId === "rules" && orchestration.macroState === "rules") return "active"
    if (stateId === "lightning-rules" && orchestration.macroState === "lightning-round-rules") return "active"
    if (stateId === "lightning" && orchestration.macroState === "lightning-round") return "active"
    if (stateId === "ending" && orchestration.macroState === "final") return "active"
    if (stateId.startsWith("question-")) {
      const index = parseInt(stateId.split("-")[1])
      if (orchestration.macroState === "questions" && orchestration.currentQuestionInFlow === index) {
        return "active"
      }
      // Mark as completed if we've moved past this question or past the questions phase entirely
      if (orchestration.currentQuestionInFlow > index) return "completed"
      // If we're in lightning-rules, lightning-round, or final, all questions are completed
      if (orchestration.macroState === "lightning-round-rules" || 
          orchestration.macroState === "lightning-round" || 
          orchestration.macroState === "final") {
        return "completed"
      }
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
    } else if (stateId === "lightning-rules") {
      onGoToLightningRoundRules()
      setSelectedTimeline("lightning-rules")
      setSelectedQuestionIndex(null)
    } else if (stateId === "lightning") {
      onGoToLightningRound()
      setSelectedTimeline("lightning")
      setSelectedQuestionIndex(null)
    } else if (stateId === "ending") {
      onGoToEnding()
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

  const timelineStates = getTimelineStates()

  return (
    <Card className="bg-gray-800 p-4">
      {/* Header with Sponsor Logo and Question Manager */}
      <div className="mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Game Orchestration</h2>
          
          <div className="flex gap-2">
            {/* Survey Questions Manager */}
            <Dialog open={isQuestionDialogOpen} onOpenChange={setIsQuestionDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default" size="sm">
                  <Settings className="mr-2 h-4 w-4" />
                  Survey Questions
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-800 text-white border-gray-700">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-display">Survey Question Manager</DialogTitle>
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

          {/* Lightning Questions Manager */}
          <Dialog open={isLightningQuestionsDialogOpen} onOpenChange={setIsLightningQuestionsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="default" size="sm">
                <Zap className="mr-2 h-4 w-4" />
                Lightning Questions
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-800 text-white border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-2xl font-display">Lightning Round Questions</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <p className="text-sm text-gray-400">
                  Edit the 6 questions asked during the Lightning Round.
                </p>
                
                <div className="space-y-3">
                  {lightningRound.questions.map((question, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-yellow-600 text-sm font-bold">
                        {index + 1}
                      </span>
                      <Input
                        value={question}
                        onChange={(e) => onUpdateLightningQuestion(index, e.target.value)}
                        placeholder={`Question ${index + 1}`}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-gray-700">
                  <Button
                    onClick={() => setIsLightningQuestionsDialogOpen(false)}
                    variant="default"
                    className="w-full"
                  >
                    Done
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </div>
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

        {/* Sponsor Video Upload */}
        {sponsorVideoData && (
          <div className="relative rounded-lg overflow-hidden bg-gray-700/50 border border-gray-600">
            <video
              key={`video-${sponsorVideoData.length}`}
              src={sponsorVideoData}
              className="w-full h-24 object-cover"
              muted
              onLoadedMetadata={() => console.log("[OrchestrationPanel] Video loaded successfully")}
              onError={(e) => console.error("[OrchestrationPanel] Video error:", e)}
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={onRemoveSponsorVideo}
              >
                Remove
              </Button>
            </div>
          </div>
        )}
        {!sponsorVideoData && (
          <div className="flex items-center justify-center p-3 rounded-lg bg-gray-700/50 border border-gray-600">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="video/*"
                onChange={onSponsorVideoUpload}
                className="hidden"
              />
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Plus className="h-4 w-4" />
                <span>Upload Sponsor Video</span>
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

      {/* Score Control and Sound Effects - Side by Side */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Score Control */}
        <div>
          <Card className="h-full justify-between bg-gray-700/50 border-gray-600 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-sm">Score Control</h2>
              <div className="flex gap-1">
                <button
                  onClick={() => handlePresetChange("alternative")}
                  className={`rounded-full px-2 py-1 text-xs font-medium transition-all ${
                    scorePreset === "alternative"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  25/50
                </button>
                <button
                  onClick={() => handlePresetChange("default")}
                  className={`rounded-full px-2 py-1 text-xs font-medium transition-all ${
                    scorePreset === "default"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  10/20
                </button>
              </div>
            </div>

            <div className="h-full space-y-3">
              {/* Team Selection */}
              <div className="flex gap-1">
                <Button
                  onClick={toggleSelectAll}
                  variant={selectedTeams.size === 4 ? "default" : "outline"}
                  size="sm"
                  className="flex-1 text-xs"
                  style={{
                    backgroundColor: selectedTeams.size === 4 ? undefined : "#374151",
                  }}
                >
                  All
                </Button>
                {teams.map((team) => (
                  <Button
                    key={team.id}
                    onClick={() => toggleTeamSelection(team.id)}
                    variant={selectedTeams.has(team.id) ? "default" : "outline"}
                    size="sm"
                    className="flex-1 text-xs"
                    style={{
                      backgroundColor: selectedTeams.has(team.id) ? team.color : "#374151",
                      borderColor: team.color,
                    }}
                  >
                    {team.id}
                  </Button>
                ))}
              </div>

              {selectedTeams.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  {/* Score Adjustment Controls */}
                  <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-3">
                    <div className="mb-2 flex items-center justify-center gap-3">
                      <Button
                        onClick={() => applyScoreToSelected(-scoreChangeValue)}
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 text-sm"
                        style={{ backgroundColor: "#374151" }}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <div className="flex min-w-[80px] items-center justify-center">
                        <AnimatedNumber value={scoreChangeValue} color="#ffffffff" size="massive" />
                      </div>
                      <Button
                        onClick={() => applyScoreToSelected(scoreChangeValue)}
                        variant="default"
                        size="sm"
                        className="h-8 w-8 bg-blue-600 text-sm hover:bg-blue-500"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Preset Value Buttons */}
                    <div className="grid grid-cols-4 gap-1">
                      {presetValues.map((value) => (
                        <Button
                          key={value}
                          onClick={() => setScoreChangeValue(value)}
                          variant={scoreChangeValue === value ? "default" : "outline"}
                          size="sm"
                          className="text-xs"
                          style={{
                            backgroundColor: scoreChangeValue === value ? "#2563eb" : "#374151",
                          }}
                        >
                          {value}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Reset Button */}
                  <Button
                    onClick={handleResetScores}
                    variant={showScoreResetConfirm ? "destructive" : "outline"}
                    className="w-full text-xs"
                    size="sm"
                  >
                    <RotateCcw className="mr-1 h-3 w-3" />
                    {showScoreResetConfirm ? "Confirm?" : "Reset"}
                  </Button>
                </motion.div>
              )}
            </div>
          </Card>
        </div>

        {/* Sound Effects & Background Music */}
        <div>
          <Card className="bg-gray-700/50 border-gray-600 p-4 h-full">
            <h2 className="mb-4 font-display text-sm">Sound Effects</h2>
            
            {/* Sound Effect Buttons - 5 columns on large screens */}
            <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {soundEffects.map((sound) => (
                <motion.button
                  key={sound.type}
                  onClick={() => {
                    onPlaySound(sound.type)
                    if (sound.type === "buzz") {
                      // Trigger wrong answer animation and add strike
                      onTriggerWrongAnswer()
                      onAddStrike()
                    }
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  className={`relative aspect-square flex flex-col items-center justify-center rounded-lg font-display font-bold text-white transition-all duration-200 border ${sound.color} border-opacity-70 bg-gray-700 hover:border-opacity-100`}
                >
                  <motion.div
                    animate={playingSound === sound.type ? { scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] } : { scale: 1, rotate: 0 }}
                    transition={{ duration: 0.3, repeat: playingSound === sound.type ? Infinity : 0 }}
                    className="flex flex-col items-center"
                  >
                    <Volume2 className="h-6 w-6 sm:h-8 sm:w-8 mb-1" />
                  </motion.div>
                  <span className="text-xs sm:text-sm text-center px-1">{sound.name}</span>
                </motion.button>
              ))}
            </div>

            {/* Background Music Section */}
            <div className="border-t border-gray-600 pt-4">
              <h3 className="mb-2 font-display text-sm text-gray-300">Background Music</h3>
              
              {/* Current Playing Indicator */}
              {currentBackgroundMusic && (
                <div className="mb-2 text-xs text-green-400 flex items-center gap-1">
                  <Volume2 className="h-3 w-3 animate-pulse" />
                  <span>Now Playing: {currentBackgroundMusic === "intro" ? "GATE Intro Music" : "Excitement"}</span>
                </div>
              )}
              
              {/* Music Options */}
              <div className="space-y-2">
                {/* GATE Intro Music */}
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-gray-400 min-w-[100px]">GATE Intro:</span>
                  <Button
                    onClick={() => onPlayBackgroundMusic("intro")}
                    disabled={currentBackgroundMusic === "intro"}
                    variant={currentBackgroundMusic === "intro" ? "default" : "outline"}
                    size="sm"
                    className="flex-1 text-xs"
                  >
                    <Play className="mr-1 h-3 w-3" />
                    Play
                  </Button>
                </div>
                
                {/* Excitement Music */}
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-gray-400 min-w-[100px]">Excitement:</span>
                  <Button
                    onClick={() => onPlayBackgroundMusic("excitement")}
                    disabled={currentBackgroundMusic === "excitement"}
                    variant={currentBackgroundMusic === "excitement" ? "default" : "outline"}
                    size="sm"
                    className="flex-1 text-xs"
                  >
                    <Play className="mr-1 h-3 w-3" />
                    Play
                  </Button>
                </div>
                
                {/* Stop Button */}
                <Button
                  onClick={onStopBackgroundMusic}
                  disabled={!currentBackgroundMusic}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                >
                  <Square className="mr-2 h-3 w-3" />
                  Stop All
                </Button>
              </div>
            </div>
          </Card>
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
            {currentQuestion && (() => {
              // Check if all answers are revealed
              const allAnswersRevealed = currentQuestion.answers.every(a => a.revealed)
              
              return (
              <div className="rounded-lg bg-gray-700/50 border border-gray-600 p-4">
                <div className="flex gap-3 mb-3">
                  {/* Left - Question Text */}
                  <div className="flex-1">
                    <div className="text-xs text-gray-400">Survey Question {selectedQuestionIndex + 1}</div>
                    <div className="font-display text-sm font-semibold mt-1">{currentQuestion.text}</div>
                  </div>
                  
                  {/* Right - Control Buttons - Responsive Grid */}
                  <div className="flex-shrink-0 p-3 bg-gray-800/50 rounded-lg border border-gray-600 w-fit">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {/* Reveal Question Button */}
                      <Button
                        onClick={onRevealQuestion}
                        size="sm"
                        variant="default"
                        className="text-xs h-9 whitespace-nowrap"
                        disabled={orchestration.microState === "reveal-question" || orchestration.microState === "playing"}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        {orchestration.microState === "reveal-question" || orchestration.microState === "playing" ? "Question Revealed" : "Reveal Question"}
                      </Button>
                      
                      {/* Survey Totals Toggle */}
                      <div className="flex items-center justify-between gap-2 px-3 h-9 bg-gray-700/50 rounded-md border border-gray-600">
                        <span className="text-xs text-gray-300 whitespace-nowrap">Survey Totals</span>
                        <Switch
                          checked={showSurveyTotals}
                          onCheckedChange={onToggleSurveyTotals}
                        />
                      </div>

                      {/* Reveal/Hide All Button */}
                      <Button 
                        onClick={allAnswersRevealed ? onHideAllAnswers : onRevealAllAnswers} 
                        variant="outline" 
                        size="sm" 
                        className="text-xs h-9 whitespace-nowrap sm:col-span-2 lg:col-span-1"
                        disabled={orchestration.microState === "preview"}
                      >
                        {allAnswersRevealed ? (
                          <>
                            <EyeOff className="mr-1 h-3 w-3" />
                            Hide All Answers
                          </>
                        ) : (
                          <>
                            <Eye className="mr-1 h-3 w-3" />
                            Reveal All Answers
                          </>
                        )}
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
                      {/* Left Column: Answers 1-5 */}
                      <div className="flex flex-col gap-2">
                        {currentQuestion.answers.slice(0, 5).map((answer, index) => (
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
                      {/* Right Column: Answers 6-10 */}
                      <div className="flex flex-col gap-2">
                        {currentQuestion.answers.slice(5, 10).map((answer, index) => (
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
                                {index + 6}
                              </div>
                              <div className="text-xs font-semibold truncate">{answer.text}</div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="font-display text-xs text-yellow-400">{answer.points}</div>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              )
            })()}

            {/* Navigation Controls */}
            <div className="space-y-2">
              {/* Video Controls & Next Question - Side by side on large screens */}
              <div className="flex flex-col lg:flex-row gap-2">
                {/* Video Controls */}
                {sponsorVideoData && (
                  <div className="rounded-lg bg-gray-700/50 border border-gray-600 p-3 flex-1">
                    <div className="text-xs font-medium text-gray-400 mb-2">Sponsor Video Controls</div>
                    
                    {/* Status Display */}
                    <div className="mb-2 flex items-center gap-2 text-xs">
                      <span className="text-gray-400">Status:</span>
                      <span className={`font-semibold ${
                        orchestration.videoPlaybackStatus === "playing" ? "text-green-400" :
                        orchestration.videoPlaybackStatus === "paused" ? "text-yellow-400" :
                        "text-gray-400"
                      }`}>
                        {orchestration.videoPlaybackStatus === "playing" ? "▶ Playing" :
                         orchestration.videoPlaybackStatus === "paused" ? "⏸ Paused" :
                         "⏹ Stopped"}
                      </span>
                    </div>

                    {/* Control Buttons */}
                    <div className="grid grid-cols-4 gap-1">
                      <Button
                        onClick={onGoToSponsorVideo}
                        variant="outline"
                        size="sm"
                        className="text-xs h-8"
                        disabled={orchestration.microState === "sponsor-video"}
                      >
                        Go to Sponsor
                      </Button>
                      <Button
                        onClick={onPlaySponsorVideo}
                        variant="default"
                        size="sm"
                        className="text-xs h-8"
                        disabled={orchestration.microState !== "sponsor-video" || orchestration.videoPlaybackStatus === "playing"}
                      >
                        Play
                      </Button>
                      <Button
                        onClick={onPauseSponsorVideo}
                        variant="outline"
                        size="sm"
                        className="text-xs h-8"
                        disabled={orchestration.microState !== "sponsor-video" || orchestration.videoPlaybackStatus !== "playing"}
                      >
                        Pause
                      </Button>
                      <Button
                        onClick={onStopSponsorVideo}
                        variant="outline"
                        size="sm"
                        className="text-xs h-8"
                        disabled={orchestration.microState !== "sponsor-video" || orchestration.videoPlaybackStatus === "stopped"}
                      >
                        Stop
                      </Button>
                    </div>
                  </div>
                )}

                {/* Next Question Button */}
                <div className={`${sponsorVideoData ? 'lg:w-48' : 'w-full'}`}>
                  <Button
                    onClick={handleNextQuestion}
                    variant="default"
                    className="w-full h-full text-xs min-h-[6rem]"
                    disabled={currentQuestionIndex >= questionCount - 1}
                  >
                    <ChevronRight className="mr-1 h-4 w-4" />
                    Next Question
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {(selectedTimeline === "welcome" || selectedTimeline === "rules") && (
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

        {selectedTimeline === "lightning-rules" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="space-y-4"
          >
            <Card className="bg-gray-700/50 border-gray-600 p-4">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Lightning Rules Sponsor Logos
              </h3>

              {/* Sponsor Logo 1 */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-300 mb-2 block">Sponsor Logo 1</label>
                {lightningRulesSponsorLogo1 ? (
                  <div className="space-y-2">
                    <div className="bg-white rounded-lg p-4 flex items-center justify-center h-24">
                      <img src={lightningRulesSponsorLogo1} alt="Sponsor 1" className="max-h-full max-w-full object-contain" />
                    </div>
                    <Button
                      onClick={() => onRemoveLightningRulesSponsorLogo(1)}
                      variant="destructive"
                      size="sm"
                      className="w-full"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove Logo 1
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => onLightningRulesSponsorLogoUpload(1, e)}
                      className="bg-gray-800 border-gray-600 text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                    />
                    <p className="text-xs text-gray-400 mt-1">First sponsor logo (defaults to GATE)</p>
                  </div>
                )}
              </div>

              {/* Sponsor Logo 2 */}
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Sponsor Logo 2</label>
                {lightningRulesSponsorLogo2 ? (
                  <div className="space-y-2">
                    <div className="bg-white rounded-lg p-4 flex items-center justify-center h-24">
                      <img src={lightningRulesSponsorLogo2} alt="Sponsor 2" className="max-h-full max-w-full object-contain" />
                    </div>
                    <Button
                      onClick={() => onRemoveLightningRulesSponsorLogo(2)}
                      variant="destructive"
                      size="sm"
                      className="w-full"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove Logo 2
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => onLightningRulesSponsorLogoUpload(2, e)}
                      className="bg-gray-800 border-gray-600 text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                    />
                    <p className="text-xs text-gray-400 mt-1">Second sponsor logo (defaults to GATE)</p>
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-400 mt-4 p-2 bg-blue-900/30 rounded">
                <strong>Note:</strong> The third logo will always be GATE
              </p>
            </Card>
          </motion.div>
        )}

        {selectedTimeline === "ending" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="space-y-4"
          >
            <Card className="bg-gray-700/50 border-gray-600 p-4">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Asset Management
              </h3>

              {/* Chibi Character Selection */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-300 mb-2 block">Chibi Character</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { name: "Blue", path: "/chibi-blue.png" },
                    { name: "Green", path: "/chibi-green.png" },
                    { name: "Smile", path: "/chibi-smile.png" },
                    { name: "Swag", path: "/chibi-swag.png" },
                  ].map((chibi) => (
                    <button
                      key={chibi.path}
                      onClick={() => onChibiImageChange(chibi.path)}
                      className={`p-2 rounded-lg border-2 transition-all ${
                        chibiImage === chibi.path
                          ? "border-yellow-400 bg-yellow-400/20"
                          : "border-gray-600 hover:border-gray-500 bg-gray-800"
                      }`}
                    >
                      <div className="text-xs font-semibold text-center mb-1">{chibi.name}</div>
                      <div className="aspect-square relative">
                        <img src={chibi.path} alt={chibi.name} className="object-contain w-full h-full" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sponsor Name */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-300 mb-2 block">Sponsor Name</label>
                <Input
                  value={sponsorName}
                  onChange={(e) => onSponsorNameChange(e.target.value)}
                  placeholder="Enter sponsor name..."
                  className="bg-gray-800 border-gray-600 text-white"
                />
                <p className="text-xs text-gray-400 mt-1">This will display in the Sponsorship box on the ending screen</p>
              </div>

              {/* Ending Screen Sponsor Logo */}
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Ending Screen Sponsor Logo</label>
                {sponsorLogo ? (
                  <div className="space-y-2">
                    <div className="bg-white rounded-lg p-4 flex items-center justify-center h-24">
                      <img src={sponsorLogo} alt="Sponsor" className="max-h-full max-w-full object-contain" />
                    </div>
                    <Button
                      onClick={onRemoveSponsorLogo}
                      variant="destructive"
                      size="sm"
                      className="w-full"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove Logo
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={onSponsorLogoUpload}
                      className="bg-gray-800 border-gray-600 text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                    />
                    <p className="text-xs text-gray-400 mt-1">Upload sponsor logo for ending screen</p>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {selectedTimeline === "lightning" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <LightningRoundController
              lightningRound={lightningRound}
              onUpdateQuestion={onUpdateLightningQuestion}
              onUpdateContestantName={onUpdateLightningContestantName}
              onUpdateAnswer={onUpdateLightningAnswer}
              onRevealAnswer={onRevealLightningAnswer}
              onTogglePoints={onToggleLightningPoints}
              onRevealAllAnswers={onRevealAllLightningAnswers}
              onHideAllAnswers={onHideAllLightningAnswers}
              onPlaySound={onPlaySound}
              onStartTimer={onStartLightningTimer}
              onStopTimer={onStopLightningTimer}
              onToggleTimerVisibility={onToggleLightningTimerVisibility}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Text Input Section */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <label className="text-sm font-medium text-gray-400 mb-3 block">Survey Footer Text</label>
        <div className="space-y-2">
          {surveyFooterTexts.map((text, index) => (
            <div key={index} className="flex gap-2 items-start">
              <span className="text-xs font-medium text-gray-400 whitespace-nowrap pt-2 w-12">Survey {index + 1}:</span>
              <Input
                value={text}
                onChange={(e) => onFooterTextChange(index, e.target.value)}
                placeholder={`Enter footer text for survey ${index + 1}...`}
                className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 flex-1"
              />
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
