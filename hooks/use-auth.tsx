"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import {
  authApi,
  setAuthToken,
  getAuthToken,
  clearAuthToken,
  ApiClientError,
} from "@/lib/api-client"
import type { LoginResponse } from "@/lib/api-types"

// -------------------- Types --------------------
interface AuthUser {
  user_id: string
  email: string
  display_name: string
}

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  error: string | null
}

// -------------------- Context --------------------
const AuthContext = createContext<AuthContextValue | null>(null)

// -------------------- Provider --------------------
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check for existing token on mount
  useEffect(() => {
    const token = getAuthToken()
    if (token) {
      // We have a token, try to restore user from localStorage
      const storedUser = localStorage.getItem("trivitime_user")
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser))
        } catch {
          // Invalid stored user, clear everything
          clearAuthToken()
          localStorage.removeItem("trivitime_user")
        }
      }
    }
    setIsLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response: LoginResponse = await authApi.login({
        Email: email,
        Password: password,
      })

      // Store token
      setAuthToken(response.access_token)

      // Store user info
      const authUser: AuthUser = {
        user_id: response.user_id,
        email: response.email,
        display_name: response.display_name,
      }
      setUser(authUser)
      localStorage.setItem("trivitime_user", JSON.stringify(authUser))
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.detail)
      } else {
        setError("An unexpected error occurred")
      }
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    clearAuthToken()
    localStorage.removeItem("trivitime_user")
    setUser(null)
    setError(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// -------------------- Hook --------------------
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// -------------------- Protected Route Helper --------------------
export function useRequireAuth(redirectTo = "/auth/login") {
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = redirectTo
    }
  }, [isAuthenticated, isLoading, redirectTo])

  return { isAuthenticated, isLoading }
}
