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
    <div className="min-h-screen flex items-center justify-center bg-[color:var(--color-bg)] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[color:var(--color-ink)] tracking-tight">UX Flow</h1>
          <p className="text-sm text-[color:var(--color-ink-muted)] mt-1">
            Inicia sessão para continuar
          </p>
        </div>

        <div className="glass rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-[color:var(--color-ink-muted)] uppercase tracking-widest mb-2"
              >
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
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-[color:var(--color-ink-muted)] uppercase tracking-widest mb-2"
              >
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
                className="bg-[color:var(--color-danger-soft)] border border-[color:var(--color-danger-ring)] rounded-xl px-4 py-2.5 text-sm font-medium text-[color:var(--color-danger)]"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[color:var(--color-primary)] text-white text-sm font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-[color:var(--color-primary-hover)]"
            >
              {loading ? 'A entrar…' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
