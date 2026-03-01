"use client"

import { useState } from "react"
import Image from "next/image"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface TeamAvatarProps {
  avatarPath: string | null
  teamName: string
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}

const sizeClasses = {
  sm: "w-6 h-6 text-lg",
  md: "w-8 h-8 text-xl",
  lg: "w-12 h-12 text-3xl",
  xl: "w-16 h-16 text-5xl",
}

const imageSizes = {
  sm: 24,
  md: 32,
  lg: 48,
  xl: 64,
}

export function TeamAvatar({
  avatarPath,
  teamName,
  size = "md",
  className = "",
}: TeamAvatarProps) {
  const [imageError, setImageError] = useState(false)

  // Check if avatarPath is a valid URL path (starts with /)
  const isImagePath = avatarPath && avatarPath.startsWith("/") && !imageError
  const imageUrl = isImagePath ? `${API_BASE_URL}${avatarPath}` : null

  // Generate consistent fallback emoji from team name
  const fallbackEmoji = getTeamEmoji(teamName)

  if (imageUrl) {
    return (
      <div
        className={`relative rounded-full overflow-hidden bg-gray-700 flex items-center justify-center ${sizeClasses[size]} ${className}`}
      >
        <Image
          src={imageUrl}
          alt={teamName}
          width={imageSizes[size]}
          height={imageSizes[size]}
          className="object-cover"
          onError={() => setImageError(true)}
        />
      </div>
    )
  }

  return (
    <span className={`flex items-center justify-center ${sizeClasses[size]} ${className}`}>
      {fallbackEmoji}
    </span>
  )
}

// Generate a consistent emoji based on team name
function getTeamEmoji(teamName: string): string {
  const emojis = ["🦊", "🐻", "🦁", "🐼", "🐸", "🐵", "🐯", "🦄", "🐲", "🦅", "🐺", "🦈", "🎮", "🎯", "🏆", "⚡"]
  let hash = 0
  for (let i = 0; i < teamName.length; i++) {
    hash = ((hash << 5) - hash + teamName.charCodeAt(i)) | 0
  }
  return emojis[Math.abs(hash) % emojis.length]
}
