export interface AuthUser {
  id: number
  fullName: string
  email: string
  createdAt: string | null
  updatedAt: string | null
  isGuest?: boolean
}

export interface AuthResponse {
  token: string
  user: AuthUser
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest extends LoginRequest {
  fullName: string
}
