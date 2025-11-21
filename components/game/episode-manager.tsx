"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Play, Save, Trash2, Edit2, Check, X, Download, Upload } from "lucide-react"

export interface Episode {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  data: {
    teams: any[]
    questions: any[]
    surveyFooterTexts: string[]
    lightningRound: any
    sponsorName: string
  }
}

interface EpisodeManagerProps {
  episodes: Episode[]
  currentEpisodeName: string
  onSaveEpisode: (name: string, overwrite?: boolean) => void
  onLoadEpisode: (episodeId: string) => void
  onRenameEpisode: (episodeId: string, newName: string) => void
  onDeleteEpisode: (episodeId: string) => void
}

export function EpisodeManager({
  episodes,
  currentEpisodeName,
  onSaveEpisode,
  onLoadEpisode,
  onRenameEpisode,
  onDeleteEpisode,
}: EpisodeManagerProps) {
  const [newEpisodeName, setNewEpisodeName] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [saveMode, setSaveMode] = useState<"new" | "overwrite">("new")

  const handleSave = () => {
    if (!newEpisodeName.trim()) return
    
    if (saveMode === "overwrite") {
      const existingEpisode = episodes.find(ep => ep.name === newEpisodeName)
      if (existingEpisode) {
        if (confirm(`Overwrite episode "${newEpisodeName}"?`)) {
          onSaveEpisode(newEpisodeName, true)
          setNewEpisodeName("")
        }
      } else {
        onSaveEpisode(newEpisodeName, false)
        setNewEpisodeName("")
      }
    } else {
      onSaveEpisode(newEpisodeName, false)
      setNewEpisodeName("")
    }
  }

  const handleRename = (episodeId: string) => {
    if (!editName.trim()) return
    onRenameEpisode(episodeId, editName)
    setEditingId(null)
    setEditName("")
  }

  const handleDelete = (episodeId: string, episodeName: string) => {
    if (confirm(`Delete episode "${episodeName}"? This cannot be undone.`)) {
      onDeleteEpisode(episodeId)
    }
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  return (
    <div className="space-y-6">
      {/* Current Episode Display */}
      <Card className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-purple-500 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 mb-1">Current Episode</p>
            <h3 className="text-xl font-bold text-purple-300">{currentEpisodeName || "Unsaved Episode"}</h3>
          </div>
          <Play className="h-8 w-8 text-purple-400" />
        </div>
      </Card>

      {/* Save Episode Section */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white">Save Current Configuration</h3>
        <div className="flex gap-2">
          <Input
            value={newEpisodeName}
            onChange={(e) => setNewEpisodeName(e.target.value)}
            placeholder="Enter episode name..."
            className="flex-1 bg-gray-700 border-gray-600 text-white"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <Button onClick={handleSave} variant="default" disabled={!newEpisodeName.trim()}>
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
        </div>
        <p className="text-xs text-gray-400">
          Saves teams, themes, questions, footer texts, and lightning round configuration
        </p>
      </div>

      {/* Saved Episodes List */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white">Saved Episodes ({episodes.length})</h3>
        
        {episodes.length === 0 ? (
          <Card className="bg-gray-700/50 border-gray-600 p-6 text-center">
            <p className="text-gray-400">No saved episodes yet</p>
            <p className="text-xs text-gray-500 mt-1">Save your first episode to get started</p>
          </Card>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {episodes.map((episode) => (
              <motion.div
                key={episode.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-700 rounded-lg p-3 border border-gray-600 hover:border-gray-500 transition-colors"
              >
                {editingId === episode.id ? (
                  <div className="flex gap-2 items-center">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 bg-gray-800 border-gray-600 text-white h-8"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(episode.id)
                        if (e.key === "Escape") {
                          setEditingId(null)
                          setEditName("")
                        }
                      }}
                    />
                    <Button
                      onClick={() => handleRename(episode.id)}
                      variant="default"
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => {
                        setEditingId(null)
                        setEditName("")
                      }}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-white truncate">{episode.name}</h4>
                      <div className="flex gap-3 text-xs text-gray-400 mt-1">
                        <span>Created: {formatDate(episode.createdAt)}</span>
                        {episode.updatedAt !== episode.createdAt && (
                          <span>Updated: {formatDate(episode.updatedAt)}</span>
                        )}
                      </div>
                      <div className="flex gap-2 text-xs text-gray-500 mt-1">
                        <span>{episode.data.questions.length} questions</span>
                        <span>•</span>
                        <span>{episode.data.teams.length} teams</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        onClick={() => onLoadEpisode(episode.id)}
                        variant="default"
                        size="sm"
                        className="h-8 px-3"
                      >
                        <Upload className="mr-1 h-3 w-3" />
                        Load
                      </Button>
                      <Button
                        onClick={() => {
                          setEditingId(episode.id)
                          setEditName(episode.name)
                        }}
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(episode.id, episode.name)}
                        variant="destructive"
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
