'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Credenciais inválidas. Tenta novamente.')
      setLoading(false)
      return
    }

    router.push('/tracker')
    router.refresh()
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Cosmic poster backdrop */}
      <div aria-hidden className="absolute inset-0 space-bg" />

      <div className="relative z-10 w-full max-w-sm px-4">
        {/* Poster header */}
        <div className="text-center mb-8">
          <p className="overline text-[color:var(--color-space-ink-muted)] mb-3">
            <span
              aria-hidden
              className="inline-block w-1.5 h-1.5 rounded-full align-middle mr-2"
              style={{ background: '#FF7D46', boxShadow: '0 0 10px rgba(255,125,70,0.8)' }}
            />
            New Unique · Ver 0.1
          </p>
          <h1 className="display text-5xl text-white mb-2">UX Flow</h1>
          <p className="text-sm text-[color:var(--color-space-ink-muted)] font-medium">
            Inicia sessão para continuar
          </p>
        </div>

        <div className="bg-white rounded-[2rem] p-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)] border border-[color:var(--color-border)]">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-[color:var(--color-ink-muted)] uppercase tracking-widest mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                aria-invalid={error ? 'true' : undefined}
                className="w-full px-4 py-2.5 bg-[color:var(--color-surface-sunken)] border border-[color:var(--color-border)] rounded-xl text-sm font-medium focus:outline-none focus:border-[color:var(--color-primary)] focus:ring-2 focus:ring-[color:var(--color-primary)]/20 transition-colors"
                placeholder="tu@empresa.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-[color:var(--color-ink-muted)] uppercase tracking-widest mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={error ? 'login-error' : undefined}
                className="w-full px-4 py-2.5 bg-[color:var(--color-surface-sunken)] border border-[color:var(--color-border)] rounded-xl text-sm font-medium focus:outline-none focus:border-[color:var(--color-primary)] focus:ring-2 focus:ring-[color:var(--color-primary)]/20 transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div
                id="login-error"
                role="alert"
                className="bg-[color:var(--color-danger-soft)] border border-[color:var(--color-danger-ring)] rounded-xl px-4 py-2.5 text-sm font-semibold text-[color:var(--color-danger)]"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[color:var(--color-primary)] text-white text-sm font-bold rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-[color:var(--color-primary-hover)] uppercase tracking-[0.18em] shadow-[0_10px_30px_-8px_rgba(39,54,255,0.55)]"
            >
              {loading ? 'A entrar…' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-xs font-semibold text-[color:var(--color-space-ink-subtle)] tracking-widest uppercase">
          Tracker · Board · Timeline
        </p>
      </div>
    </div>
  )
}
