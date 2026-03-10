"use client"

import { useRef, useCallback, useEffect } from "react"

/**
 * Lightweight hook to play sound effects from /public/sounds/.
 * Returns play / stop helpers; auto-cleans up on unmount.
 */
export function useSound(src: string, { loop = false, volume = 1 } = {}) {
    const audioRef = useRef<HTMLAudioElement | null>(null)

    // Lazily create the Audio element (client-side only)
    const getAudio = useCallback(() => {
        if (typeof window === "undefined") return null
        if (!audioRef.current) {
            audioRef.current = new Audio(src)
            audioRef.current.loop = loop
            audioRef.current.volume = volume
        }
        return audioRef.current
    }, [src, loop, volume])

    const play = useCallback(() => {
        const audio = getAudio()
        if (!audio) return
        // If already playing (e.g. looping music), don't restart
        if (!audio.paused) return
        audio.currentTime = 0
        audio.play().catch(() => {
            // Autoplay may be blocked — silently ignore
        })
    }, [getAudio])

    const stop = useCallback(() => {
        const audio = audioRef.current
        if (!audio) return
        audio.pause()
        audio.currentTime = 0
    }, [])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            const audio = audioRef.current
            if (audio) {
                audio.pause()
                audio.currentTime = 0
                audioRef.current = null
            }
        }
    }, [])

    return { play, stop }
}
