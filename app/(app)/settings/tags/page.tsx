'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ActivityTag } from '@/types'

interface TagWithCount extends ActivityTag {
  sessoes_count: number
}

interface FormData { nome: string; cor: string }
const emptyForm: FormData = { nome: '', cor: '#94a3b8' }

export default function TagsPage() {
  const supabase = createClient()
  const [tags, setTags] = useState<TagWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ActivityTag | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const { data } = await supabase.from('activity_tags').select('*, sessoes(count)').order('nome')
    setTags(
      (data ?? []).map((t: ActivityTag & { sessoes: { count: number }[] }) => ({
        ...t,
        sessoes_count: t.sessoes?.[0]?.count ?? 0,
      }))
    )
    setLoading(false)
  }

  function openCreate() {
    setEditing(null); setForm(emptyForm); setError(null); setModalOpen(true)
  }

  function openEdit(t: ActivityTag) {
    setEditing(t); setForm({ nome: t.nome, cor: t.cor }); setError(null); setModalOpen(true)
  }

  async function handleSave() {
    if (!form.nome.trim()) { setError('Nome é obrigatório.'); return }
    setSaving(true); setError(null)
    if (editing) {
      const { error: e } = await supabase.from('activity_tags').update({ nome: form.nome.trim(), cor: form.cor }).eq('id', editing.id)
      if (e) { setError(e.message); setSaving(false); return }
    } else {
      const { error: e } = await supabase.from('activity_tags').insert({ nome: form.nome.trim(), cor: form.cor })
      if (e) { setError(e.message); setSaving(false); return }
    }
    setSaving(false); setModalOpen(false); fetchAll()
  }

  async function handleDelete(t: TagWithCount) {
    if (t.sessoes_count > 0) {
      alert(`Não é possível apagar "${t.nome}" — tem ${t.sessoes_count} sessão(ões) associada(s).`)
      return
    }
    if (!confirm(`Apagar a tag "${t.nome}"?`)) return
    await supabase.from('activity_tags').delete().eq('id', t.id)
    fetchAll()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Activity Tags</h2>
        <button
          onClick={openCreate}
          className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Nova tag
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">A carregar...</p>
      ) : tags.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhuma tag encontrada.</p>
      ) : (
        <div className="space-y-2">
          {tags.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: t.cor }} />
                <span className="text-sm font-medium text-gray-900">{t.nome}</span>
                {t.sessoes_count > 0 && (
                  <span className="text-xs text-gray-400">{t.sessoes_count} sessão(ões)</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openEdit(t)} className="text-xs text-indigo-600 hover:underline">Editar</button>
                <button onClick={() => handleDelete(t)} className="text-xs text-red-500 hover:underline">Apagar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              {editing ? 'Editar tag' : 'Nova tag'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: DEFINE"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cor</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.cor}
                    onChange={(e) => setForm({ ...form, cor: e.target.value })}
                    className="w-10 h-10 border border-gray-300 rounded cursor-pointer p-0.5"
                  />
                  <span className="text-sm text-gray-500 font-mono">{form.cor}</span>
                </div>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mt-3">{error}</p>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {saving ? 'A guardar...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
