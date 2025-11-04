"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { io, Socket } from "socket.io-client"

interface RoomState {
  roomCode: string | null
  isHost: boolean
  connected: boolean
  participants: number
}

const generateRoomCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export function useRoomSync() {
  const [roomState, setRoomState] = useState<RoomState>({
    roomCode: null,
    isHost: false,
    connected: false,
    participants: 1,
  })
  const [isOnline, setIsOnline] = useState(true)
  const socketRef = useRef<Socket | null>(null)
  const channelRef = useRef<BroadcastChannel | null>(null)

  useEffect(() => {
    // Check if we already have a room code
    const savedRoomCode = localStorage.getItem("gameshow-room-code")
    const savedIsHost = localStorage.getItem("gameshow-is-host") === "true"
    
    if (savedRoomCode) {
      setRoomState(prev => ({
        ...prev,
        roomCode: savedRoomCode,
        isHost: savedIsHost,
      }))
    }

    // Check online status
    const checkOnline = () => {
      setIsOnline(navigator.onLine)
    }
    
    checkOnline()
    window.addEventListener("online", checkOnline)
    window.addEventListener("offline", checkOnline)

    // Set up local broadcast channel for offline sync
    try {
      channelRef.current = new BroadcastChannel("gameshow-room-sync")
      channelRef.current.onmessage = (event) => {
        if (event.data.type === "room-update") {
          setRoomState(prev => ({ ...prev, participants: event.data.participants }))
        }
      }
    } catch (error) {
      console.log("[Room] BroadcastChannel not supported, using localStorage only")
    }

    return () => {
      window.removeEventListener("online", checkOnline)
      socketRef.current?.disconnect()
      channelRef.current?.close()
    }
  }, [])

  const createRoom = useCallback(() => {
    const roomCode = generateRoomCode()
    localStorage.setItem("gameshow-room-code", roomCode)
    localStorage.setItem("gameshow-is-host", "true")
    
    setRoomState({
      roomCode,
      isHost: true,
      connected: true,
      participants: 1,
    })

    // In offline mode, we're done
    if (!isOnline) {
      return roomCode
    }

    // TODO: In online mode, connect to server
    // For now, we'll use local sync only
    return roomCode
  }, [isOnline])

  const joinRoom = useCallback((code: string) => {
    localStorage.setItem("gameshow-room-code", code)
    localStorage.setItem("gameshow-is-host", "false")
    
    setRoomState({
      roomCode: code,
      isHost: false,
      connected: true,
      participants: 2, // Assume host is already there
    })

    // TODO: In online mode, connect to server
    return true
  }, [isOnline])

  const leaveRoom = useCallback(() => {
    localStorage.removeItem("gameshow-room-code")
    localStorage.removeItem("gameshow-is-host")
    socketRef.current?.disconnect()
    
    setRoomState({
      roomCode: null,
      isHost: false,
      connected: false,
      participants: 1,
    })
  }, [])

  const broadcastToRoom = useCallback((data: any) => {
    // Broadcast locally
    channelRef.current?.postMessage({
      type: "game-state-update",
      data,
    })

    // TODO: Broadcast online if connected
  }, [])

  return {
    roomState,
    isOnline,
    createRoom,
    joinRoom,
    leaveRoom,
    broadcastToRoom,
  }
}
