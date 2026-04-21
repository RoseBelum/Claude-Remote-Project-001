'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

export default function TeamPage() {
  const supabase = createClient()
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [targetEdit, setTargetEdit] = useState<string>('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('nome')
    setMembers(data ?? [])
    setLoading(false)
  }

  function startEdit(m: Profile) {
    setEditingId(m.id)
    setTargetEdit(String(m.target_horas_mes))
  }

  async function saveTarget(m: Profile) {
    const val = parseFloat(targetEdit)
    if (isNaN(val) || val <= 0) return
    setSaving(true)
    await supabase.from('profiles').update({ target_horas_mes: val }).eq('id', m.id)
    setSaving(false)
    setEditingId(null)
    fetchAll()
  }

  const initials = (nome: string) =>
    nome.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Equipa</h2>
        <p className="text-xs text-gray-400 mt-0.5">Gestão de membros feita no Supabase Auth.</p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">A carregar...</p>
      ) : members.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhum membro encontrado.</p>
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                {m.avatar_url ? (
                  <img src={m.avatar_url} alt={m.nome} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold">
                    {initials(m.nome)}
                  </div>
                )}
                <span className="text-sm font-medium text-gray-900">{m.nome}</span>
              </div>

              <div className="flex items-center gap-2">
                {editingId === m.id ? (
                  <>
                    <input
                      type="number"
                      value={targetEdit}
                      onChange={(e) => setTargetEdit(e.target.value)}
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      min="1"
                      step="1"
                    />
                    <span className="text-xs text-gray-500">h/mês</span>
                    <button
                      onClick={() => saveTarget(m)}
                      disabled={saving}
                      className="text-xs text-indigo-600 hover:underline disabled:opacity-50"
                    >
                      Guardar
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:underline">
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-gray-500">{m.target_horas_mes}h/mês</span>
                    <button onClick={() => startEdit(m)} className="text-xs text-indigo-600 hover:underline">
                      Editar
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
