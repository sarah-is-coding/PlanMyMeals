import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import './App.css'
import { supabase } from './supabaseClient'

type AuthMode = 'signIn' | 'signUp'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<AuthMode>('signIn')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const syncSession = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session ?? null)
    }

    syncSession()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (!newSession) {
        setEmail('')
        setPassword('')
      }
    })

    return () => listener?.subscription.unsubscribe()
  }, [])

  const handleAuth = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    if (!email || !password) {
      setError('Email and password are required.')
      setLoading(false)
      return
    }

    const action =
      mode === 'signUp'
        ? supabase.auth.signUp({ email, password })
        : supabase.auth.signInWithPassword({ email, password })

    const { error: authError } = await action
    if (authError) {
      setError(authError.message)
    }
    setLoading(false)
  }

  const handleSignOut = async () => {
    setLoading(true)
    setError(null)
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      setError(signOutError.message)
    }
    setLoading(false)
  }

  return (
    <main className="page">
      <div className="panel">
        <header className="panel__header">
          <p className="eyebrow">PlanMyMeals</p>
          <h1>Sign in to manage recipes and meal plans</h1>
          <p className="subhead">
            Accounts are scoped per user via Supabase Auth. Use email/password now; add OAuth later if you want.
          </p>
        </header>

        {!session ? (
          <form className="auth-form" onSubmit={handleAuth}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
              />
            </label>

            {error ? <p className="error">{error}</p> : null}

            <div className="actions">
              <button type="submit" disabled={loading}>
                {loading ? 'Working...' : mode === 'signUp' ? 'Create account' : 'Sign in'}
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => setMode(mode === 'signUp' ? 'signIn' : 'signUp')}
                disabled={loading}
              >
                {mode === 'signUp' ? 'Have an account? Sign in' : 'Need an account? Sign up'}
              </button>
            </div>
          </form>
        ) : (
          <div className="auth-success">
            <p className="eyebrow">Signed in</p>
            <h2>{session.user.email}</h2>
            <p className="subhead">Session is active. Next steps: load recipes, meal plans, and grocery lists.</p>
            {error ? <p className="error">{error}</p> : null}
            <div className="actions">
              <button onClick={handleSignOut} disabled={loading}>
                {loading ? 'Signing out...' : 'Sign out'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

export default App
