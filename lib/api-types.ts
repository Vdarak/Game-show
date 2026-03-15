// ============================================
// Trivi-Time API TypeScript Definitions
// ============================================

// -------------------- Auth --------------------
export interface LoginRequest {
  Email: string
  Password: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user_id: string
  email: string
  display_name: string
}

// -------------------- Episodes --------------------
export interface ThemeConfig {
  primaryColor?: string
  [key: string]: unknown
}

export interface SponsorConfig {
  name?: string
  logo?: string
  [key: string]: unknown
}

export interface CreateEpisodeRequest {
  Title: string
  Description?: string
  ThemeConfig?: ThemeConfig
  SponsorConfig?: SponsorConfig
  RulesContent?: string[]
  SponsorshipImage?: string | null
}

export interface UpdateEpisodeRequest {
  IDEpisode: string
  Title?: string
  Description?: string
  ThemeConfig?: ThemeConfig
  SponsorConfig?: SponsorConfig
  RulesContent?: string[]
  SponsorshipImage?: string | null
}

export interface Episode {
  IDEpisode: string
  IDUser: string
  Title: string
  Description: string | null
  ThemeConfig: ThemeConfig | null
  SponsorConfig: SponsorConfig | null
  RulesContent: string[] | null
  RulesVideoUrl: string | null
  SponsorshipImage: string | null
  SponsorshipVideoUrl: string | null
  CreatedAt: string
  UpdatedAt: string
}

export interface EpisodeWithRounds extends Episode {
  rounds: RoundWithQuestions[]
}

// -------------------- Rounds --------------------
export interface TimedBonusTier {
  within: number
  bonus: number
}

export type ScoringMode = "point_pool" | "timed" | "both"

export interface CreateRoundRequest {
  IDEpisode: string
  RoundNumber: number
  TimerSeconds?: number
  PointPoolOptions?: number[]
  TimedBonusTiers?: TimedBonusTier[]
  NegativeScoring?: boolean
  ScoringMode?: ScoringMode
}

export interface UpdateRoundRequest {
  IDRound: string
  RoundNumber?: number
  TimerSeconds?: number
  PointPoolOptions?: number[]
  TimedBonusTiers?: TimedBonusTier[]
  NegativeScoring?: boolean
  ScoringMode?: ScoringMode
}

export interface Round {
  IDRound: string
  IDEpisode: string
  RoundNumber: number
  TimerSeconds: number
  PointPoolOptions: number[]
  TimedBonusTiers: TimedBonusTier[]
  NegativeScoring: boolean
  ScoringMode: ScoringMode
}

export interface RoundWithQuestions extends Round {
  questions: Question[]
}

// -------------------- Questions --------------------
export type QuestionType = "multiple_choice" | "true_false" | "open_ended"

export interface CreateQuestionRequest {
  IDRound: string
  QuestionOrder: number
  Category?: string
  QuestionText: string
  QuestionType?: QuestionType
  CorrectAnswer: string
  Options?: string[]
  QuestionVideoUrl?: string | null
  AnswerVideoUrl?: string | null
  TimerSecondsOverride?: number | null
  ScoringModeOverride?: ScoringMode | null
  Notes?: string[] | null
}

export interface UpdateQuestionRequest {
  IDQuestion: string
  QuestionOrder?: number
  Category?: string
  QuestionText?: string
  QuestionType?: QuestionType
  CorrectAnswer?: string
  Options?: string[]
  TimerSecondsOverride?: number | null
  ScoringModeOverride?: ScoringMode | null
  Notes?: string[] | null
}

export interface Question {
  IDQuestion: string
  IDRound: string
  QuestionOrder: number
  Category: string | null
  QuestionText: string
  QuestionType: QuestionType
  CorrectAnswer: string
  Options: string[] | null
  QuestionVideoUrl: string | null
  AnswerVideoUrl: string | null
  TimerSecondsOverride: number | null
  ScoringModeOverride: ScoringMode | null
  Notes: string[] | null
}

export interface MoveQuestionRequest {
  IDQuestion: string
  NewIDRound: string
}

export interface RequestUploadUrlPayload {
  question_id?: string
  episode_id?: string
  video_type: "question" | "answer" | "rules" | "sponsorship"
  filename: string
}

export interface RequestUploadUrlResponse {
  upload_url: string
  blob_path: string
  expires_in: number
}

export interface ConfirmUploadPayload {
  question_id?: string
  episode_id?: string
  video_type: "question" | "answer" | "rules" | "sponsorship"
  blob_path: string
}

// -------------------- Sessions --------------------
export type SessionStatus = "lobby" | "active" | "completed"

export type GameState =
  | "lobby"
  | "welcome"
  | "rules"
  | "get_ready"
  | "announced"
  | "video_playing"
  | "options_revealed"
  | "timer_running"
  | "timer_ended"
  | "answer_reveal"
  | "break"
  | "completed"

export interface CreateSessionRequest {
  IDEpisode: string
}

