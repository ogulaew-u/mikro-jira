let accessToken: string | null = null

const parseErrorMessage = async (response: Response) => {
  try {
    const payload = await response.json()
    if (payload && typeof payload.error === 'string') {
      return payload.error
    }
  } catch {
    // ignore parse errors
  }

  return `HTTP ${response.status}`
}

const baseFetch = (path: string, init?: RequestInit) =>
  fetch(`/api${path}`, {
    credentials: 'include',
    ...init,
  })

export const setAccessToken = (value: string | null) => {
  accessToken = value
}

export const refreshAuthToken = async () => {
  const response = await baseFetch('/auth/refresh', { method: 'POST' })
  if (!response.ok) {
    setAccessToken(null)
    return null
  }

  const payload = await response.json()
  if (typeof payload?.accessToken === 'string') {
    setAccessToken(payload.accessToken)
  }

  return payload
}

export const apiRequest = async <T = unknown>(
  path: string,
  init: RequestInit = {},
  allowRetry = true
): Promise<T> => {
  const headers = new Headers(init.headers ?? {})

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await baseFetch(path, { ...init, headers })

  if (response.status === 401 && allowRetry) {
    const refreshed = await refreshAuthToken()
    if (refreshed?.accessToken) {
      return apiRequest<T>(path, init, false)
    }
  }

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
