"use client"

import { useGameState } from "@/hooks/use-game-state"
import { EndingScreen } from "@/components/game/ending-screen"

export default function EndingDisplayPage() {
  const { state } = useGameState()

  return (
    <EndingScreen
      sponsorName={state.sponsorName || "Our Amazing Sponsors"}
      sponsorLogo={state.sponsorLogo || "/logos/sponsor-logo.png"}
      chibiImage={state.chibiImage || "/chibi-swag.png"}
    />
  )
}