export interface Session {
  IDGameSession: string
  IDEpisode: string
  IDUser: string
  RoomCode: string
  Status: SessionStatus
  CurrentRound: number | null
  CurrentQuestion: number | null
  QuestionStartedAt: string | null
  GameState: GameState | null
  PreBreakState: GameState | null
  TimerRemaining: number | null
  TimerTotal: number | null
  CreatedAt: string
  QRData: string
}

export interface SessionStatusResponse extends Session {
  team_count: number
  Category?: string | null
  CurrentCategory?: string | null
  QuestionCategory?: string | null
  RulesContent?: string[] | null
  RulesVideoUrl?: string | null
  SponsorshipImage?: string | null
  SponsorshipVideoUrl?: string | null
}

// -------------------- Host Links --------------------
export interface GenerateHostLinkRequest {
  IDEpisode: string
  ValidFrom: string       // ISO date string
  ValidTo: string         // ISO date string
  HostName: string        // Name of the host receiving the link
}

export interface HostLinkResponse {
  token: string
  IDGameSession: string
  RoomCode: string
  PIN: string
  ValidFrom: string
  ValidTo: string
  HostName: string
}

export interface ValidateHostLinkRequest {
  Token: string
  PIN: string
}

export interface HostLinkListRequest {
  IDEpisode?: string
}

export interface HostLinkListItem {
  IDGameSession: string
  IDEpisode: string
  EpisodeTitle: string
  RoomCode: string
  HostName: string
  ValidFrom: string
  ValidTo: string
  CreatedAt: string
  Status: string
}

export interface HostLinkRevokeRequest {
  IDGameSession: string
}

// -------------------- Teams --------------------
export interface JoinSessionRequest {
  RoomCode: string
  TeamName: string
  AvatarBase64?: string | null
}

export interface Team {
  IDTeam: string
  IDGameSession: string
  TeamName: string
  AvatarBlobPath?: string | null
  AvatarBase64?: string | null
  JoinedAt: string
}

// -------------------- Player Question --------------------
export interface CurrentQuestionRequest {
  IDGameSession: string
  IDTeam: string
}

export interface CurrentQuestionResponse {
  IDQuestion: string
  IDRound: string
  QuestionOrder: number
  Category: string | null
  QuestionText: string
  QuestionType: QuestionType
  Options: string[] | null
  QuestionVideoUrl: string | null
  TimerSeconds: number
  AvailableWagers: number[]
  QuestionStartedAt: string
}

// -------------------- Submissions --------------------
export interface SubmitAnswerRequest {
  IDGameSession: string
  IDTeam: string
  IDQuestion: string
  AnswerText: string
  WageredPoints: number
}

export interface SubmitAnswerResponse {
  IDResponse: string
  IDTeam: string
  IDQuestion: string
  AnswerText: string
  WageredPoints: number
  SubmissionSeconds: number
  WasOnTime: boolean
  TimedBonusAwarded: number
}

export interface PointPoolRequest {
  IDGameSession: string
  IDTeam: string
}

export interface PointPoolResponse {
  IDRound: string
  RoundNumber: number
  AvailableValues: number[]
}

// -------------------- Grading --------------------
export interface GradeRequest {
  IDGameSession: string
}

export interface GradedResponse {
  IDResponse: string
  IDTeam: string
  IDQuestion: string
  AnswerText: string
  WageredPoints: number
  IsCorrect: boolean
  WasOnTime: boolean
  TimedBonusAwarded: number
  PointsAwarded: number
}

export interface GradeResponse {
  session_id: string
  total_graded: number
  responses: GradedResponse[]
}

// -------------------- Grade Override --------------------
export interface GradeOverrideItem {
  IDResponse: string
  IsCorrect: boolean
}

export interface GradeOverrideRequest {
  IDGameSession: string
  overrides: GradeOverrideItem[]
}

export interface GradeOverrideResponse {
  updated: number
  response_ids: string[]
}

// -------------------- Leaderboard --------------------
export interface LeaderboardEntry {
  IDTeam: string
  TeamName: string
  AvatarBlobPath?: string | null
  AvatarBase64?: string | null
  TotalScore: number
  RoundScore: number
  Rank: number
}

export interface LeaderboardResponse {
  IDGameSession: string
  entries: LeaderboardEntry[]
}

// -------------------- Responses --------------------
export interface ListResponsesRequest {
  IDGameSession: string
  IDQuestion?: string | null
}

export interface TeamResponse {
  IDResponse: string
  IDTeam: string
  IDQuestion: string
  AnswerText: string
  WageredPoints: number
  IsCorrect: boolean | null
  WasOnTime: boolean
  TimedBonusAwarded: number
  SubmissionSeconds: number
}

// -------------------- Kick --------------------
export interface KickTeamRequest {
  IDGameSession: string
  IDTeam: string
}

export interface KickTeamResponse {
  kicked: boolean
  TeamName: string
}

// -------------------- Generic --------------------
export interface DeleteResponse {
  deleted: boolean
}

export interface ApiError {
  detail: string
}
