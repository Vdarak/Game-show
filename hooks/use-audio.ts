"use client"

import { useEffect, useRef, useState, useCallback } from "react"

type SoundType = "buzz" | "ding" | "duplicate" | "buzzer" | "whoosh" | "answer-reveal" | "point-reveal"

interface AudioCache {
  [key: string]: AudioBuffer
}

export function useAudio() {
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioBuffersRef = useRef<AudioCache>({})
  const [isReady, setIsReady] = useState(false)
  const [playingSound, setPlayingSound] = useState<SoundType | null>(null)

  // Initialize Web Audio API
  useEffect(() => {
    const initAudio = () => {
      if (!audioContextRef.current) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        audioContextRef.current = audioContext
        console.log("[Audio] AudioContext initialized")
      }
      setIsReady(true)
    }

    // Try to initialize immediately
    try {
      initAudio()
    } catch (error) {
      console.warn("[Audio] Could not initialize immediately, waiting for user interaction:", error)
    }

    // Also initialize on first user interaction (required by some browsers)
    const handleFirstInteraction = () => {
      initAudio()
      document.removeEventListener("click", handleFirstInteraction)
      document.removeEventListener("keydown", handleFirstInteraction)
      document.removeEventListener("touchstart", handleFirstInteraction)
    }

    document.addEventListener("click", handleFirstInteraction)
    document.addEventListener("keydown", handleFirstInteraction)
    document.addEventListener("touchstart", handleFirstInteraction)

    return () => {
      document.removeEventListener("click", handleFirstInteraction)
      document.removeEventListener("keydown", handleFirstInteraction)
      document.removeEventListener("touchstart", handleFirstInteraction)
    }
  }, [])

  // Preload sound
  const preloadSound = useCallback(async (type: SoundType, filename: string) => {
    console.log(`[Audio] Preload requested for: ${type} (${filename})`)
    
    if (!audioContextRef.current) {
      console.warn(`[Audio] AudioContext not ready for ${type}`)
      return
    }
    
    if (audioBuffersRef.current[type]) {
      console.log(`[Audio] Already cached: ${type}`)
      return
    }

    try {
      // Try /sounds directory first, fallback to /
      console.log(`[Audio] Fetching from /sounds/${filename}`)
      let response = await fetch(`/sounds/${filename}`).catch((err) => {
        console.log(`[Audio] Fetch /sounds failed:`, err)
        return null
      })
      
      if (!response || response.status !== 200) {
        console.log(`[Audio] Status ${response?.status}, trying root directory for ${filename}`)
        response = await fetch(`/${filename}`)
      }
      
      if (!response || response.status !== 200) {
        console.error(`[Audio] Sound file not found: ${filename} (HTTP ${response?.status})`)
        return
      }

      console.log(`[Audio] Successfully fetched ${filename}, decoding...`)
      const arrayBuffer = await response.arrayBuffer()
      
      if (arrayBuffer.byteLength === 0) {
        console.error(`[Audio] Empty audio buffer for: ${filename}`)
        return
      }
      
      console.log(`[Audio] Decoding audio buffer (${arrayBuffer.byteLength} bytes)...`)
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer)
      audioBuffersRef.current[type] = audioBuffer
      console.log(`[Audio] ✅ Successfully preloaded: ${type} (${filename}) - ${audioBuffer.duration.toFixed(2)}s`)
    } catch (error) {
      console.error(`[Audio] ❌ Failed to preload sound ${type} (${filename}):`, error)
    }
  }, [])

  // Play sound
  const playSound = useCallback((type: SoundType, volume: number = 1) => {
    console.log(`[Audio] Play requested for: ${type}`)
    
    if (!audioContextRef.current) {
      console.error(`[Audio] ❌ AudioContext not available`)
      return
    }

    const buffer = audioBuffersRef.current[type]
    const availableBuffers = Object.keys(audioBuffersRef.current)
    
    if (!buffer) {
      console.error(`[Audio] ❌ Sound buffer not found for type: ${type}`)
      console.log(`[Audio] Available buffers: ${availableBuffers.length > 0 ? availableBuffers.join(", ") : "NONE"}`)
      return
    }

    const ctx = audioContextRef.current

    try {
      const source = ctx.createBufferSource()
      const gainNode = ctx.createGain()

      source.buffer = buffer
      gainNode.gain.value = Math.min(1, Math.max(0, volume))

      source.connect(gainNode)
      gainNode.connect(ctx.destination)

      setPlayingSound(type)
      console.log(`[Audio] ✅ Now playing: ${type} (${buffer.duration.toFixed(2)}s)`)

      source.onended = () => {
        console.log(`[Audio] ✅ Finished: ${type}`)
        setPlayingSound(null)
      }

      source.start(0)
    } catch (error) {
      console.error(`[Audio] ❌ Failed to play sound ${type}:`, error)
      setPlayingSound(null)
    }
  }, [])

  return {
    isReady,
    playSound,
    preloadSound,
    playingSound,
  }
}
