import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMe, guestLogin as guestLoginRequest, login as loginRequest, register as registerRequest } from '../api/authApi'
import { configureHttpClient, HttpError } from '../api/httpClient'
import type { AuthUser, LoginRequest, RegisterRequest } from '../types/auth'

const AUTH_TOKEN_KEY = 'auth_token'

interface AuthContextValue {
  token: string | null
  user: AuthUser | null
  isInitializing: boolean
  isAuthenticated: boolean
  login: (payload: LoginRequest) => Promise<void>
  guestLogin: () => Promise<void>
  register: (payload: RegisterRequest) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const tokenRef = useRef<string | null>(null)

  const setSession = useCallback((nextToken: string, nextUser: AuthUser) => {
    localStorage.setItem(AUTH_TOKEN_KEY, nextToken)
    tokenRef.current = nextToken
    setToken(nextToken)
    setUser(nextUser)
  }, [])

  const clearSession = useCallback(
    (shouldRedirect = true) => {
      localStorage.removeItem(AUTH_TOKEN_KEY)
      tokenRef.current = null
      setToken(null)
      setUser(null)

      if (shouldRedirect) {
        navigate('/login', { replace: true })
      }
    },
    [navigate],
  )

  useEffect(() => {
    configureHttpClient({
      getToken: () => tokenRef.current,
      onUnauthorized: () => clearSession(true),
    })
  }, [clearSession])

  useEffect(() => {
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY)

    if (!storedToken) {
      setIsInitializing(false)
      return
    }

    tokenRef.current = storedToken
    setToken(storedToken)

    void getMe()
      .then((currentUser) => {
        setUser(currentUser)
      })
      .catch((error) => {
        if (error instanceof HttpError && error.status === 401) {
          clearSession(false)
          return
        }

        clearSession(false)
      })
      .finally(() => {
        setIsInitializing(false)
      })
  }, [clearSession])

  const login = useCallback(
    async (payload: LoginRequest) => {
      const response = await loginRequest(payload)
      setSession(response.token, response.user)
      navigate('/', { replace: true })
    },
    [navigate, setSession],
  )

  const guestLogin = useCallback(async () => {
    const response = await guestLoginRequest()
    setSession(response.token, response.user)
    navigate('/', { replace: true })
  }, [navigate, setSession])

  const register = useCallback(
    async (payload: RegisterRequest) => {
      const response = await registerRequest(payload)
      setSession(response.token, response.user)
      navigate('/', { replace: true })
    },
    [navigate, setSession],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      isInitializing,
      isAuthenticated: Boolean(token && user),
      login,
      guestLogin,
      register,
      logout: () => clearSession(true),
    }),
    [clearSession, guestLogin, isInitializing, login, register, token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
