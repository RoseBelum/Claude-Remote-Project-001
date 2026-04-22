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
      <h2 className="text-lg font-semibold text-gray-900 mb-4">O meu perfil</h2>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5 max-w-md">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl font-semibold">
              {initials}
            </div>
          )}
          <div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {uploading ? 'A carregar...' : 'Alterar foto'}
            </button>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG ou GIF. Max 5 MB.</p>
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
          <label className="block text-xs font-medium text-gray-700 mb-1">Nome</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="O teu nome"
          />
        </div>

        {/* Target horas */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Target de horas / mês</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              min="1"
              step="1"
              className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-500">horas</span>
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
        )}
        {success && (
          <p className="text-xs text-green-600 bg-green-50 border border-green-200 rounded px-3 py-2">Perfil guardado com sucesso.</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'A guardar...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
