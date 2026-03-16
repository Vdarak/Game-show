"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Plus,
  Folder,
  Layers,
  HelpCircle,
  Trash2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Save,
  Clock,
  X,
  Edit3,
  ArrowLeft,
  Video,
  Zap,
  Target,
  Timer,
  FileText,
  CheckCircle,
  MessageSquare,
  Upload,
  BookOpen,
  Image,
} from "lucide-react"
import { episodesApi, roundsApi, questionsApi, mediaApi, getMediaUrl } from "@/lib/api-client"
import type {
  Episode,
  EpisodeWithRounds,
  Round,
  RoundWithQuestions,
  Question,
  QuestionType,
  ScoringMode,
} from "@/lib/api-types"
import { toast } from "sonner"

interface EpisodeEditorProps {
  episodeId: string
  onClose: () => void
  onUpdate?: () => void
}

export function EpisodeEditor({ episodeId, onClose, onUpdate }: EpisodeEditorProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isOperating, setIsOperating] = useState(false) // For blocking operations (add/delete)
  const [isAutosaving, setIsAutosaving] = useState(false) // For autosave (non-blocking)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [episode, setEpisode] = useState<EpisodeWithRounds | null>(null)
  const [expandedRound, setExpandedRound] = useState<number | null>(null)
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null)

  // Edit states
  const [editingEpisode, setEditingEpisode] = useState(false)
  const [episodeTitle, setEpisodeTitle] = useState("")
  const [episodeDescription, setEpisodeDescription] = useState("")

  // Rules states
  const [rulesArray, setRulesArray] = useState<string[]>([])
  const [rulesVideoUrl, setRulesVideoUrl] = useState<string | null>(null)
  const [rulesVideoFileName, setRulesVideoFileName] = useState<string | null>(null)
  const [uploadingRulesVideo, setUploadingRulesVideo] = useState(false)
  const [rulesUploadProgress, setRulesUploadProgress] = useState(0)
  const rulesDebounceRef = useRef<NodeJS.Timeout | null>(null)

  // Sponsorship states
  const [sponsorshipImage, setSponsorshipImage] = useState<string | null>(null)
  const [sponsorshipVideoUrl, setSponsorshipVideoUrl] = useState<string | null>(null)
  const [sponsorshipVideoFileName, setSponsorshipVideoFileName] = useState<string | null>(null)
  const [uploadingSponsorVideo, setUploadingSponsorVideo] = useState(false)
  const [sponsorUploadProgress, setSponsorUploadProgress] = useState(0)
  const sponsorshipDebounceRef = useRef<NodeJS.Timeout | null>(null)


  // Load episode
  useEffect(() => {
    loadEpisode()
  }, [episodeId])

  const loadEpisode = async () => {
    setIsLoading(true)
    try {
      const data = await episodesApi.get(episodeId)
      setEpisode(data)
      setEpisodeTitle(data.Title)
      setEpisodeDescription(data.Description || "")
      setRulesArray(data.RulesContent || [])
      setRulesVideoUrl(data.RulesVideoUrl || null)
      setSponsorshipImage(data.SponsorshipImage || null)
      setSponsorshipVideoUrl(data.SponsorshipVideoUrl || null)
    } catch (err) {
      toast.error("Failed to load episode")
      onClose()
    }
    setIsLoading(false)
  }



  // Upload rules video
  const handleRulesVideoUpload = async (file: File) => {
    if (!episode) return
    setUploadingRulesVideo(true)
    setRulesUploadProgress(10)
    setRulesVideoFileName(file.name)

    try {
      // Step 1: Request presigned upload URL
      setRulesUploadProgress(15)
      const { upload_url, blob_path } = await mediaApi.requestUploadUrl({
        episode_id: episode.IDEpisode,
        video_type: "rules",
        filename: file.name,
      })

      // Step 2: Upload file directly to S3
      setRulesUploadProgress(30)
      await mediaApi.uploadFileToS3(upload_url, file)

      // Step 3: Confirm upload with backend
      setRulesUploadProgress(80)
      await mediaApi.confirmUpload({
        episode_id: episode.IDEpisode,
        video_type: "rules",
        blob_path,
      })

      // Re-fetch episode to get updated video URL
      setRulesUploadProgress(95)
      const updated = await episodesApi.get(episode.IDEpisode)
      setRulesUploadProgress(100)
      await new Promise(r => setTimeout(r, 300))
      setRulesVideoUrl(updated.RulesVideoUrl)
      toast.success("Rules video uploaded!")
    } catch (err) {
      console.error("Rules video upload failed:", err)
      toast.error("Failed to upload rules video")
      setRulesVideoFileName(null)
    } finally {
      setUploadingRulesVideo(false)
      setRulesUploadProgress(0)
    }
  }

  // Autosave rules changes
  useEffect(() => {
    if (!episode) return

    if (rulesDebounceRef.current) {
      clearTimeout(rulesDebounceRef.current)
    }

    rulesDebounceRef.current = setTimeout(async () => {
      try {
        await episodesApi.update({
          IDEpisode: episode.IDEpisode,
          RulesContent: rulesArray.filter(line => line.trim()).length > 0 
                          ? rulesArray.filter(line => line.trim()) 
                          : undefined,
        })
        setLastSavedAt(new Date())
      } catch (err) {
        console.error("Failed to save rules:", err)
      }
    }, 1500)

    return () => {
      if (rulesDebounceRef.current) {
        clearTimeout(rulesDebounceRef.current)
      }
    }
  }, [rulesArray, episode])

  // Sponsorship Logo Upload
  const handleSponsorLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !episode) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64 = event.target?.result as string
      setSponsorshipImage(base64)
      setIsAutosaving(true)
      try {
        await episodesApi.update({
          IDEpisode: episode.IDEpisode,
          SponsorshipImage: base64,
        })
        setLastSavedAt(new Date())
        toast.success("Sponsorship logo uploaded!")
      } catch (err) {
        toast.error("Failed to upload sponsorship logo")
      } finally {
        setIsAutosaving(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveSponsorLogo = async () => {
    if (!episode) return
    setSponsorshipImage(null)
    setIsAutosaving(true)
    try {
      await episodesApi.update({
        IDEpisode: episode.IDEpisode,
        SponsorshipImage: "", // Sending empty string clears it
      })
      setLastSavedAt(new Date())
      toast.success("Sponsorship logo removed!")
    } catch (err) {
      toast.error("Failed to remove sponsorship logo")
    } finally {
      setIsAutosaving(false)
    }
  }

  // Sponsorship Video Upload
  const handleSponsorVideoUpload = async (file: File) => {
    if (!episode) return
    setUploadingSponsorVideo(true)
    setSponsorUploadProgress(10)
    setSponsorshipVideoFileName(file.name)

    try {
      setSponsorUploadProgress(15)
      const { upload_url, blob_path } = await mediaApi.requestUploadUrl({
        episode_id: episode.IDEpisode,
        video_type: "sponsorship",
        filename: file.name,
      })
      const uploadedSponsorshipVideoUrl = `${new URL(upload_url).origin}/${blob_path.replace(/^\/+/, "")}`

      setSponsorUploadProgress(30)
      await mediaApi.uploadFileToS3(upload_url, file)

      setSponsorUploadProgress(80)
      await mediaApi.confirmUpload({
        episode_id: episode.IDEpisode,
        video_type: "sponsorship",
        blob_path,
      })

      setSponsorUploadProgress(95)
      setSponsorUploadProgress(100)
      await new Promise(r => setTimeout(r, 300))
      setSponsorshipVideoUrl(uploadedSponsorshipVideoUrl)
      toast.success("Sponsorship video uploaded!")
    } catch (err) {
      console.error("Sponsorship video upload failed:", err)
      toast.error("Failed to upload sponsorship video")
      setSponsorshipVideoFileName(null)
    } finally {
      setUploadingSponsorVideo(false)
      setSponsorUploadProgress(0)
    }
  }

  const handleRemoveSponsorVideo = async () => {
    if (!episode) return
    setIsAutosaving(true)
    try {
      // Create this new API endpoint in api-client.ts 
      // (which we already did)
      await episodesApi.deleteSponsorshipVideo(episode.IDEpisode)
      setSponsorshipVideoUrl(null)
      setSponsorshipVideoFileName(null)
      toast.success("Sponsorship video removed!")
    } catch (err) {
      toast.error("Failed to remove sponsorship video")
    } finally {
      setIsAutosaving(false)
    }
  }

  // Save Episode
  const handleSaveEpisode = async () => {
    if (!episode) return
    setIsOperating(true)
    try {
      await episodesApi.update({
        IDEpisode: episode.IDEpisode,
        Title: episodeTitle,
        Description: episodeDescription || undefined,
      })
      setEpisode({ ...episode, Title: episodeTitle, Description: episodeDescription })
      setEditingEpisode(false)
      setLastSavedAt(new Date())
      toast.success("Episode updated!")
      onUpdate?.()
    } catch (err) {
      toast.error("Failed to update episode")
    }
    setIsOperating(false)
  }

  // Add Round
  const handleAddRound = async () => {
    if (!episode) return
    setIsOperating(true)
    try {
      const newRound = await roundsApi.create({
        IDEpisode: episode.IDEpisode,
        RoundNumber: episode.rounds.length + 1,
        TimerSeconds: 20,
        PointPoolOptions: [2, 4, 6, 8],
        TimedBonusTiers: [{ within: 5, bonus: 3 }, { within: 10, bonus: 1 }],
        NegativeScoring: false,
        ScoringMode: "both",
      })
      setEpisode({
        ...episode,
        rounds: [...episode.rounds, { ...newRound, questions: [] }],
      })
      setExpandedRound(episode.rounds.length)
      toast.success("Round added!")
    } catch (err) {
      toast.error("Failed to add round")
    }
    setIsOperating(false)
  }

  // Update Round (autosave - non-blocking)
  const handleUpdateRound = async (roundId: string, updates: Partial<Round>) => {
    if (!episode) return
    setIsAutosaving(true)
    try {
      const updated = await roundsApi.update({ IDRound: roundId, ...updates })
      setEpisode({
        ...episode,
        rounds: episode.rounds.map((r) =>
          r.IDRound === roundId ? { ...r, ...updated } : r
        ),
      })
      setLastSavedAt(new Date())
    } catch (err) {
      // Silently fail for autosave
      console.error("Failed to update round:", err)
    }
    setIsAutosaving(false)
  }

  // Delete Round
  const handleDeleteRound = async (roundId: string) => {
    if (!episode) return
    if (!confirm("Delete this round and all its questions?")) return

    setIsOperating(true)
    try {
      await roundsApi.delete(roundId)
      setEpisode({
        ...episode,
        rounds: episode.rounds.filter((r) => r.IDRound !== roundId),
      })
      toast.success("Round deleted!")
      onUpdate?.()
    } catch (err) {
      toast.error("Failed to delete round")
    }
    setIsOperating(false)
  }

  // Add Question
  const handleAddQuestion = async (roundId: string, roundIndex: number) => {
    if (!episode) return
    const round = episode.rounds[roundIndex]

    setIsOperating(true)
    try {
      const newQuestion = await questionsApi.create({
        IDRound: roundId,
        QuestionOrder: round.questions.length + 1,
        QuestionText: "New Question",
        QuestionType: "multiple_choice",
        CorrectAnswer: "",
        Options: ["", "", "", ""],
      })

      const updatedRounds = [...episode.rounds]
      updatedRounds[roundIndex] = {
        ...round,
        questions: [...round.questions, newQuestion],
      }
      setEpisode({ ...episode, rounds: updatedRounds })
      setExpandedQuestion(newQuestion.IDQuestion)
      toast.success("Question added!")
    } catch (err) {
      toast.error("Failed to add question")
    }
    setIsOperating(false)
  }

  // Update Question (autosave - non-blocking)
  const handleUpdateQuestion = async (questionId: string, roundIndex: number, updates: Partial<Question>) => {
    if (!episode) return
    setIsAutosaving(true)
    try {
      // Build update request with proper types
      const updateRequest = {
        IDQuestion: questionId,
        QuestionOrder: updates.QuestionOrder,
        QuestionText: updates.QuestionText,
        QuestionType: updates.QuestionType,
        CorrectAnswer: updates.CorrectAnswer,
        Category: updates.Category ?? undefined,
        Options: updates.Options ?? undefined,
        TimerSecondsOverride: updates.TimerSecondsOverride,
        ScoringModeOverride: updates.ScoringModeOverride,
        Notes: updates.Notes,
      }
      const updated = await questionsApi.update(updateRequest)
      const updatedRounds = [...episode.rounds]
      updatedRounds[roundIndex] = {
        ...updatedRounds[roundIndex],
        questions: updatedRounds[roundIndex].questions.map((q) =>
          q.IDQuestion === questionId ? { ...q, ...updated } : q
        ),
      }
      setEpisode({ ...episode, rounds: updatedRounds })
      setLastSavedAt(new Date())
    } catch (err) {
      // Silently fail for autosave
      console.error("Failed to update question:", err)
    }
    setIsAutosaving(false)
  }

  // Delete Question
  const handleDeleteQuestion = async (questionId: string, roundIndex: number) => {
    if (!episode) return
    if (!confirm("Delete this question?")) return

    setIsOperating(true)
    try {
      await questionsApi.delete(questionId)
      const updatedRounds = [...episode.rounds]
      updatedRounds[roundIndex] = {
        ...updatedRounds[roundIndex],
        questions: updatedRounds[roundIndex].questions.filter(
          (q) => q.IDQuestion !== questionId
        ),
      }
      setEpisode({ ...episode, rounds: updatedRounds })
      toast.success("Question deleted!")
    } catch (err) {
      toast.error("Failed to delete question")
    }
    setIsOperating(false)
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (!episode) return null

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-gray-900 border-b border-gray-800 px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 px-2">
              <ArrowLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <div className="h-6 w-px bg-gray-700 hidden sm:block" />
            {editingEpisode ? (
              <div className="flex items-center gap-2 sm:gap-3 flex-1 flex-wrap">
                <Input
                  value={episodeTitle}
                  onChange={(e) => setEpisodeTitle(e.target.value)}
                  className="bg-gray-800 border-gray-700 w-full sm:w-64"
                  placeholder="Episode Title"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveEpisode}
                    disabled={isOperating}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Save className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Save</span>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingEpisode(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <Folder className="h-5 w-5 text-purple-400 flex-shrink-0" />
                <h1 className="font-display text-lg sm:text-xl font-bold text-white truncate">{episode.Title}</h1>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingEpisode(true)}
                  className="text-gray-400 flex-shrink-0"
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-500">
            {isAutosaving ? (
              <span className="flex items-center gap-1.5 text-purple-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                Autosaving...
              </span>
            ) : lastSavedAt ? (
              <span className="text-gray-500">
                Saved {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            ) : null}
            <span>
              {episode.rounds.length} rounds · {episode.rounds.reduce((acc, r) => acc + r.questions.length, 0)} questions
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Rounds Navigation */}
        <div className="w-full md:w-64 bg-gray-900/50 md:border-r border-b md:border-b-0 border-gray-800 flex flex-col overflow-y-auto">
          <div className="p-3 sm:p-4 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold text-white flex items-center gap-2 text-sm sm:text-base">
                <Layers className="h-4 w-4 text-purple-400" />
                Rounds
              </h2>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddRound}
                disabled={isOperating}
                className="border-purple-500/50 text-purple-400 h-7 w-7 p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="p-2 sm:p-3">
            {episode.rounds.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <Layers className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No rounds yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-2 gap-1.5 sm:gap-2">
                {episode.rounds.map((round, roundIndex) => (
                  <div
                    key={round.IDRound}
                    className={`relative group rounded-lg border transition-all cursor-pointer aspect-square flex flex-col items-center justify-center p-1 ${expandedRound === roundIndex
                      ? "border-purple-500 bg-purple-500/20 ring-1 ring-purple-500/40"
                      : "border-gray-700 bg-gray-800/50 hover:border-gray-500 hover:bg-gray-800"
                      }`}
                    onClick={() => setExpandedRound(roundIndex)}
                  >
                    <span className={`font-display text-lg sm:text-xl font-bold ${expandedRound === roundIndex ? "text-purple-300" : "text-white"
                      }`}>
                      {round.RoundNumber}
                    </span>
                    <span className="text-[10px] sm:text-xs text-gray-500 leading-tight">
                      {round.questions.length} Q
                    </span>
                    {/* Delete button — shown on hover */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteRound(round.IDRound)
                      }}
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500/90 text-white items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rules Section */}
          <div className="border-t border-gray-800 p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-4 w-4 text-purple-400" />
              <h3 className="font-display text-sm font-semibold text-white">Rules</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-2">Rules</label>
                <div className="space-y-2">
                  {rulesArray.map((rule, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-800 text-[10px] font-medium text-gray-500 flex-shrink-0">
                        {i + 1}
                      </div>
                      <Input
                        value={rule}
                        onChange={(e) => {
                          const newRules = [...rulesArray]
                          newRules[i] = e.target.value
                          setRulesArray(newRules)
                        }}
                        placeholder="Rule text..."
                        className="bg-gray-900 border-gray-700 text-xs h-8 flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newRules = rulesArray.filter((_, idx) => idx !== i)
                          setRulesArray(newRules)
                        }}
                        className="w-6 h-6 rounded flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-colors flex-shrink-0 text-sm pl-0 pr-0 pb-0.5"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setRulesArray([...rulesArray, ""])}
                    className="mt-2 px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1 w-fit"
                  >
                    <Plus className="h-3 w-3" />
                    Add Rule
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Rules Video</label>
                {rulesVideoUrl ? (
                  <div className="relative rounded-lg overflow-hidden bg-black border border-gray-700">
                    <video
                      src={getMediaUrl(rulesVideoUrl)!}
                      className="w-full h-32 object-contain bg-black"
                      controls
                      playsInline
                      muted
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setRulesVideoUrl(null)
                          setRulesVideoFileName(null)
                        }}
                        className="px-2 py-1 bg-red-500/80 rounded text-xs text-white"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between">
                      {rulesVideoFileName && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-900/80 text-gray-300 truncate max-w-[60%]">
                          {rulesVideoFileName}
                        </span>
                      )}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/80 text-white">✓ Uploaded</span>
                    </div>
                  </div>
                ) : uploadingRulesVideo ? (
                  <div className="rounded-lg border border-gray-700 p-3 bg-gray-900/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Loader2 className="h-3.5 w-3.5 text-purple-400 animate-spin" />
                      <span className="text-xs text-gray-400">Uploading...</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-purple-500 rounded-full"
                        animate={{ width: `${rulesUploadProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-16 rounded-lg border-2 border-dashed border-gray-700 hover:border-purple-500/50 bg-gray-900/30 cursor-pointer transition-colors">
                    <Upload className="h-4 w-4 text-gray-500 mb-1" />
                    <span className="text-xs text-gray-500">Upload video</span>
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleRulesVideoUpload(file)
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Sponsorship Media Section */}
          <div className="border-t border-gray-800 p-3 sm:p-4 mb-10 border-b">
            <div className="flex items-center gap-2 mb-3">
              <Image className="h-4 w-4 text-purple-400" />
              <h3 className="font-display text-sm font-semibold text-white">Sponsorship Media</h3>
            </div>
            
            <div className="space-y-4">
              {/* Sponsor Logo */}
              <div>
                <label className="text-xs text-gray-400 block mb-1">Sponsor Logo</label>
                {sponsorshipImage ? (
                  <div className="relative rounded-lg overflow-hidden bg-black border border-gray-700 p-2 flex items-center justify-center">
                    <img
                      src={sponsorshipImage}
                      alt="Sponsor Logo"
                      className="max-h-24 w-auto object-contain bg-black"
                    />
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <button
                        onClick={handleRemoveSponsorLogo}
                        className="px-2 py-1 bg-red-500/80 rounded text-xs text-white"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-16 rounded-lg border-2 border-dashed border-gray-700 hover:border-purple-500/50 bg-gray-900/30 cursor-pointer transition-colors">
                    <Upload className="h-4 w-4 text-gray-500 mb-1" />
                    <span className="text-xs text-gray-500">Upload logo image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleSponsorLogoUpload}
                    />
                  </label>
                )}
              </div>

              {/* Sponsor Video */}
              <div>
                <label className="text-xs text-gray-400 block mb-1">Sponsor Video (Break Screen)</label>
                {sponsorshipVideoUrl ? (
                  <div className="relative rounded-lg overflow-hidden bg-black border border-gray-700">
                    <video
                      src={getMediaUrl(sponsorshipVideoUrl)!}
                      className="w-full h-32 object-contain bg-black"
                      controls
                      playsInline
                      muted
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <button
                        onClick={handleRemoveSponsorVideo}
                        className="px-2 py-1 bg-red-500/80 rounded text-xs text-white"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between">
                      {sponsorshipVideoFileName && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-900/80 text-gray-300 truncate max-w-[60%]">
                          {sponsorshipVideoFileName}
                        </span>
                      )}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/80 text-white">✓ Uploaded</span>
                    </div>
                  </div>
                ) : uploadingSponsorVideo ? (
                  <div className="rounded-lg border border-gray-700 p-3 bg-gray-900/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Loader2 className="h-3.5 w-3.5 text-purple-400 animate-spin" />
                      <span className="text-xs text-gray-400">Uploading...</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-purple-500 rounded-full"
                        animate={{ width: `${sponsorUploadProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-16 rounded-lg border-2 border-dashed border-gray-700 hover:border-purple-500/50 bg-gray-900/30 cursor-pointer transition-colors">
                    <Upload className="h-4 w-4 text-gray-500 mb-1" />
                    <span className="text-xs text-gray-500">Upload video</span>
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleSponsorVideoUpload(file)
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>


        </div>

        {/* Round Details / Questions */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 relative z-10">
          {expandedRound !== null && episode.rounds[expandedRound] ? (
            <>
              {/* Round Settings */}
              <div className="flex-shrink-0">
                <RoundSettings
                  key={episode.rounds[expandedRound].IDRound}
                  round={episode.rounds[expandedRound]}
                  onUpdate={(updates) => handleUpdateRound(episode.rounds[expandedRound].IDRound, updates)}
                />
              </div>

              {/* Questions */}
              <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                  <h3 className="font-display font-semibold text-white flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-purple-400" />
                    Questions
                  </h3>
                  <Button
                    size="sm"
                    onClick={() =>
                      handleAddQuestion(episode.rounds[expandedRound].IDRound, expandedRound)
                    }
                    disabled={isOperating}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Question
                  </Button>
                </div>
                <ScrollArea className="flex-1 min-h-0">
                  <div className="p-4 space-y-3">
                    {episode.rounds[expandedRound].questions.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No questions in this round</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleAddQuestion(episode.rounds[expandedRound].IDRound, expandedRound)
                          }
                          className="mt-4 border-purple-500/50 text-purple-400"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add First Question
                        </Button>
                      </div>
                    ) : (
                      episode.rounds[expandedRound].questions.map((question, qIndex) => (
                        <QuestionCard
                          key={question.IDQuestion}
                          question={question}
                          index={qIndex}
                          isExpanded={expandedQuestion === question.IDQuestion}
                          episodeId={episode.IDEpisode}
                          onToggle={() =>
                            setExpandedQuestion(
                              expandedQuestion === question.IDQuestion ? null : question.IDQuestion
                            )
                          }
                          onUpdate={(updates) =>
                            handleUpdateQuestion(question.IDQuestion, expandedRound, updates)
                          }
                          onDelete={() => handleDeleteQuestion(question.IDQuestion, expandedRound)}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Layers className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p>Select a round to view questions</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Round Settings Component
interface RoundSettingsProps {
  round: RoundWithQuestions
  onUpdate: (updates: Partial<Round>) => void
}

function RoundSettings({ round, onUpdate }: RoundSettingsProps) {
  const [timer, setTimer] = useState(round.TimerSeconds)
  const [scoringMode, setScoringMode] = useState(round.ScoringMode)
  const [negativeScoring, setNegativeScoring] = useState(round.NegativeScoring)
  const [pointPool, setPointPool] = useState(round.PointPoolOptions)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const initializedRef = useRef(false)
  const hasPendingChangesRef = useRef(false)
  const onUpdateRef = useRef(onUpdate)
  const currentValuesRef = useRef({ timer, scoringMode, negativeScoring, pointPool })

  onUpdateRef.current = onUpdate
  currentValuesRef.current = { timer, scoringMode, negativeScoring, pointPool }

  // Autosave with debounce
  useEffect(() => {
    // Skip initial render
    if (!initializedRef.current) {
      initializedRef.current = true
      return
    }

    hasPendingChangesRef.current = true

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      hasPendingChangesRef.current = false
      onUpdateRef.current({
        TimerSeconds: timer,
        ScoringMode: scoringMode,
        NegativeScoring: negativeScoring,
        PointPoolOptions: pointPool,
      })
    }, 1000)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [timer, scoringMode, negativeScoring, pointPool])

  // Flush pending changes on unmount (e.g., when switching rounds)
  useEffect(() => {
    return () => {
      if (hasPendingChangesRef.current) {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current)
        }
        const vals = currentValuesRef.current
        onUpdateRef.current({
          TimerSeconds: vals.timer,
          ScoringMode: vals.scoringMode,
          NegativeScoring: vals.negativeScoring,
          PointPoolOptions: vals.pointPool,
        })
      }
    }
  }, [])

  return (
    <div className="p-3 sm:p-4 border-b border-gray-800 bg-gray-900 overflow-x-auto">
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 min-w-0">
        <h3 className="font-display font-semibold text-white text-base">Round {round.RoundNumber}</h3>

        <div className="h-5 w-px bg-gray-700 hidden sm:block" />

        {/* Timer */}
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-500" />
          <div className="flex gap-1.5">
            {[10, 15, 20, 30, 45, 60].map((t) => (
              <button
                key={t}
                onClick={() => setTimer(t)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${timer === t
                  ? "bg-purple-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
              >
                {t}s
              </button>
            ))}
          </div>
        </div>

        <div className="h-5 w-px bg-gray-700 hidden sm:block" />

        {/* Scoring Mode */}
        <div className="flex gap-1.5">
          {[
            { value: "both", label: "Both", Icon: Zap },
            { value: "point_pool", label: "Pool", Icon: Target },
            { value: "timed", label: "Timed", Icon: Timer },
          ].map((mode) => (
            <button
              key={mode.value}
              onClick={() => setScoringMode(mode.value as ScoringMode)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all flex items-center gap-1.5 ${scoringMode === mode.value
                ? "bg-purple-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
            >
              <mode.Icon className="h-4 w-4" />
              <span>{mode.label}</span>
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-gray-700 hidden sm:block" />

        {/* Point Pool */}
        <div className="flex gap-1.5">
          {(() => {
            const qCount = Math.max(round.questions.length, 1)
            const presets = [
              { values: Array.from({ length: qCount }, (_, i) => i + 1) },
              { values: Array.from({ length: qCount }, (_, i) => (i + 1) * 2) },
              { values: Array.from({ length: qCount }, (_, i) => (i + 1) * 5) },
              { values: Array.from({ length: qCount }, (_, i) => (i + 1) * 2 - 1) },
            ]
            return presets.map((preset, idx) => (
              <button
                key={`${idx}-${preset.values.join("-")}`}
                onClick={() => setPointPool(preset.values)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${JSON.stringify(pointPool) === JSON.stringify(preset.values)
                  ? "bg-purple-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
              >
                {preset.values.join(",")}
              </button>
            ))
          })()}
        </div>

        <div className="h-5 w-px bg-gray-700 hidden sm:block" />

        {/* Negative Scoring */}
        <div className="flex items-center gap-2">
          <Switch checked={negativeScoring} onCheckedChange={setNegativeScoring} />
          <span className="text-sm text-gray-400">Negative</span>
        </div>
      </div>
    </div>
  )
}

// Question Card Component
interface QuestionCardProps {
  question: Question
  index: number
  isExpanded: boolean
  episodeId: string
  onToggle: () => void
  onUpdate: (updates: Partial<Question>) => void
  onDelete: () => void
}

function QuestionCard({
  question,
  index,
  isExpanded,
  episodeId,
  onToggle,
  onUpdate,
  onDelete,
}: QuestionCardProps) {
  const [text, setText] = useState(question.QuestionText)
  const [answer, setAnswer] = useState(question.CorrectAnswer)
  const [category, setCategory] = useState(question.Category || "")
  const [type, setType] = useState(question.QuestionType)
  const [options, setOptions] = useState(question.Options || ["", "", "", ""])
  const [questionVideoUrl, setQuestionVideoUrl] = useState(question.QuestionVideoUrl)
  const [answerVideoUrl, setAnswerVideoUrl] = useState(question.AnswerVideoUrl)
  const [notes, setNotes] = useState<string[]>(question.Notes || [])
  const [questionVideoFileName, setQuestionVideoFileName] = useState<string | null>(null)
  const [answerVideoFileName, setAnswerVideoFileName] = useState<string | null>(null)
  const [uploadingVideo, setUploadingVideo] = useState<"question" | "answer" | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStage, setUploadStage] = useState<"reading" | "optimizing" | "uploading" | null>(null)
  const notesPreview = notes.map((note) => note.trim()).filter((note) => note.length > 0)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const initializedRef = useRef(false)
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  // Autosave with debounce
  useEffect(() => {
    // Skip initial render
    if (!initializedRef.current) {
      initializedRef.current = true
      return
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      onUpdateRef.current({
        QuestionText: text,
        CorrectAnswer: answer,
        Category: category || undefined,
        QuestionType: type,
        Options: type === "multiple_choice" ? options.filter((o) => o.trim()) : undefined,
        Notes: notes.filter((n) => n.trim()).length > 0 ? notes.filter((n) => n.trim()) : null,
      })
    }, 1000)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [text, answer, category, type, options, notes])

  // Video upload handler
  const handleVideoUpload = async (file: File, videoType: "question" | "answer") => {
    setUploadingVideo(videoType)
    setUploadProgress(0)
    setUploadStage("uploading")

    // Track file name
    if (videoType === "question") {
      setQuestionVideoFileName(file.name)
    } else {
      setAnswerVideoFileName(file.name)
    }

    try {
      // Step 1: Request presigned upload URL
      setUploadProgress(10)
      const { upload_url, blob_path } = await mediaApi.requestUploadUrl({
        question_id: question.IDQuestion,
        video_type: videoType,
        filename: file.name,
      })

      // Step 2: Upload file directly to S3
      setUploadProgress(40)
      await mediaApi.uploadFileToS3(upload_url, file)

      // Step 3: Confirm upload with backend
      setUploadProgress(75)
      await mediaApi.confirmUpload({
        question_id: question.IDQuestion,
        video_type: videoType,
        blob_path,
      })

      // Re-fetch to get updated video URL
      setUploadProgress(90)
      const updatedEpisode = await episodesApi.get(episodeId)
      // Find the updated question in the episode rounds
      let updatedQuestion: typeof question | undefined
      for (const round of updatedEpisode.rounds || []) {
        updatedQuestion = round.questions?.find(q => q.IDQuestion === question.IDQuestion)
        if (updatedQuestion) break
      }

      setUploadProgress(100)
      await new Promise(r => setTimeout(r, 300))

      if (updatedQuestion) {
        if (videoType === "question") {
          setQuestionVideoUrl(updatedQuestion.QuestionVideoUrl)
        } else {
          setAnswerVideoUrl(updatedQuestion.AnswerVideoUrl)
        }
      }

      const { toast } = await import("sonner")
      toast.success(`${videoType === "question" ? "Question" : "Answer"} video uploaded!`)
    } catch (err) {
      console.error("Video upload failed:", err)
      const { toast } = await import("sonner")
      toast.error(`Failed to upload ${videoType} video`)
      // Clear file name on error
      if (videoType === "question") {
        setQuestionVideoFileName(null)
      } else {
        setAnswerVideoFileName(null)
      }
    } finally {
      setUploadingVideo(null)
      setUploadProgress(0)
      setUploadStage(null)
    }
  }

  return (
    <Card className="bg-gray-800/50 border-gray-700 overflow-hidden">
      {/* Header */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-700/30"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
          )}
          <span className="text-sm text-purple-400 font-medium flex-shrink-0">Q{index + 1}</span>
          {question.Category && (
            <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 flex-shrink-0">
              {question.Category}
            </span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${question.QuestionType === "multiple_choice"
            ? "bg-blue-500/20 text-blue-300"
            : question.QuestionType === "true_false"
              ? "bg-green-500/20 text-green-300"
              : "bg-yellow-500/20 text-yellow-300"
            }`}>
            {question.QuestionType === "multiple_choice" ? "MCQ" : question.QuestionType === "true_false" ? "T/F" : "OPEN"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-white truncate">{question.QuestionText}</p>
            {notesPreview.length > 0 ? (
              <ul className="list-disc list-inside text-[11px] text-gray-400 leading-snug mt-1 space-y-0.5">
                {notesPreview.slice(0, 2).map((note, noteIndex) => (
                  <li key={`${question.IDQuestion}-note-preview-${noteIndex}`} className="truncate">
                    {note}
                  </li>
                ))}
                {notesPreview.length > 2 && (
                  <li className="text-gray-500">+{notesPreview.length - 2} more notes</li>
                )}
              </ul>
            ) : (
              <p className="text-[11px] text-gray-500 mt-1">No host notes</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
            className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-700"
          >
            <div className="p-4 space-y-4">
              {/* Question Type Presets */}
              <div>
                <label className="text-xs text-gray-400 mb-2 block">Question Type</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "multiple_choice", label: "Multiple Choice", Icon: FileText },
                    { value: "true_false", label: "True/False", Icon: CheckCircle },
                    { value: "open_ended", label: "Open Ended", Icon: MessageSquare },
                  ].map((qType) => (
                    <button
                      key={qType.value}
                      onClick={() => {
                        setType(qType.value as QuestionType)
                        if (qType.value === "true_false") {
                          setOptions(["True", "False"])
                        } else if (qType.value === "multiple_choice") {
                          setOptions(["", "", "", ""])
                        } else {
                          setOptions([])
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${type === qType.value
                        ? "bg-purple-600 text-white"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                        }`}
                    >
                      <qType.Icon className="h-4 w-4" />
                      <span>{qType.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Category</label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g., Geography"
                  className="bg-gray-900 border-gray-600"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Question Text *</label>
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Enter your question..."
                  className="bg-gray-900 border-gray-600 resize-none"
                  rows={2}
                />
              </div>

              {/* Dynamic inputs based on question type */}
              {type === "true_false" ? (
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">Correct Answer *</label>
                  <div className="flex gap-2">
                    {["True", "False"].map((ans) => (
                      <button
                        key={ans}
                        onClick={() => setAnswer(ans)}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${answer === ans
                          ? ans === "True" ? "bg-green-600 text-white" : "bg-red-600 text-white"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                          }`}
                      >
                        {ans}
                      </button>
                    ))}
                  </div>
                </div>
              ) : type === "open_ended" ? (
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Correct Answer *</label>
                  <Input
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="The correct answer"
                    className="bg-gray-900 border-gray-600"
                  />
                </div>
              ) : null}

              {type === "multiple_choice" && (
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">
                    Options <span className="text-gray-500">— click a letter to mark correct answer</span>
                  </label>
                  <div className="space-y-2">
                    {options.map((opt, i) => {
                      const letter = String.fromCharCode(65 + i)
                      const isCorrect = answer === opt && opt.trim() !== ""
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (opt.trim()) setAnswer(opt)
                            }}
                            title={isCorrect ? "Correct answer" : "Mark as correct"}
                            className={`w-8 h-8 rounded flex items-center justify-center text-sm font-semibold flex-shrink-0 transition-colors ${isCorrect
                              ? "bg-green-600 text-white"
                              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                              }`}
                          >
                            {letter}
                          </button>
                          <Input
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...options]
                              const oldVal = newOpts[i]
                              newOpts[i] = e.target.value
                              setOptions(newOpts)
                              // If this was the correct answer, update to new value
                              if (answer === oldVal && oldVal.trim()) {
                                setAnswer(e.target.value)
                              }
                            }}
                            placeholder={`Option ${letter}`}
                            className="bg-gray-900 border-gray-600 flex-1"
                          />
                          {options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => {
                                const removed = options[i]
                                const newOpts = options.filter((_, idx) => idx !== i)
                                setOptions(newOpts)
                                if (answer === removed) setAnswer("")
                              }}
                              className="w-8 h-8 rounded flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-colors flex-shrink-0"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-center mt-3">
                    <button
                      type="button"
                      onClick={() => setOptions([...options, ""])}
                      className="px-3 py-1.5 rounded-lg text-sm text-gray-400 bg-gray-800 hover:bg-gray-700 hover:text-white transition-colors flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Option
                    </button>
                  </div>
                </div>
              )}

              {/* Host Notes Section */}
              <div className="border-t border-gray-700 pt-4">
                <label className="text-xs text-gray-400 mb-2 block flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Host Notes (Optional)
                </label>
                <div className="space-y-2">
                  {notes.map((note, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-800 text-xs font-medium text-gray-500 flex-shrink-0">
                        {i + 1}
                      </div>
                      <Input
                        value={note}
                        onChange={(e) => {
                          const newNotes = [...notes]
                          newNotes[i] = e.target.value
                          setNotes(newNotes)
                        }}
                        placeholder="e.g. Common wrong guess: London"
                        className="bg-gray-900 border-gray-600 flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newNotes = notes.filter((_, idx) => idx !== i)
                          setNotes(newNotes)
                        }}
                        className="w-8 h-8 rounded flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-colors flex-shrink-0"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex justify-start mt-3">
                  <button
                    type="button"
                    onClick={() => setNotes([...notes, ""])}
                    className="px-3 py-1.5 rounded-lg text-sm text-gray-400 bg-gray-800 hover:bg-gray-700 hover:text-white transition-colors flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Note
                  </button>
                </div>
              </div>

              {/* Video Upload Section */}
              <div className="border-t border-gray-700 pt-4">
                <label className="text-xs text-gray-400 mb-3 block flex items-center gap-1.5">
                  <Video className="h-3.5 w-3.5" /> Video Attachments
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Question Video */}
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">Question Video</p>
                    {questionVideoUrl ? (
                      <div className="relative rounded-lg overflow-hidden bg-black border border-gray-700">
                        <video
                          src={getMediaUrl(questionVideoUrl)!}
                          className="w-full h-32 object-contain bg-black"
                          controls
                          playsInline
                          muted
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <button
                            onClick={async () => {
                              setQuestionVideoUrl(null)
                              setQuestionVideoFileName(null)
                            }}
                            className="px-2 py-1 bg-red-500/80 rounded text-xs text-white"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between">
                          {questionVideoFileName && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-900/80 text-gray-300 truncate max-w-[60%]">
                              {questionVideoFileName}
                            </span>
                          )}
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/80 text-white ml-auto">✓ Uploaded</span>
                        </div>
                      </div>
                    ) : uploadingVideo === "question" ? (
                      <div className="rounded-lg border border-gray-700 p-3 bg-gray-900/50">
                        <div className="flex items-center gap-2 mb-2">
                          <Loader2 className="h-3.5 w-3.5 text-purple-400 animate-spin" />
                          <span className="text-xs text-gray-400 capitalize">
                            {uploadStage === "reading" ? "Reading file..." : uploadStage === "optimizing" ? "Optimizing..." : "Uploading..."}
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-purple-500 rounded-full"
                            animate={{ width: `${uploadProgress}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <p className="text-[10px] text-gray-600 mt-1 text-right">{uploadProgress}%</p>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-20 rounded-lg border-2 border-dashed border-gray-700 hover:border-purple-500/50 bg-gray-900/30 cursor-pointer transition-colors">
                        <Upload className="h-4 w-4 text-gray-500 mb-1" />
                        <span className="text-xs text-gray-500">Upload video</span>
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            handleVideoUpload(file, "question")
                          }}
                        />
                      </label>
                    )}
                  </div>

                  {/* Answer Video */}
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">Answer Video</p>
                    {answerVideoUrl ? (
                      <div className="relative rounded-lg overflow-hidden bg-black border border-gray-700">
                        <video
                          src={getMediaUrl(answerVideoUrl)!}
                          className="w-full h-32 object-contain bg-black"
                          controls
                          playsInline
                          muted
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <button
                            onClick={async () => {
                              setAnswerVideoUrl(null)
                              setAnswerVideoFileName(null)
                            }}
                            className="px-2 py-1 bg-red-500/80 rounded text-xs text-white"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between">
                          {answerVideoFileName && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-900/80 text-gray-300 truncate max-w-[60%]">
                              {answerVideoFileName}
                            </span>
                          )}
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/80 text-white ml-auto">✓ Uploaded</span>
                        </div>
                      </div>
                    ) : uploadingVideo === "answer" ? (
                      <div className="rounded-lg border border-gray-700 p-3 bg-gray-900/50">
                        <div className="flex items-center gap-2 mb-2">
                          <Loader2 className="h-3.5 w-3.5 text-green-400 animate-spin" />
                          <span className="text-xs text-gray-400 capitalize">
                            {uploadStage === "reading" ? "Reading file..." : uploadStage === "optimizing" ? "Optimizing..." : "Uploading..."}
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-green-500 rounded-full"
                            animate={{ width: `${uploadProgress}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <p className="text-[10px] text-gray-600 mt-1 text-right">{uploadProgress}%</p>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-20 rounded-lg border-2 border-dashed border-gray-700 hover:border-green-500/50 bg-gray-900/30 cursor-pointer transition-colors">
                        <Upload className="h-4 w-4 text-gray-500 mb-1" />
                        <span className="text-xs text-gray-500">Upload video</span>
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            handleVideoUpload(file, "answer")
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

