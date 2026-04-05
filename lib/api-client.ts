// ============================================
// Trivi-Time API Client
// ============================================

import type {
  LoginRequest,
  LoginResponse,
  CreateEpisodeRequest,
  UpdateEpisodeRequest,
  Episode,
  EpisodeWithRounds,
  CreateRoundRequest,
  UpdateRoundRequest,
  Round,
  CreateQuestionRequest,
  UpdateQuestionRequest,
  Question,
  MoveQuestionRequest,
  RequestUploadUrlPayload,
  RequestUploadUrlResponse,
  ConfirmUploadPayload,
  CreateSessionRequest,
  Session,
  SessionStatusResponse,
  GenerateHostLinkRequest,
  HostLinkResponse,
  ValidateHostLinkRequest,
  ValidateHostLinkResponse,
  HostLinkListRequest,
  HostLinkListItem,
  HostLinkRevokeRequest,
  JoinSessionRequest,
  LeaveSessionRequest,
  LeaveSessionResponse,
  Team,
  CurrentQuestionRequest,
  CurrentQuestionResponse,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
  PointPoolRequest,
  PointPoolResponse,
  GradeRequest,
  GradeResponse,
  GradeOverrideRequest,
  GradeOverrideResponse,
  LeaderboardResponse,
  ListResponsesRequest,
  TeamResponse,
  KickTeamRequest,
  KickTeamResponse,
  DeleteResponse,
  ApiError,
} from "./api-types"

// -------------------- Configuration --------------------
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""
const DEFAULT_MEDIA_CDN_BASE_URL = "https://triviatime-media-463884819756.s3.us-east-1.amazonaws.com"
const MEDIA_CDN_BASE_URL = (
  process.env.NEXT_PUBLIC_MEDIA_BASE_URL ||
  process.env.NEXT_PUBLIC_MEDIA_ASSET_BASE_URL ||
  DEFAULT_MEDIA_CDN_BASE_URL
).replace(/\/+$/, "")

const API_HOSTNAME = (() => {
  try {
    return API_BASE_URL ? new URL(API_BASE_URL).hostname.toLowerCase() : null
  } catch {
    return null
  }
})()

// Debug: Log API URL on startup (client-side only)
if (typeof window !== "undefined") {
  console.log("[API Client] Base URL:", API_BASE_URL || "(empty - check NEXT_PUBLIC_API_URL)")
}

export function getMediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined

  if (path.startsWith("data:")) return path

  const toCdnUrl = (rawPath: string) => {
    const normalized = rawPath.replace(/^\/+/, "")
    return `${MEDIA_CDN_BASE_URL}/${normalized}`
  }

  const isVideoPath = (value: string) => value.toLowerCase().startsWith("/videos/")

  if (path.startsWith("http://") || path.startsWith("https://")) {
    try {
      const parsed = new URL(path)
      const host = parsed.hostname.toLowerCase()
      const shouldRemapToCdn =
        isVideoPath(parsed.pathname) &&
        (
          host === API_HOSTNAME ||
          host.startsWith("api.") ||
          host.includes("gamesandtrivia.fun") ||
          host.includes("gameandtrivia.fun")
        )

      if (shouldRemapToCdn) {
        return toCdnUrl(parsed.pathname)
      }
    } catch {
      // Keep original URL when parsing fails.
    }

    return path
  }

  if (isVideoPath(path.startsWith("/") ? path : `/${path}`)) {
    return toCdnUrl(path)
  }

  return `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`
}

// -------------------- Token Management --------------------
let authToken: string | null = null
const HOST_TOKEN_STORAGE_KEY = "trivitime_host_token"

export function setAuthToken(token: string | null) {
  authToken = token
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem("trivitime_token", token)
    } else {
      localStorage.removeItem("trivitime_token")
    }
  }
}

export function getAuthToken(): string | null {
  if (authToken) return authToken
  if (typeof window !== "undefined") {
    authToken = localStorage.getItem("trivitime_token")
  }
  // Fall back to host token if no admin token exists
  if (!authToken) {
    return getHostToken()
  }
  return authToken
}

export function clearAuthToken() {
  authToken = null
  if (typeof window !== "undefined") {
    localStorage.removeItem("trivitime_token")
  }
}

export function setHostToken(token: string | null) {
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem(HOST_TOKEN_STORAGE_KEY, token)
    } else {
      localStorage.removeItem(HOST_TOKEN_STORAGE_KEY)
    }
  }
}

