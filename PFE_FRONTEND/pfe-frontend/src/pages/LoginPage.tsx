import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { HttpError } from '../api/httpClient'
import { useAuth } from '../context/AuthContext'

interface LoginFormState {
  email: string
  password: string
}

type SubmissionMode = 'login' | 'guest' | null

export default function LoginPage() {
  const { guestLogin, login } = useAuth()
  const [form, setForm] = useState<LoginFormState>({ email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof LoginFormState, string>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submissionMode, setSubmissionMode] = useState<SubmissionMode>(null)

  const canSubmit = useMemo(() => submissionMode === null, [submissionMode])

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const errors: Partial<Record<keyof LoginFormState, string>> = {}

    if (!form.email.trim()) {
      errors.email = 'Email is required.'
    }

    if (!form.password) {
      errors.password = 'Password is required.'
    }

    setFieldErrors(errors)
    setSubmitError(null)

    if (Object.keys(errors).length > 0) {
      return
    }

    setSubmissionMode('login')

    try {
      await login({ email: form.email.trim(), password: form.password })
    } catch (error) {
      if (error instanceof HttpError) {
        setSubmitError(error.status === 401 ? 'Invalid credentials' : error.message)
      } else {
        setSubmitError('Unable to login. Please try again.')
      }
    } finally {
      setSubmissionMode(null)
    }
  }

  const onGuestLogin = async () => {
    setSubmitError(null)
    setSubmissionMode('guest')

    try {
      await guestLogin()
    } catch (error) {
      if (error instanceof HttpError) {
        setSubmitError(error.message)
      } else {
        setSubmitError('Unable to continue as guest. Please try again.')
      }
    } finally {
      setSubmissionMode(null)
    }
  }

  return (
    <main className="grid-bg flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <section className="w-full max-w-md rounded-lg border border-border bg-card p-6">
        <h1 className="text-xl font-semibold">Login</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to continue.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-muted-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
            />
            {fieldErrors.email && <p className="mt-1 text-xs text-destructive">{fieldErrors.email}</p>}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-muted-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
            />
            {fieldErrors.password && <p className="mt-1 text-xs text-destructive">{fieldErrors.password}</p>}
          </div>

          {submitError && <p className="text-sm text-destructive">{submitError}</p>}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-md border border-primary bg-primary/10 px-3 py-2 text-sm font-medium text-primary disabled:opacity-60"
          >
            {submissionMode === 'login' ? 'Signing in...' : 'Login'}
          </button>

          <button
            type="button"
            onClick={onGuestLogin}
            disabled={!canSubmit}
            className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm font-medium text-foreground disabled:opacity-60"
          >
            {submissionMode === 'guest' ? 'Starting guest session...' : 'Continue as Guest'}
          </button>
        </form>

        <p className="mt-4 text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-primary hover:underline">
            Register
          </Link>
        </p>
      </section>
    </main>
  )
}
