import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { HttpError } from '../api/httpClient'
import { useAuth } from '../context/AuthContext'

interface RegisterFormState {
  fullName: string
  email: string
  password: string
}

export default function RegisterPage() {
  const { register } = useAuth()
  const [form, setForm] = useState<RegisterFormState>({ fullName: '', email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof RegisterFormState, string>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canSubmit = useMemo(() => !isSubmitting, [isSubmitting])

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const errors: Partial<Record<keyof RegisterFormState, string>> = {}

    if (!form.fullName.trim()) {
      errors.fullName = 'Full name is required.'
    }

    if (!form.email.trim()) {
      errors.email = 'Email is required.'
    }

    if (!form.password) {
      errors.password = 'Password is required.'
    } else if (form.password.length < 8) {
      errors.password = 'Password must be at least 8 characters.'
    }

    setFieldErrors(errors)
    setSubmitError(null)

    if (Object.keys(errors).length > 0) {
      return
    }

    setIsSubmitting(true)

    try {
      await register({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
      })
    } catch (error) {
      if (error instanceof HttpError) {
        setSubmitError(error.message)
      } else {
        setSubmitError('Unable to register. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="grid-bg flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <section className="w-full max-w-md rounded-lg border border-border bg-card p-6">
        <h1 className="text-xl font-semibold">Register</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create your account to continue.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="fullName" className="mb-1 block text-sm text-muted-foreground">
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              value={form.fullName}
              onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
              className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
            />
            {fieldErrors.fullName && <p className="mt-1 text-xs text-destructive">{fieldErrors.fullName}</p>}
          </div>

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
            {isSubmitting ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="mt-4 text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline">
            Login
          </Link>
        </p>
      </section>
    </main>
  )
}