export function getHostToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(HOST_TOKEN_STORAGE_KEY)
  }
  return null
}

export function clearHostToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(HOST_TOKEN_STORAGE_KEY)
  }
}

// -------------------- Fetch Helper --------------------
class ApiClientError extends Error {
  status: number
  detail: string

  constructor(status: number, detail: string) {
    super(detail)
    this.name = "ApiClientError"
    this.status = status
    this.detail = detail
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: {
    method?: "GET" | "POST"
    body?: unknown
    requiresAuth?: boolean
  } = {}
): Promise<T> {
  const { method = "POST", body, requiresAuth = false } = options

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  }

  if (requiresAuth) {
    const token = getAuthToken()
    if (!token) {
      throw new ApiClientError(401, "No authentication token available")
    }
    headers["Authorization"] = `Bearer ${token}`
  }

  const url = `${API_BASE_URL}${endpoint}`
  console.log(`[API] ${method} ${url}`)

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (err) {
    console.error(`[API] Network error:`, err)
    throw new ApiClientError(0, `Network error: ${err instanceof Error ? err.message : 'Failed to fetch'}`)
  }

  if (!response.ok) {
    let detail = "Unknown error"
    try {
      const errorData: ApiError = await response.json()
      detail = errorData.detail
    } catch {
      detail = response.statusText
    }
    throw new ApiClientError(response.status, detail)
  }

  return response.json()
}

// -------------------- Auth API --------------------
export const authApi = {
  login: (data: LoginRequest): Promise<LoginResponse> =>
    apiRequest("/auth/login", { body: data }),
}

// -------------------- Episodes API --------------------
export const episodesApi = {
  create: (data: CreateEpisodeRequest): Promise<Episode> =>
    apiRequest("/episodes/create", { body: data, requiresAuth: true }),

  list: (): Promise<Episode[]> =>
    apiRequest("/episodes/list", { body: {}, requiresAuth: true }),

  get: (IDEpisode: string): Promise<EpisodeWithRounds> =>
    apiRequest("/episodes/get", { body: { IDEpisode }, requiresAuth: true }),

  update: (data: UpdateEpisodeRequest): Promise<Episode> =>
    apiRequest("/episodes/update", { body: data, requiresAuth: true }),

  delete: (IDEpisode: string): Promise<DeleteResponse> =>
    apiRequest("/episodes/delete", { body: { IDEpisode }, requiresAuth: true }),

  deleteSponsorshipVideo: (IDEpisode: string): Promise<DeleteResponse> =>
    apiRequest("/episodes/delete-sponsorship-video", { body: { IDEpisode }, requiresAuth: true }),
}

// -------------------- Rounds API --------------------
export const roundsApi = {
  create: (data: CreateRoundRequest): Promise<Round> =>
    apiRequest("/rounds/create", { body: data, requiresAuth: true }),

  update: (data: UpdateRoundRequest): Promise<Round> =>
    apiRequest("/rounds/update", { body: data, requiresAuth: true }),

  delete: (IDRound: string): Promise<DeleteResponse> =>
    apiRequest("/rounds/delete", { body: { IDRound }, requiresAuth: true }),
}

// -------------------- Questions API --------------------
export const questionsApi = {
  create: (data: CreateQuestionRequest): Promise<Question> =>
    apiRequest("/questions/create", { body: data, requiresAuth: true }),

  update: (data: UpdateQuestionRequest): Promise<Question> =>
    apiRequest("/questions/update", { body: data, requiresAuth: true }),

  delete: (IDQuestion: string): Promise<DeleteResponse> =>
    apiRequest("/questions/delete", { body: { IDQuestion }, requiresAuth: true }),

  move: (data: MoveQuestionRequest): Promise<Question> =>
    apiRequest("/questions/move", { body: data, requiresAuth: true }),
}

// -------------------- Media API (Presigned Upload) --------------------
export const mediaApi = {
  requestUploadUrl: (data: RequestUploadUrlPayload): Promise<RequestUploadUrlResponse> =>
    apiRequest("/media/request-upload-url", { body: data, requiresAuth: true }),

  confirmUpload: (data: ConfirmUploadPayload): Promise<string> =>
    apiRequest("/media/confirm-upload", { body: data, requiresAuth: true }),

  uploadFileToS3: async (uploadUrl: string, file: File): Promise<void> => {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    })

    if (!response.ok) {
      throw new Error(`Failed to upload file to storage (${response.status})`)
    }
  },
}

