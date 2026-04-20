import { http } from './httpClient'
import type { AuthResponse, AuthUser, LoginRequest, RegisterRequest } from '../types/auth'

export function register(payload: RegisterRequest): Promise<AuthResponse> {
  return http<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function login(payload: LoginRequest): Promise<AuthResponse> {
  return http<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function guestLogin(): Promise<AuthResponse> {
  return http<AuthResponse>('/api/auth/guest', {
    method: 'POST',
  })
}

export function getMe(): Promise<AuthUser> {
  return http<AuthUser>('/api/auth/me')
}
