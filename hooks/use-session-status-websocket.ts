"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { SessionStatusResponse } from "@/lib/api-types"

type ConnectionState = "idle" | "connecting" | "connected" | "reconnecting" | "disconnected" | "error"

export interface SessionSocketEvent {
  event: string
  [key: string]: unknown
}

interface UseSessionStatusWebSocketOptions {
  enabled?: boolean
  reconnect?: boolean
  maxReconnectDelayMs?: number
}

function getWebSocketBaseUrl(): string | null {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim()

  if (configured) {
    try {
      const parsed = new URL(configured)
      const protocol = parsed.protocol === "https:" ? "wss:" : parsed.protocol === "http:" ? "ws:" : parsed.protocol
      const pathname = parsed.pathname.endsWith("/") ? parsed.pathname.slice(0, -1) : parsed.pathname
      return `${protocol}//${parsed.host}${pathname}`
    } catch {
      if (configured.startsWith("wss://") || configured.startsWith("ws://")) {
        return configured.replace(/\/$/, "")
      }
      if (configured.startsWith("https://")) {
        return `wss://${configured.slice("https://".length).replace(/\/$/, "")}`
      }
      if (configured.startsWith("http://")) {
        return `ws://${configured.slice("http://".length).replace(/\/$/, "")}`
      }
      return `wss://${configured.replace(/\/$/, "")}`
    }
  }

  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    return `${protocol}//${window.location.host}`
  }

  return null
}

function buildSessionSocketUrl(roomCode: string): string | null {
  const baseUrl = getWebSocketBaseUrl()
  if (!baseUrl) return null
  return `${baseUrl}/ws/${encodeURIComponent(roomCode)}`
}

function isSessionPayload(value: unknown): value is SessionStatusResponse {
  if (!value || typeof value !== "object") return false
  const payload = value as Partial<SessionStatusResponse>
  return typeof payload.IDGameSession === "string" && typeof payload.RoomCode === "string"
}

export function useSessionStatusWebSocket(
  roomCode: string | null,
  options: UseSessionStatusWebSocketOptions = {}
) {
  const { enabled = true, reconnect = true, maxReconnectDelayMs = 10_000 } = options

  const [serverStatus, setServerStatus] = useState<SessionStatusResponse | null>(null)
  const [lastEvent, setLastEvent] = useState<SessionSocketEvent | null>(null)
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle")
  const [lastError, setLastError] = useState<string | null>(null)
  const [localTimerRemaining, setLocalTimerRemaining] = useState<number | null>(null)

  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const shouldReconnectRef = useRef(true)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearReconnectTimer = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
  }

  const clearCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
  }

  useEffect(() => {
    clearCountdown()

    if (serverStatus?.GameState !== "timer_running") {
      setLocalTimerRemaining(
        serverStatus?.GameState === "timer_ended" ? 0 : (serverStatus?.TimerRemaining ?? null)
      )
      return
    }

    const initialRemaining =
      typeof serverStatus.TimerRemaining === "number"
        ? serverStatus.TimerRemaining
        : (serverStatus.TimerTotal ?? null)

    if (initialRemaining === null) {
      setLocalTimerRemaining(null)
      return
    }

    setLocalTimerRemaining(initialRemaining)

    countdownRef.current = setInterval(() => {
      setLocalTimerRemaining((prev) => {
        if (prev === null) return null
        if (prev <= 1) {
          clearCountdown()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return clearCountdown
  }, [serverStatus?.GameState, serverStatus?.TimerRemaining, serverStatus?.TimerTotal, serverStatus?.IDGameSession])

  useEffect(() => {
    if (!enabled || !roomCode) {
      shouldReconnectRef.current = false
      clearReconnectTimer()

      if (socketRef.current) {
        socketRef.current.close()
        socketRef.current = null
      }

      setConnectionState("idle")
      setLastError(null)
      setServerStatus(null)
      setLastEvent(null)
      setLocalTimerRemaining(null)
      return
    }

    shouldReconnectRef.current = true

    const socketUrl = buildSessionSocketUrl(roomCode)
    if (!socketUrl) {
      setConnectionState("error")
      setLastError("Could not build WebSocket URL")
      return
    }

    const connect = () => {
      clearReconnectTimer()

      setConnectionState(reconnectAttemptsRef.current > 0 ? "reconnecting" : "connecting")

      const socket = new WebSocket(socketUrl)
      socketRef.current = socket

      socket.onopen = () => {
        reconnectAttemptsRef.current = 0
        setConnectionState("connected")
        setLastError(null)
      }

      socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data)

          if (parsed && typeof parsed === "object" && "event" in parsed) {
            const maybePayload = parsed as { event?: unknown }
            if (typeof maybePayload.event === "string" && maybePayload.event !== "state_update") {
              setLastEvent(parsed as SessionSocketEvent)
              return
            }
          }

          if (isSessionPayload(parsed)) {
            setServerStatus(parsed)
          }
        } catch {
          // Ignore malformed frames; server may send non-state events.
        }
      }

      socket.onerror = () => {
        setConnectionState("error")
        setLastError("WebSocket connection error")
      }

      socket.onclose = () => {
        if (socketRef.current === socket) {
          socketRef.current = null
        }

        if (!shouldReconnectRef.current || !reconnect) {
          setConnectionState("disconnected")
          return
        }

        reconnectAttemptsRef.current += 1
        const delayMs = Math.min(1000 * (2 ** (reconnectAttemptsRef.current - 1)), maxReconnectDelayMs)
        reconnectTimerRef.current = setTimeout(connect, delayMs)
      }
    }

    connect()

    return () => {
      shouldReconnectRef.current = false
      clearReconnectTimer()

      if (socketRef.current) {
        socketRef.current.close()
        socketRef.current = null
      }

      setConnectionState("disconnected")
    }
  }, [roomCode, enabled, reconnect, maxReconnectDelayMs])

  useEffect(() => {
    return () => {
      shouldReconnectRef.current = false
      clearReconnectTimer()
      clearCountdown()

      if (socketRef.current) {
        socketRef.current.close()
        socketRef.current = null
      }
    }
  }, [])

  const status = useMemo(() => {
    if (!serverStatus) return null

    if (serverStatus.GameState === "timer_running" && localTimerRemaining !== null) {
      return { ...serverStatus, TimerRemaining: Math.max(localTimerRemaining, 0) }
    }

    if (serverStatus.GameState === "timer_ended") {
      return { ...serverStatus, TimerRemaining: 0 }
    }

    return serverStatus
  }, [serverStatus, localTimerRemaining])

  return {
    status,
    lastEvent,
    connectionState,
    isConnected: connectionState === "connected",
    lastError,
  }
}