// -------------------- Sessions API --------------------
export const sessionsApi = {
  // Host-only (requires auth)
  create: (data: CreateSessionRequest): Promise<Session> =>
    apiRequest("/sessions/create", { body: data, requiresAuth: true }),

  start: (IDGameSession: string): Promise<Session> =>
    apiRequest("/sessions/start", { body: { IDGameSession }, requiresAuth: true }),

  nextQuestion: (IDGameSession: string): Promise<Session> =>
    apiRequest("/sessions/next-question", { body: { IDGameSession }, requiresAuth: true }),

  end: (IDGameSession: string): Promise<Session> =>
    apiRequest("/sessions/end", { body: { IDGameSession }, requiresAuth: true }),

  restart: (IDGameSession: string): Promise<Session> =>
    apiRequest("/sessions/restart", { body: { IDGameSession }, requiresAuth: true }),

  grade: (data: GradeRequest): Promise<GradeResponse> =>
    apiRequest("/sessions/grade", { body: data, requiresAuth: true }),

  gradeOverride: (data: GradeOverrideRequest): Promise<GradeOverrideResponse> =>
    apiRequest("/sessions/grade-override", { body: data, requiresAuth: true }),

  responses: (data: ListResponsesRequest): Promise<TeamResponse[]> =>
    apiRequest("/sessions/responses", { body: data, requiresAuth: true }),

  kick: (data: KickTeamRequest): Promise<KickTeamResponse> =>
    apiRequest("/sessions/kick", { body: data, requiresAuth: true }),

  advanceState: (IDGameSession: string): Promise<Session> =>
    apiRequest("/sessions/advance-state", { body: { IDGameSession }, requiresAuth: true }),

  startTimer: (IDGameSession: string): Promise<Session> =>
    apiRequest("/sessions/start-timer", { body: { IDGameSession }, requiresAuth: true }),

  setBreak: (IDGameSession: string): Promise<Session> =>
    apiRequest("/sessions/set-break", { body: { IDGameSession }, requiresAuth: true }),

  resetQuestion: (IDGameSession: string): Promise<Session> =>
    apiRequest("/sessions/reset-question", { body: { IDGameSession }, requiresAuth: true }),

  prevQuestion: (IDGameSession: string): Promise<Session> =>
    apiRequest("/sessions/prev-question", { body: { IDGameSession }, requiresAuth: true }),

  // Public endpoints (no auth)
  status: (IDGameSession: string): Promise<SessionStatusResponse> =>
    apiRequest("/sessions/status", { body: { IDGameSession } }),

  join: (data: JoinSessionRequest): Promise<Team> =>
    apiRequest("/sessions/join", { body: data }),

  leave: (data: LeaveSessionRequest): Promise<LeaveSessionResponse> =>
    apiRequest("/sessions/leave", { body: data }),

  currentQuestion: (data: CurrentQuestionRequest): Promise<CurrentQuestionResponse> =>
    apiRequest("/sessions/current-question", { body: data }),

  submit: (data: SubmitAnswerRequest): Promise<SubmitAnswerResponse> =>
    apiRequest("/sessions/submit", { body: data }),

  pointPool: (data: PointPoolRequest): Promise<PointPoolResponse> =>
    apiRequest("/sessions/point-pool", { body: data }),

  leaderboard: (IDGameSession: string): Promise<LeaderboardResponse> =>
    apiRequest("/sessions/leaderboard", { body: { IDGameSession } }),

  teams: (IDGameSession: string): Promise<Team[]> =>
    apiRequest("/sessions/teams", { body: { IDGameSession } }),
}

// -------------------- Host Links API --------------------
export const hostLinksApi = {
  generate: (data: GenerateHostLinkRequest): Promise<HostLinkResponse> =>
    apiRequest("/host-link/generate", { body: data, requiresAuth: true }),

  validate: (data: ValidateHostLinkRequest): Promise<ValidateHostLinkResponse> =>
    apiRequest("/host-link/validate", { body: data }),

  list: (data?: HostLinkListRequest): Promise<HostLinkListItem[]> =>
    apiRequest("/host-link/list", { body: data || {}, requiresAuth: true }),

  revoke: (data: HostLinkRevokeRequest): Promise<string> =>
    apiRequest("/host-link/revoke", { body: data, requiresAuth: true }),
}

// -------------------- Export Error Class --------------------
export { ApiClientError }
