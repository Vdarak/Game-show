// ============================================
// Demo Game Generator
// Creates a full demo episode with all question types using the API
// ============================================

import { episodesApi, roundsApi, questionsApi } from "./api-client"
import type { Episode, Round, Question, QuestionType, ScoringMode } from "./api-types"

interface DemoGameResult {
  episode: Episode
  rounds: Round[]
  questions: Question[]
}

// Demo questions covering all question types
const demoQuestions = [
  // Round 1: Multiple Choice Questions (General Knowledge)
  {
    round: 1,
    order: 1,
    category: "Science",
    text: "What is the chemical symbol for gold?",
    type: "multiple_choice" as QuestionType,
    correctAnswer: "Au",
    options: ["Ag", "Au", "Fe", "Cu"],
  },
  {
    round: 1,
    order: 2,
    category: "Geography",
    text: "What is the capital of Australia?",
    type: "multiple_choice" as QuestionType,
    correctAnswer: "Canberra",
    options: ["Sydney", "Melbourne", "Canberra", "Brisbane"],
  },
  {
    round: 1,
    order: 3,
    category: "History",
    text: "In which year did World War II end?",
    type: "multiple_choice" as QuestionType,
    correctAnswer: "1945",
    options: ["1943", "1944", "1945", "1946"],
  },
  {
    round: 1,
    order: 4,
    category: "Sports",
    text: "How many players are on a standard soccer team on the field?",
    type: "multiple_choice" as QuestionType,
    correctAnswer: "11",
    options: ["9", "10", "11", "12"],
  },
  {
    round: 1,
    order: 5,
    category: "Entertainment",
    text: "Who directed the movie 'Inception'?",
    type: "multiple_choice" as QuestionType,
    correctAnswer: "Christopher Nolan",
    options: ["Steven Spielberg", "Christopher Nolan", "James Cameron", "Ridley Scott"],
  },

  // Round 2: True/False Questions
  {
    round: 2,
    order: 1,
    category: "Science",
    text: "The Earth is the third planet from the Sun.",
    type: "true_false" as QuestionType,
    correctAnswer: "True",
    options: ["True", "False"],
  },
  {
    round: 2,
    order: 2,
    category: "History",
    text: "The Great Wall of China is visible from space with the naked eye.",
    type: "true_false" as QuestionType,
    correctAnswer: "False",
    options: ["True", "False"],
  },
  {
    round: 2,
    order: 3,
    category: "Nature",
    text: "Dolphins are mammals, not fish.",
    type: "true_false" as QuestionType,
    correctAnswer: "True",
    options: ["True", "False"],
  },
  {
    round: 2,
    order: 4,
    category: "Technology",
    text: "The first iPhone was released in 2005.",
    type: "true_false" as QuestionType,
    correctAnswer: "False",
    options: ["True", "False"],
  },
  {
    round: 2,
    order: 5,
    category: "Geography",
    text: "Mount Everest is the tallest mountain on Earth.",
    type: "true_false" as QuestionType,
    correctAnswer: "True",
    options: ["True", "False"],
  },

  // Round 3: Open Ended Questions
  {
    round: 3,
    order: 1,
    category: "Math",
    text: "What is 15 × 8?",
    type: "open_ended" as QuestionType,
    correctAnswer: "120",
    options: null,
  },
  {
    round: 3,
    order: 2,
    category: "Literature",
    text: "Who wrote 'Romeo and Juliet'?",
    type: "open_ended" as QuestionType,
    correctAnswer: "Shakespeare",
    options: null,
  },
  {
    round: 3,
    order: 3,
    category: "Science",
    text: "What planet is known as the Red Planet?",
    type: "open_ended" as QuestionType,
    correctAnswer: "Mars",
    options: null,
  },
  {
    round: 3,
    order: 4,
    category: "Art",
    text: "Who painted the Mona Lisa?",
    type: "open_ended" as QuestionType,
    correctAnswer: "Leonardo da Vinci",
    options: null,
  },
  {
    round: 3,
    order: 5,
    category: "Music",
    text: "What band was Freddie Mercury the lead singer of?",
    type: "open_ended" as QuestionType,
    correctAnswer: "Queen",
    options: null,
  },

  // Round 4: Mixed Challenge Round (6 options for variety)
  {
    round: 4,
    order: 1,
    category: "Pop Culture",
    text: "Which of these movies was NOT directed by Quentin Tarantino?",
    type: "multiple_choice" as QuestionType,
    correctAnswer: "The Dark Knight",
    options: ["Pulp Fiction", "Kill Bill", "Django Unchained", "The Dark Knight", "Inglourious Basterds", "Reservoir Dogs"],
  },
  {
    round: 4,
    order: 2,
    category: "Food & Drink",
    text: "What is the main ingredient in traditional hummus?",
    type: "multiple_choice" as QuestionType,
    correctAnswer: "Chickpeas",
    options: ["Lentils", "Chickpeas", "Black beans", "White beans", "Peas", "Soybeans"],
  },
  {
    round: 4,
    order: 3,
    category: "Technology",
    text: "Which company created the first commercially successful smartphone?",
    type: "multiple_choice" as QuestionType,
    correctAnswer: "Apple",
    options: ["Nokia", "Samsung", "Apple", "BlackBerry", "Motorola", "HTC"],
  },
  {
    round: 4,
    order: 4,
    category: "Sports",
    text: "In which country did the modern Olympic Games originate?",
    type: "multiple_choice" as QuestionType,
    correctAnswer: "Greece",
    options: ["Italy", "Greece", "France", "United Kingdom", "Germany", "USA"],
  },
  {
    round: 4,
    order: 5,
    category: "Final Challenge",
    text: "What is the largest organ in the human body?",
    type: "multiple_choice" as QuestionType,
    correctAnswer: "Skin",
    options: ["Heart", "Liver", "Skin", "Brain", "Lungs", "Intestines"],
  },
]

