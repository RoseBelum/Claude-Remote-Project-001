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
      <h2 className="text-lg font-extrabold text-[#181c23] mb-5">O meu perfil</h2>

      <div className="glass rounded-[2rem] p-6 space-y-5 max-w-md">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-[#e1e0ff] text-[#585990] flex items-center justify-center text-xl font-extrabold border-2 border-white shadow-md">
              {initials}
            </div>
          )}
          <div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="px-3 py-1.5 text-sm font-semibold bg-white/70 border border-[#c8c5d0] rounded-xl hover:bg-white transition-all disabled:opacity-50 text-[#46464f]"
            >
              {uploading ? 'A carregar…' : 'Alterar foto'}
            </button>
            <p className="text-xs text-[#777680] mt-1 font-medium">JPG, PNG ou GIF. Max 5 MB.</p>
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
          <label className="block text-xs font-bold text-[#46464f] uppercase tracking-widest mb-2">Nome</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full px-4 py-2.5 bg-white/70 border border-[#c8c5d0] rounded-xl text-sm font-medium focus:outline-none focus:border-[#585990] focus:ring-2 focus:ring-[#585990]/20 transition-all"
            placeholder="O teu nome"
          />
        </div>

        {/* Target horas */}
        <div>
          <label className="block text-xs font-bold text-[#46464f] uppercase tracking-widest mb-2">Target de horas / mês</label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              min="1"
              step="1"
              className="w-28 px-4 py-2.5 bg-white/70 border border-[#c8c5d0] rounded-xl text-sm font-medium focus:outline-none focus:border-[#585990] focus:ring-2 focus:ring-[#585990]/20 transition-all"
            />
            <span className="text-sm text-[#777680] font-medium">horas</span>
          </div>
        </div>

        {error && (
          <div className="bg-[#ffdad6] border border-[#ffb3af] rounded-xl px-4 py-2.5 text-xs font-semibold text-[#93000a]">{error}</div>
        )}
        {success && (
          <div className="bg-[#d7e5bb] border border-[#b5cd92] rounded-xl px-4 py-2.5 text-xs font-semibold text-[#3f4b2c]">Perfil guardado com sucesso.</div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-all shadow-md"
          style={{ background: 'linear-gradient(135deg, #585990 0%, #8b8cc7 100%)' }}
        >
          {saving ? 'A guardar…' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
