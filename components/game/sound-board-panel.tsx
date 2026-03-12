"use client"

import { useRef, useState, useCallback } from "react"
import { motion } from "framer-motion"
import { Volume2, Play, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface SoundEffect {
    name: string
    filename: string
    color: string
}

const SOUND_EFFECTS: SoundEffect[] = [
    { name: "Correct", filename: "dong.wav", color: "border-green-600" },
    { name: "Wrong", filename: "wrong-buzzer.wav", color: "border-red-600" },
    { name: "Answer Reveal", filename: "answer-reveal.wav", color: "border-cyan-600" },
    { name: "Point Reveal", filename: "point-reveal.wav", color: "border-orange-600" },
    { name: "Buzzer", filename: "player-buzzer.wav", color: "border-purple-600" },
    { name: "Duplicate", filename: "duplicate-answer.wav", color: "border-yellow-600" },
    { name: "Whoosh", filename: "answer-box-fly-whoosh.wav", color: "border-blue-600" },
    { name: "Excitement", filename: "excitement.wav", color: "border-pink-600" },
    { name: "Face Off", filename: "face-off.wav", color: "border-amber-600" },
    { name: "Time Up", filename: "time-up.wav", color: "border-rose-600" },
    { name: "Timer", filename: "timer.wav", color: "border-indigo-600" },
]

interface SoundBoardPanelProps {
    introMusicPlaying: boolean
    onToggleIntroMusic: () => void
}

export function SoundBoardPanel({ introMusicPlaying, onToggleIntroMusic }: SoundBoardPanelProps) {
    const [playingSound, setPlayingSound] = useState<string | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    const playSound = useCallback((filename: string) => {
        // Stop any currently playing sound effect
        if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current.currentTime = 0
        }

        const audio = new Audio(`/sounds/${filename}`)
        audioRef.current = audio
        setPlayingSound(filename)

        audio.play().catch(() => { })
        audio.addEventListener("ended", () => {
            setPlayingSound(null)
            audioRef.current = null
        })
    }, [])

    const stopSound = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current.currentTime = 0
            audioRef.current = null
        }
        setPlayingSound(null)
    }, [])

    const playingSoundName = playingSound
        ? SOUND_EFFECTS.find(s => s.filename === playingSound)?.name || playingSound
        : null

    return (
        <Card className="bg-gray-800 border-gray-700 p-4">
            <h2 className="mb-4 font-display text-sm">Sound Effects</h2>

            {/* Sound Effect Buttons */}
            <div className="mb-4 flex gap-2 flex-wrap">
                {SOUND_EFFECTS.map((sound) => (
                    <motion.button
                        key={sound.filename}
                        onClick={() => playSound(sound.filename)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        className={`relative flex-1 min-w-20 flex flex-col items-center justify-center py-3 px-2 rounded-lg font-display font-bold text-white transition-all duration-200 border ${sound.color} border-opacity-70 bg-gray-700 hover:border-opacity-100`}
                    >
                        <motion.div
                            animate={
                                playingSound === sound.filename
                                    ? { scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }
                                    : { scale: 1, rotate: 0 }
                            }
                            transition={{
                                duration: 0.3,
                                repeat: playingSound === sound.filename ? Infinity : 0,
                            }}
                            className="flex flex-col items-center"
                        >
                            <Volume2 className="h-5 w-5 mb-1" />
                        </motion.div>
                        <span className="text-xs text-center px-1">{sound.name}</span>
                    </motion.button>
                ))}
            </div>

            {/* Now Playing / Background Music */}
            <div className="border-t border-gray-600 pt-4">
                <h3 className="mb-2 font-display text-sm text-gray-300">Background Music</h3>

                {/* Now Playing indicator */}
                {(playingSound || introMusicPlaying) && (
                    <div className="mb-2 text-xs text-green-400 flex items-center gap-1">
                        <Volume2 className="h-3 w-3 animate-pulse" />
                        <span>
                            Now Playing: {introMusicPlaying && !playingSound
                                ? "Intro Music"
                                : playingSoundName}
                        </span>
                        <button
                            onClick={playingSound ? stopSound : onToggleIntroMusic}
                            className="ml-auto text-red-400 hover:text-red-300 text-xs underline"
                        >
                            Stop
                        </button>
                    </div>
                )}

                {/* Music Controls */}
                <div className="space-y-2">
                    <div className="flex gap-2 items-center">
                        <span className="text-xs text-gray-400 min-w-[100px]">Intro Music:</span>
                        <Button
                            onClick={onToggleIntroMusic}
                            disabled={false}
                            variant={introMusicPlaying ? "default" : "outline"}
                            size="sm"
                            className="flex-1 text-xs"
                        >
                            {introMusicPlaying ? (
                                <>
                                    <Square className="mr-1 h-3 w-3" />
                                    Stop
                                </>
                            ) : (
                                <>
                                    <Play className="mr-1 h-3 w-3" />
                                    Play
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Stop All */}
                    <Button
                        onClick={() => {
                            stopSound()
                            if (introMusicPlaying) onToggleIntroMusic()
                        }}
                        disabled={!playingSound && !introMusicPlaying}
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                    >
                        <Square className="mr-2 h-3 w-3" />
                        Stop All
                    </Button>
                </div>
            </div>
        </Card>
    )
}
