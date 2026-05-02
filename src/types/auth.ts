export interface AuthUser {
  id: number
  username: string
  displayName: string
  createdAt: number
}

export interface AuthSession {
  userId: number
  token: string
  rememberMe: boolean
  expiresAt: number | null
  createdAt: number
}

export const AUTH_USERS_STORAGE_KEY = 'mikro-jira.auth.users.v1'
export const AUTH_SESSION_STORAGE_KEY = 'mikro-jira.auth.session.v1'
