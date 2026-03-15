export interface FrontendAvatarOption {
  id: string
  label: string
  path: string
}

export const FRONTEND_AVATAR_OPTIONS: FrontendAvatarOption[] = [
  { id: "bear", label: "Bear", path: "/avatars/bear.png" },
  { id: "clown_face", label: "Clown Face", path: "/avatars/clown_face.png" },
  { id: "cow", label: "Cow", path: "/avatars/cow.png" },
  { id: "dog", label: "Dog", path: "/avatars/dog.png" },
  { id: "ghost", label: "Ghost", path: "/avatars/ghost.png" },
  { id: "lion_face", label: "Lion Face", path: "/avatars/lion_face.png" },
  { id: "monkey_face", label: "Monkey Face", path: "/avatars/monkey_face.png" },
  { id: "pig", label: "Pig", path: "/avatars/pig.png" },
  { id: "skull", label: "Skull", path: "/avatars/skull.png" },
  { id: "space_invader", label: "Space Invader", path: "/avatars/space_invader.png" },
]

export const FRONTEND_AVATAR_PATHS = FRONTEND_AVATAR_OPTIONS.map((avatar) => avatar.path)

const RAW_BASE64_PATTERN = /^[A-Za-z0-9+/=_-]+$/
const RELATIVE_IMAGE_PATH_PATTERN = /^[A-Za-z0-9/_-]+\.(png|jpe?g|gif|webp|svg)$/i

export interface AvatarValueSource {
  AvatarBlobPath?: string | null
  AvatarBase64?: string | null
}

function normalizeApiBaseUrl(apiBaseUrl: string): string {
  return apiBaseUrl.endsWith("/") ? apiBaseUrl.slice(0, -1) : apiBaseUrl
}

function looksLikeRawBase64(value: string): boolean {
  const compact = value.replace(/\s+/g, "")
  return compact.length >= 64 && RAW_BASE64_PATTERN.test(compact)
}

export function getAvatarValue(source: AvatarValueSource | null | undefined): string | null {
  if (!source) return null

  const rawAvatar = source.AvatarBase64 ?? source.AvatarBlobPath ?? null
  if (typeof rawAvatar !== "string") return null

  const trimmed = rawAvatar.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function normalizeAvatarSource(
  avatarValue: string | null | undefined,
  apiBaseUrl: string
): string | null {
  if (!avatarValue) return null

  const trimmed = avatarValue.trim()
  if (!trimmed) return null

  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  if (trimmed.startsWith("/avatars/")) {
    return trimmed
  }

  const normalizedBase = normalizeApiBaseUrl(apiBaseUrl)

  if (trimmed.startsWith("/")) {
    return `${normalizedBase}${trimmed}`
  }

  if (RELATIVE_IMAGE_PATH_PATTERN.test(trimmed)) {
    return `${normalizedBase}${normalizedBase ? "/" : ""}${trimmed}`
  }

  if (looksLikeRawBase64(trimmed)) {
    return `data:image/png;base64,${trimmed.replace(/\s+/g, "")}`
  }

  return null
}

export function getDeterministicAvatarPath(teamName: string, teamId?: string | null): string {
  const seed = `${teamId ?? ""}|${teamName ?? ""}`.trim() || "team"
  let hash = 0

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0
  }

  const resolvedIndex = Math.abs(hash) % FRONTEND_AVATAR_PATHS.length
  return FRONTEND_AVATAR_PATHS[resolvedIndex]
}
