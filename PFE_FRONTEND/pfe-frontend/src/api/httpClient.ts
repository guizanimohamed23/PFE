const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

type TokenGetter = () => string | null
type UnauthorizedHandler = () => void

let getToken: TokenGetter = () => null
let onUnauthorized: UnauthorizedHandler | null = null

export class HttpError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

export function configureHttpClient(config: {
  getToken?: TokenGetter
  onUnauthorized?: UnauthorizedHandler
}): void {
  if (config.getToken) {
    getToken = config.getToken
  }

  if (config.onUnauthorized) {
    onUnauthorized = config.onUnauthorized
  }
}

async function toErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type')

  if (contentType?.includes('application/json')) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null
    if (payload?.message) {
      return payload.message
    }
  }

  const text = await response.text().catch(() => '')
  return text || `Request failed (${response.status})`
}

export async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const headers = new Headers(init?.headers)

  if (!headers.has('Content-Type') && init?.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  })

  if (response.status === 401) {
    const message = await toErrorMessage(response)
    onUnauthorized?.()
    throw new HttpError(401, message || 'Invalid credentials')
  }

  if (!response.ok) {
    throw new HttpError(response.status, await toErrorMessage(response))
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
