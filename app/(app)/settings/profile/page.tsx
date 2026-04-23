'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSupabase } from '@/components/supabase-provider'

export default function ProfilePage() {
  const supabase = createClient()
  const { user, profile } = useSupabase()
  const [nome, setNome] = useState('')
  const [target, setTarget] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (profile) {
      setNome(profile.nome)
      setTarget(String(profile.target_horas_mes))
      setAvatarUrl(profile.avatar_url)
    }
  }, [profile])

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    setError(null)

    const ext = file.name.split('.').pop()
    const path = `avatars/${user.id}.${ext}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })

    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    setAvatarUrl(data.publicUrl)
    setUploading(false)
  }

  async function handleSave() {
    if (!user) return
    const targetVal = parseFloat(target)
    if (!nome.trim()) { setError('Nome é obrigatório.'); return }
    if (isNaN(targetVal) || targetVal <= 0) { setError('Target de horas inválido.'); return }

    setSaving(true); setError(null); setSuccess(false)

    const { error: e } = await supabase.from('profiles').update({
      nome: nome.trim(),
      target_horas_mes: targetVal,
      avatar_url: avatarUrl,
    }).eq('id', user.id)

    setSaving(false)
    if (e) { setError(e.message); return }
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  const initials = nome
    ? nome.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <div>
      <h2 className="text-lg font-extrabold text-[#0B0B1C] mb-5">O meu perfil</h2>

      <div className="glass rounded-[2rem] p-6 space-y-5 max-w-md">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-[#E6E9FF] text-[#2736FF] flex items-center justify-center text-xl font-extrabold border-2 border-white shadow-md">
              {initials}
            </div>
          )}
          <div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="px-3 py-1.5 text-sm font-semibold bg-[#F1EDE1] border border-[#E4DFD1] rounded-xl hover:bg-white transition-all disabled:opacity-50 text-[#51516B]"
            >
              {uploading ? 'A carregar…' : 'Alterar foto'}
            </button>
            <p className="text-xs text-[#51516B] mt-1 font-medium">JPG, PNG ou GIF. Max 5 MB.</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
          />
        </div>

        {/* Nome */}
        <div>
          <label className="block text-xs font-bold text-[#51516B] uppercase tracking-widest mb-2">Nome</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full px-4 py-2.5 bg-[#F1EDE1] border border-[#E4DFD1] rounded-xl text-sm font-medium focus:outline-none focus:border-[#2736FF] focus:ring-2 focus:ring-[#2736FF]/20 transition-all"
            placeholder="O teu nome"
          />
        </div>

        {/* Target horas */}
        <div>
          <label className="block text-xs font-bold text-[#51516B] uppercase tracking-widest mb-2">Target de horas / mês</label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              min="1"
              step="1"
              className="w-28 px-4 py-2.5 bg-[#F1EDE1] border border-[#E4DFD1] rounded-xl text-sm font-medium focus:outline-none focus:border-[#2736FF] focus:ring-2 focus:ring-[#2736FF]/20 transition-all"
            />
            <span className="text-sm text-[#51516B] font-medium">horas</span>
          </div>
        </div>

        {error && (
          <div className="bg-[#FFE0DE] border border-[#F5A7A4] rounded-xl px-4 py-2.5 text-xs font-semibold text-[#7A0B13]">{error}</div>
        )}
        {success && (
          <div className="bg-[#D9F5DD] border border-[#7FCA8F] rounded-xl px-4 py-2.5 text-xs font-semibold text-[#1E6C3A]">Perfil guardado com sucesso.</div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-all shadow-md"
          style={{ background: '#2736FF' }}
        >
          {saving ? 'A guardar…' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
