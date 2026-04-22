'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Projecto, BU } from '@/types'

const ESTADOS = ['activo', 'pausado', 'concluido', 'arquivado'] as const

type EstadoFilter = 'activo' | 'arquivado' | 'todos'

interface FormData {
  nome: string
  bu_id: string
  area_bu: string
  estado: Projecto['estado']
  data_inicio: string
  data_fim: string
}

const emptyForm: FormData = {
  nome: '',
  bu_id: '',
  area_bu: '',
  estado: 'activo',
  data_inicio: '',
  data_fim: '',
}

export default function ProjectsPage() {
  const supabase = createClient()
  const [projectos, setProjectos] = useState<Projecto[]>([])
  const [bus, setBus] = useState<BU[]>([])
  const [loading, setLoading] = useState(true)
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>('activo')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Projecto | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: ps }, { data: bs }] = await Promise.all([
      supabase.from('projectos').select('*, bu:bus(*)').order('created_at', { ascending: false }),
      supabase.from('bus').select('*').order('nome'),
    ])
    setProjectos(ps ?? [])
    setBus(bs ?? [])
    setLoading(false)
  }

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setError(null)
    setModalOpen(true)
  }

  function openEdit(p: Projecto) {
    setEditing(p)
    setForm({
      nome: p.nome,
      bu_id: p.bu_id,
      area_bu: p.area_bu ?? '',
      estado: p.estado,
      data_inicio: p.data_inicio ?? '',
      data_fim: p.data_fim ?? '',
    })
    setError(null)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.nome.trim() || !form.bu_id) {
      setError('Nome e BU são obrigatórios.')
      return
    }
    setSaving(true)
    setError(null)

    const payload = {
      nome: form.nome.trim(),
      bu_id: form.bu_id,
      area_bu: form.area_bu.trim() || null,
      estado: form.estado,
      data_inicio: form.data_inicio || null,
      data_fim: form.data_fim || null,
    }

    if (editing) {
      const { error: e } = await supabase.from('projectos').update(payload).eq('id', editing.id)
      if (e) { setError(e.message); setSaving(false); return }
    } else {
      const { error: e } = await supabase.from('projectos').insert(payload)
      if (e) { setError(e.message); setSaving(false); return }
    }

    setSaving(false)
    setModalOpen(false)
    fetchAll()
  }

  async function handleArchive(p: Projecto) {
    await supabase.from('projectos').update({ estado: 'arquivado' }).eq('id', p.id)
    fetchAll()
  }

  async function handleDelete(p: Projecto) {
    const [{ count: sessoes }, { count: tarefas }] = await Promise.all([
      supabase.from('sessoes').select('*', { count: 'exact', head: true }).eq('projecto_id', p.id),
      supabase.from('tarefas').select('*', { count: 'exact', head: true }).eq('projecto_id', p.id),
    ])
    if ((sessoes ?? 0) > 0 || (tarefas ?? 0) > 0) {
      alert(`Não é possível apagar "${p.nome}" — tem ${sessoes} sessões e ${tarefas} tarefas associadas.`)
      return
    }
    if (!confirm(`Apagar o projecto "${p.nome}"?`)) return
    await supabase.from('projectos').delete().eq('id', p.id)
    fetchAll()
  }

  const filtered = projectos.filter((p) => {
    if (estadoFilter === 'todos') return true
    if (estadoFilter === 'arquivado') return p.estado === 'arquivado'
    return p.estado !== 'arquivado'
  })

  const estadoBadge: Record<Projecto['estado'], string> = {
    activo: 'bg-green-100 text-green-700',
    pausado: 'bg-yellow-100 text-yellow-700',
    concluido: 'bg-blue-100 text-blue-700',
    arquivado: 'bg-gray-100 text-gray-500',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Projectos</h2>
        <button
          onClick={openCreate}
          className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Novo projecto
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {(['activo', 'arquivado', 'todos'] as EstadoFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setEstadoFilter(f)}
            className={`px-3 py-1 text-sm rounded-full border transition-colors capitalize ${
              estadoFilter === f
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'text-gray-600 border-gray-300 hover:border-gray-400'
            }`}
          >
            {f === 'activo' ? 'Activos' : f === 'arquivado' ? 'Arquivados' : 'Todos'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">A carregar...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhum projecto encontrado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Nome</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">BU</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 hidden sm:table-cell">Área</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Estado</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 hidden lg:table-cell">Início</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 hidden lg:table-cell">Fim</th>
                <th className="py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2.5 px-2 font-medium text-gray-900">{p.nome}</td>
                  <td className="py-2.5 px-2">
                    <span
                      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: (p.bu?.cor ?? '#6366f1') + '22', color: p.bu?.cor ?? '#6366f1' }}
                    >
                      {p.bu?.nome ?? '—'}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-gray-500 hidden sm:table-cell">{p.area_bu ?? '—'}</td>
                  <td className="py-2.5 px-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${estadoBadge[p.estado]}`}>
                      {p.estado}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-gray-500 hidden lg:table-cell">{p.data_inicio ?? '—'}</td>
                  <td className="py-2.5 px-2 text-gray-500 hidden lg:table-cell">{p.data_fim ?? '—'}</td>
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(p)} className="text-xs text-indigo-600 hover:underline">Editar</button>
                      {p.estado !== 'arquivado' && (
                        <button onClick={() => handleArchive(p)} className="text-xs text-gray-500 hover:underline">Arquivar</button>
                      )}
                      <button onClick={() => handleDelete(p)} className="text-xs text-red-500 hover:underline">Apagar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              {editing ? 'Editar projecto' : 'Novo projecto'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Nome do projecto"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">BU *</label>
                <select
                  value={form.bu_id}
                  onChange={(e) => setForm({ ...form, bu_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Seleccionar BU</option>
                  {bus.map((b) => (
                    <option key={b.id} value={b.id}>{b.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Área BU</label>
                <input
                  type="text"
                  value={form.area_bu}
                  onChange={(e) => setForm({ ...form, area_bu: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Mktg, Inovação, B2B"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Estado</label>
                <select
                  value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value as Projecto['estado'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {ESTADOS.map((e) => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Data início</label>
                  <input
                    type="date"
                    value={form.data_inicio}
                    onChange={(e) => setForm({ ...form, data_inicio: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Data fim</label>
                  <input
                    type="date"
                    value={form.data_fim}
                    onChange={(e) => setForm({ ...form, data_fim: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mt-3">{error}</p>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'A guardar...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
