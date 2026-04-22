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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #f0f0ff 0%, #eef5e4 100%)' }}>
      {/* Decorative blobs */}
      <div className="absolute top-[-120px] right-[-120px] w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(88,89,144,0.12)' }} />
      <div className="absolute bottom-[-120px] left-[-120px] w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(86,99,66,0.10)' }} />
      <div className="absolute top-1/2 left-[-80px] w-64 h-64 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(139,140,199,0.08)' }} />

      <div className="w-full max-w-sm px-4 relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-[1.25rem] mb-4 shadow-lg" style={{ background: 'linear-gradient(135deg, #585990 0%, #8b8cc7 100%)' }}>
            <span className="text-white font-extrabold text-xl tracking-tight">UX</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#181c23] tracking-tight">UX Flow</h1>
          <p className="text-sm text-[#777680] mt-1 font-medium">Inicia sessão para continuar</p>
        </div>

        <div className="glass rounded-[2rem] p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-[#46464f] uppercase tracking-widest mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 bg-white/70 border border-[#c8c5d0] rounded-xl text-sm font-medium focus:outline-none focus:border-[#585990] focus:ring-2 focus:ring-[#585990]/20 transition-all"
                placeholder="tu@empresa.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-[#46464f] uppercase tracking-widest mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-2.5 bg-white/70 border border-[#c8c5d0] rounded-xl text-sm font-medium focus:outline-none focus:border-[#585990] focus:ring-2 focus:ring-[#585990]/20 transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-[#ffdad6] border border-[#ffb3af] rounded-xl px-4 py-2.5 text-sm font-semibold text-[#93000a]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 text-white text-sm font-bold rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-wider shadow-lg"
              style={{ background: 'linear-gradient(135deg, #585990 0%, #8b8cc7 100%)', boxShadow: '0 8px 24px rgba(88,89,144,0.25)' }}
            >
              {loading ? 'A entrar…' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
