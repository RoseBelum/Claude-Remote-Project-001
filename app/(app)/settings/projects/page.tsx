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

  const estadoBadge: Record<Projecto['estado'], { bg: string; color: string }> = {
    activo:    { bg: 'rgba(217,245,221,0.75)', color: '#1E6C3A' },
    pausado:   { bg: 'rgba(255,236,199,0.8)', color: '#7D4800' },
    concluido: { bg: 'rgba(230,233,255,0.8)', color: '#2736FF' },
    arquivado: { bg: 'rgba(200,197,208,0.35)', color: '#51516B' },
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-extrabold text-[#0B0B1C]">Projectos</h2>
        <button
          onClick={openCreate}
          className="px-4 py-2 text-white text-sm font-bold rounded-xl shadow-md transition-all"
          style={{ background: '#2736FF' }}
        >
          + Novo projecto
        </button>
      </div>

      <div className="flex gap-2 mb-5">
        {(['activo', 'arquivado', 'todos'] as EstadoFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setEstadoFilter(f)}
            className={`px-3 py-1.5 text-sm font-bold rounded-xl border transition-all ${
              estadoFilter === f
                ? 'bg-[#2736FF] text-white border-[#2736FF]'
                : 'text-[#51516B] border-[#8A8598] hover:border-[#2736FF] hover:text-[#2736FF]'
            }`}
          >
            {f === 'activo' ? 'Activos' : f === 'arquivado' ? 'Arquivados' : 'Todos'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-[#51516B] font-medium">A carregar…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-[#51516B] font-medium">Nenhum projecto encontrado.</p>
      ) : (
        <div className="glass rounded-[1.5rem] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--color-border)]">
                <th className="text-left py-3 px-4 text-xs font-bold text-[#51516B] uppercase tracking-wider">Nome</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#51516B] uppercase tracking-wider">BU</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#51516B] uppercase tracking-wider hidden sm:table-cell">Área</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#51516B] uppercase tracking-wider">Estado</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#51516B] uppercase tracking-wider hidden lg:table-cell">Início</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#51516B] uppercase tracking-wider hidden lg:table-cell">Fim</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-[color:var(--color-border)] hover:bg-[color:var(--color-surface-sunken)] transition-colors">
                  <td className="py-3 px-4 font-semibold text-[#0B0B1C]">{p.nome}</td>
                  <td className="py-3 px-4">
                    <span
                      className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full"
                      style={{ backgroundColor: (p.bu?.cor ?? '#2736FF') + '22', color: p.bu?.cor ?? '#2736FF' }}
                    >
                      {p.bu?.nome ?? '—'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#51516B] font-medium hidden sm:table-cell">{p.area_bu ?? '—'}</td>
                  <td className="py-3 px-4">
                    <span
                      className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                      style={{ backgroundColor: estadoBadge[p.estado].bg, color: estadoBadge[p.estado].color }}
                    >
                      {p.estado}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#51516B] font-medium hidden lg:table-cell">{p.data_inicio ?? '—'}</td>
                  <td className="py-3 px-4 text-[#51516B] font-medium hidden lg:table-cell">{p.data_fim ?? '—'}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(p)} className="text-xs font-bold text-[#2736FF] hover:underline">Editar</button>
                      {p.estado !== 'arquivado' && (
                        <button onClick={() => handleArchive(p)} className="text-xs font-bold text-[#51516B] hover:underline">Arquivar</button>
                      )}
                      <button onClick={() => handleDelete(p)} className="text-xs font-bold text-[#A1001C] hover:underline">Apagar</button>
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
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-[2rem] shadow-2xl w-full max-w-md p-7">
            <h3 className="text-base font-extrabold text-[#0B0B1C] mb-5">
              {editing ? 'Editar projecto' : 'Novo projecto'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#51516B] uppercase tracking-widest mb-2">Nome *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#F1EDE1] border border-[#E4DFD1] rounded-xl text-sm font-medium focus:outline-none focus:border-[#2736FF] focus:ring-2 focus:ring-[#2736FF]/20 transition-all"
                  placeholder="Nome do projecto"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#51516B] uppercase tracking-widest mb-2">BU *</label>
                <select
                  value={form.bu_id}
                  onChange={(e) => setForm({ ...form, bu_id: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#F1EDE1] border border-[#E4DFD1] rounded-xl text-sm font-medium focus:outline-none focus:border-[#2736FF] focus:ring-2 focus:ring-[#2736FF]/20 transition-all"
                >
                  <option value="">Seleccionar BU</option>
                  {bus.map((b) => (
                    <option key={b.id} value={b.id}>{b.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#51516B] uppercase tracking-widest mb-2">Área BU</label>
                <input
                  type="text"
                  value={form.area_bu}
                  onChange={(e) => setForm({ ...form, area_bu: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#F1EDE1] border border-[#E4DFD1] rounded-xl text-sm font-medium focus:outline-none focus:border-[#2736FF] focus:ring-2 focus:ring-[#2736FF]/20 transition-all"
                  placeholder="Ex: Mktg, Inovação, B2B"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#51516B] uppercase tracking-widest mb-2">Estado</label>
                <select
                  value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value as Projecto['estado'] })}
                  className="w-full px-4 py-2.5 bg-[#F1EDE1] border border-[#E4DFD1] rounded-xl text-sm font-medium focus:outline-none focus:border-[#2736FF] focus:ring-2 focus:ring-[#2736FF]/20 transition-all"
                >
                  {ESTADOS.map((e) => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#51516B] uppercase tracking-widest mb-2">Data início</label>
                  <input
                    type="date"
                    value={form.data_inicio}
                    onChange={(e) => setForm({ ...form, data_inicio: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#F1EDE1] border border-[#E4DFD1] rounded-xl text-sm font-medium focus:outline-none focus:border-[#2736FF] focus:ring-2 focus:ring-[#2736FF]/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#51516B] uppercase tracking-widest mb-2">Data fim</label>
                  <input
                    type="date"
                    value={form.data_fim}
                    onChange={(e) => setForm({ ...form, data_fim: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#F1EDE1] border border-[#E4DFD1] rounded-xl text-sm font-medium focus:outline-none focus:border-[#2736FF] focus:ring-2 focus:ring-[#2736FF]/20 transition-all"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-[#FFE0DE] border border-[#F5A7A4] rounded-xl px-4 py-2.5 text-xs font-semibold text-[#7A0B13] mt-4">{error}</div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2.5 text-sm font-bold text-[#51516B] bg-[color:var(--color-surface-sunken)] border border-[#8A8598] rounded-xl hover:bg-white transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2.5 text-sm font-bold text-white rounded-xl disabled:opacity-50 transition-all shadow-md"
                style={{ background: '#2736FF' }}
              >
                {saving ? 'A guardar…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