// Round configurations
const roundConfigs = [
  {
    number: 1,
    timerSeconds: 20,
    pointPoolOptions: [100, 200, 300, 400],
    scoringMode: "point_pool" as ScoringMode,
    negativeScoring: false,
    timedBonusTiers: [],
  },
  {
    number: 2,
    timerSeconds: 15,
    pointPoolOptions: [200, 400, 600],
    scoringMode: "timed" as ScoringMode,
    negativeScoring: false,
    timedBonusTiers: [
      { within: 5, bonus: 100 },
      { within: 10, bonus: 50 },
    ],
  },
  {
    number: 3,
    timerSeconds: 30,
    pointPoolOptions: [300, 500, 700, 1000],
    scoringMode: "point_pool" as ScoringMode,
    negativeScoring: true,
    timedBonusTiers: [],
  },
  {
    number: 4,
    timerSeconds: 25,
    pointPoolOptions: [500, 750, 1000, 1500],
    scoringMode: "both" as ScoringMode,
    negativeScoring: false,
    timedBonusTiers: [
      { within: 8, bonus: 200 },
      { within: 15, bonus: 100 },
    ],
  },
]

/**
 * Creates a complete demo game using the API
 * This creates an episode with multiple rounds covering all question types
 */
export async function createDemoGame(): Promise<DemoGameResult> {
  const createdRounds: Round[] = []
  const createdQuestions: Question[] = []

  // 1. Create the episode
  const episode = await episodesApi.create({
    Title: "Demo Game - All Question Types",
    Description: "A sample game showcasing multiple choice, true/false, and open-ended questions across 4 rounds with different scoring modes.",
    ThemeConfig: {
      primaryColor: "#6C5CE7",
    },
    SponsorConfig: {
      name: "GATE",
      logo: "/gate-logo.png",
    },
  })

  console.log("[Demo Game] Created episode:", episode.IDEpisode)

  // 2. Create rounds
  for (const config of roundConfigs) {
    const round = await roundsApi.create({
      IDEpisode: episode.IDEpisode,
      RoundNumber: config.number,
      TimerSeconds: config.timerSeconds,
      PointPoolOptions: config.pointPoolOptions,
      ScoringMode: config.scoringMode,
      NegativeScoring: config.negativeScoring,
      TimedBonusTiers: config.timedBonusTiers,
    })
    createdRounds.push(round)
    console.log(`[Demo Game] Created round ${config.number}:`, round.IDRound)
  }

  // 3. Create questions
  for (const q of demoQuestions) {
    const round = createdRounds.find((r) => r.RoundNumber === q.round)
    if (!round) continue

    const question = await questionsApi.create({
      IDRound: round.IDRound,
      QuestionOrder: q.order,
      Category: q.category,
      QuestionText: q.text,
      QuestionType: q.type,
      CorrectAnswer: q.correctAnswer,
      Options: q.options || undefined,
    })
    createdQuestions.push(question)
    console.log(`[Demo Game] Created question ${q.round}.${q.order}:`, question.IDQuestion)
  }

  console.log("[Demo Game] Complete! Episode:", episode.Title)

  return {
    episode,
    rounds: createdRounds,
    questions: createdQuestions,
  }
}
