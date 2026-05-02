import { computed, ref } from 'vue'
import { apiRequest, refreshAuthToken, setAccessToken } from '../lib/api'
import type { AuthUser } from '../types/auth'

interface AuthResult {
  ok: boolean
  error?: string
}

interface RegisterPayload {
  username: string
  displayName: string
  password: string
  rememberMe: boolean
}

interface LoginPayload {
  username: string
  password: string
  rememberMe: boolean
}

interface AuthPayload {
  accessToken: string
  user: AuthUser
}

export const useAuth = () => {
  const currentUser = ref<AuthUser | null>(null)
  const isReady = ref(false)

  const applyAuthPayload = (payload: AuthPayload | null) => {
    if (!payload?.accessToken || !payload.user) {
      setAccessToken(null)
      currentUser.value = null
      return
    }

    setAccessToken(payload.accessToken)
    currentUser.value = payload.user
  }

  const initialize = async () => {
    try {
      const payload = await refreshAuthToken()
      applyAuthPayload(payload)
    } catch {
      applyAuthPayload(null)
    } finally {
      isReady.value = true
    }
  }

  const register = async (payload: RegisterPayload): Promise<AuthResult> => {
    try {
      const result = await apiRequest<AuthPayload>(
        '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
        false
      )
      applyAuthPayload(result)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Не удалось зарегистрироваться.' }
    }
  }

  const login = async (payload: LoginPayload): Promise<AuthResult> => {
    try {
      const result = await apiRequest<AuthPayload>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
        false
      )
      applyAuthPayload(result)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Не удалось войти.' }
    }
  }

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' }, false)
    } catch {
      // ignore network errors during logout
    }
    applyAuthPayload(null)
  }

  void initialize()

  return {
    currentUser,
    isReady,
    isAuthenticated: computed(() => currentUser.value !== null),
    register,
    login,
    logout,
  }
}
