'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)
    const supabase = createClient()

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        router.push('/dump')
        router.refresh()
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        setSuccess('Check your email to confirm your account, then sign in.')
        setMode('signin')
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-garden-bg flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl text-garden-text tracking-tight" style={{ fontWeight: 500 }}>
            Idea Garden
          </h1>
          <p className="font-serif text-garden-muted text-sm mt-2 italic">
            Where raw thoughts grow into something usable.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-garden-muted mb-1.5" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-garden-border bg-garden-surface text-garden-text placeholder:text-garden-muted-soft focus:outline-none focus:ring-2 focus:ring-garden-accent/20 focus:border-garden-accent transition-all text-sm"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm text-garden-muted mb-1.5" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-garden-border bg-garden-surface text-garden-text placeholder:text-garden-muted-soft focus:outline-none focus:ring-2 focus:ring-garden-accent/20 focus:border-garden-accent transition-all text-sm"
              placeholder="••••••••"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && (
            <p className="text-sm text-garden-danger bg-garden-danger-light rounded-lg px-3 py-2">{error}</p>
          )}
          {success && (
            <p className="text-sm text-garden-accent bg-garden-accent-light rounded-lg px-3 py-2">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-garden-accent text-white rounded-lg text-sm font-medium hover:bg-garden-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-paper"
          >
            {loading ? '...' : mode === 'signin' ? 'Anmelden' : 'Registrieren'}
          </button>
        </form>

        <p className="text-center text-sm text-garden-muted mt-6">
          {mode === 'signin' ? (
            <>
              No account?{' '}
              <button
                onClick={() => { setMode('signup'); setError(null) }}
                className="text-garden-accent hover:underline"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have one?{' '}
              <button
                onClick={() => { setMode('signin'); setError(null) }}
                className="text-garden-accent hover:underline"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
