"use client"

import { Dithering } from "@paper-design/shaders-react"
import { memo } from "react"

interface DitherBackgroundProps {
  colorBack?: string
  colorFront?: string
  speed?: number
  shape?: "wave" | "dots" | "simplex" | "warp" | "ripple" | "swirl" | "sphere"
  type?: "4x4" | "8x8"
  pxSize?: number
  scale?: number
}

// Memoized dithering component for better performance
const MemoizedDithering = memo(Dithering)

export function DitherBackground({
  colorBack = "#00000000",
  colorFront = "#FF4500",
  speed = 0.2,
  shape = "wave",
  type = "4x4",
  pxSize = 1,
  scale = 1.13,
}: DitherBackgroundProps) {
  return (
    <MemoizedDithering
      colorBack={colorBack}
      colorFront={colorFront}
      speed={speed}
      shape={shape}
      type={type}
      pxSize={pxSize}
      scale={scale}
      className="absolute inset-0 -z-0"
    />
  )
}
