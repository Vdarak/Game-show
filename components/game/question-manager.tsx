"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Trash2, Edit2, Save, X, Settings } from "lucide-react"

interface Answer {
  id: string
  text: string
  points: number
  revealed: boolean
}

interface Question {
  id: string
  text: string
  answers: Answer[]
}

interface QuestionManagerProps {
  questions: Question[]
  onAddQuestion: (question: Omit<Question, "id">) => void
  onUpdateQuestion: (id: string, question: Omit<Question, "id">) => void
  onDeleteQuestion: (id: string) => void
}

export function QuestionManager({ questions, onAddQuestion, onUpdateQuestion, onDeleteQuestion }: QuestionManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
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

  const handleEdit = (question: Question) => {
    setEditingId(question.id)
    setQuestionText(question.text)
    setAnswers(question.answers.map(a => ({ text: a.text, points: a.points })))
  }

  const handleSave = () => {
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

    handleCancel()
  }

  const handleCancel = () => {
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

  const handleDelete = (id: string) => {
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          <Settings className="mr-2 h-4 w-4" />
          Manage
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
                      onClick={() => handleDelete(question.id)}
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
                <Button onClick={handleCancel} variant="ghost" size="sm">
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
                onClick={handleSave}
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
  )
}
