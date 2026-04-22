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
    <div className="min-h-screen flex items-center justify-center bg-[#F6F6F1]">
      <div className="w-full max-w-sm px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-[1.25rem] mb-4 bg-[#1A1A2E]">
            <span className="text-white font-extrabold text-xl tracking-tight">UX</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#1A1A2E] tracking-tight">UX Flow</h1>
          <p className="text-sm text-[#6B6880] mt-1 font-medium">Inicia sessão para continuar</p>
        </div>

        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-[#E8E8E4]">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-[#44444F] uppercase tracking-widest mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 bg-[#F6F6F1] border border-[#E8E8E4] rounded-xl text-sm font-medium focus:outline-none focus:border-[#5B5BD6] focus:ring-2 focus:ring-[#5B5BD6]/15 transition-all"
                placeholder="tu@empresa.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-[#44444F] uppercase tracking-widest mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-2.5 bg-[#F6F6F1] border border-[#E8E8E4] rounded-xl text-sm font-medium focus:outline-none focus:border-[#5B5BD6] focus:ring-2 focus:ring-[#5B5BD6]/15 transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-[#FFF0EE] border border-[#FFCCC7] rounded-xl px-4 py-2.5 text-sm font-semibold text-[#C4341C]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#5B5BD6] text-white text-sm font-bold rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-[#4848C2] uppercase tracking-wider"
            >
              {loading ? 'A entrar…' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
