import type { Question } from "@/hooks/use-game-state"

// Format score with comma separators
export function formatScore(score: number): string {
  return score.toLocaleString()
}

// Calculate round winner based on current round scores
export function calculateRoundWinner(teamAScore: number, teamBScore: number): "A" | "B" | "tie" {
  if (teamAScore > teamBScore) return "A"
  if (teamBScore > teamAScore) return "B"
  return "tie"
}

// Get total points from all answers in a question
export function getTotalPoints(question: Question | null): number {
  if (!question) return 0
  return question.answers.reduce((sum, answer) => sum + answer.points, 0)
}

// Get revealed points from a question
export function getRevealedPoints(question: Question | null): number {
  if (!question) return 0
  return question.answers.filter((answer) => answer.revealed).reduce((sum, answer) => sum + answer.points, 0)
}

// Generate unique session ID
export function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

// Sound effect types
export type SoundType = "buzz" | "ding" | "applause" | "wrong" | "celebration" | "drumroll"

// Play sound effect (placeholder implementation)
export function playSound(type: SoundType, volume = 0.5): void {
  console.log(`[v0] Playing sound: ${type} at volume ${volume}`)
  // In a real implementation, this would use Web Audio API or HTML5 Audio
  // For now, we'll just log the sound effect
}
