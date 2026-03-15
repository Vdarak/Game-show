"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { getDeterministicAvatarPath, normalizeAvatarSource } from "@/lib/frontend-avatars"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface TeamAvatarProps {
  avatarPath?: string | null
  avatarBase64?: string | null
  teamName: string
  teamId?: string | null
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
  avatarBase64,
  teamName,
  teamId,
  size = "md",
  className = "",
}: TeamAvatarProps) {
  const [primaryImageError, setPrimaryImageError] = useState(false)
  const [fallbackImageError, setFallbackImageError] = useState(false)

  useEffect(() => {
    setPrimaryImageError(false)
    setFallbackImageError(false)
  }, [avatarPath, avatarBase64, teamId, teamName])

  const avatarValue = avatarBase64 ?? avatarPath
  const resolvedImageUrl = primaryImageError
    ? null
    : normalizeAvatarSource(avatarValue, API_BASE_URL)
  const fallbackAvatarPath = getDeterministicAvatarPath(teamName, teamId)

  const avatarClasses = `relative rounded-full overflow-hidden bg-gray-700 flex items-center justify-center ${sizeClasses[size]} ${className}`

  if (resolvedImageUrl) {
    return (
      <div className={avatarClasses}>
        <Image
          src={resolvedImageUrl}
          alt={teamName}
          width={imageSizes[size]}
          height={imageSizes[size]}
          className="object-cover"
          onError={() => setPrimaryImageError(true)}
        />
      </div>
    )
  }

  if (!fallbackImageError) {
    return (
      <div className={avatarClasses}>
        <Image
          src={fallbackAvatarPath}
          alt={`${teamName} avatar`}
          width={imageSizes[size]}
          height={imageSizes[size]}
          className="object-cover"
          onError={() => setFallbackImageError(true)}
        />
      </div>
    )
  }

  return (
    <span className={`flex items-center justify-center font-semibold text-gray-200 ${sizeClasses[size]} ${className}`}>
      {(teamName.trim().charAt(0) || "?").toUpperCase()}
    </span>
  )
}
