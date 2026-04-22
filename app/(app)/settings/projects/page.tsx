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
    activo:    { bg: 'rgba(215,229,187,0.7)', color: '#3D6B35' },
    pausado:   { bg: 'rgba(255,222,173,0.6)', color: '#7a4000' },
    concluido: { bg: 'rgba(225,224,255,0.7)', color: '#5B5BD6' },
    arquivado: { bg: 'rgba(200,197,208,0.4)', color: '#6B6880' },
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-extrabold text-[#1A1A2E]">Projectos</h2>
        <button
          onClick={openCreate}
          className="px-4 py-2 text-white text-sm font-bold rounded-xl shadow-md transition-all"
          style={{ background: '#5B5BD6' }}
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
                ? 'bg-[#5B5BD6] text-white border-[#5B5BD6]'
                : 'text-[#44444F] border-[#C4C0D0] hover:border-[#5B5BD6] hover:text-[#5B5BD6]'
            }`}
          >
            {f === 'activo' ? 'Activos' : f === 'arquivado' ? 'Arquivados' : 'Todos'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-[#6B6880] font-medium">A carregar…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-[#6B6880] font-medium">Nenhum projecto encontrado.</p>
      ) : (
        <div className="glass rounded-[1.5rem] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/60">
                <th className="text-left py-3 px-4 text-xs font-bold text-[#44444F] uppercase tracking-wider">Nome</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#44444F] uppercase tracking-wider">BU</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#44444F] uppercase tracking-wider hidden sm:table-cell">Área</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#44444F] uppercase tracking-wider">Estado</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#44444F] uppercase tracking-wider hidden lg:table-cell">Início</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#44444F] uppercase tracking-wider hidden lg:table-cell">Fim</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-white/40 hover:bg-white/40 transition-colors">
                  <td className="py-3 px-4 font-semibold text-[#1A1A2E]">{p.nome}</td>
                  <td className="py-3 px-4">
                    <span
                      className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full"
                      style={{ backgroundColor: (p.bu?.cor ?? '#5B5BD6') + '22', color: p.bu?.cor ?? '#5B5BD6' }}
                    >
                      {p.bu?.nome ?? '—'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#6B6880] font-medium hidden sm:table-cell">{p.area_bu ?? '—'}</td>
                  <td className="py-3 px-4">
                    <span
                      className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                      style={{ backgroundColor: estadoBadge[p.estado].bg, color: estadoBadge[p.estado].color }}
                    >
                      {p.estado}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#6B6880] font-medium hidden lg:table-cell">{p.data_inicio ?? '—'}</td>
                  <td className="py-3 px-4 text-[#6B6880] font-medium hidden lg:table-cell">{p.data_fim ?? '—'}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(p)} className="text-xs font-bold text-[#5B5BD6] hover:underline">Editar</button>
                      {p.estado !== 'arquivado' && (
                        <button onClick={() => handleArchive(p)} className="text-xs font-bold text-[#6B6880] hover:underline">Arquivar</button>
                      )}
                      <button onClick={() => handleDelete(p)} className="text-xs font-bold text-[#ba1a1a] hover:underline">Apagar</button>
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
            <h3 className="text-base font-extrabold text-[#1A1A2E] mb-5">
              {editing ? 'Editar projecto' : 'Novo projecto'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#44444F] uppercase tracking-widest mb-2">Nome *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#F6F6F1] border border-[#E8E8E4] rounded-xl text-sm font-medium focus:outline-none focus:border-[#5B5BD6] focus:ring-2 focus:ring-[#5B5BD6]/20 transition-all"
                  placeholder="Nome do projecto"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#44444F] uppercase tracking-widest mb-2">BU *</label>
                <select
                  value={form.bu_id}
                  onChange={(e) => setForm({ ...form, bu_id: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#F6F6F1] border border-[#E8E8E4] rounded-xl text-sm font-medium focus:outline-none focus:border-[#5B5BD6] focus:ring-2 focus:ring-[#5B5BD6]/20 transition-all"
                >
                  <option value="">Seleccionar BU</option>
                  {bus.map((b) => (
                    <option key={b.id} value={b.id}>{b.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#44444F] uppercase tracking-widest mb-2">Área BU</label>
                <input
                  type="text"
                  value={form.area_bu}
                  onChange={(e) => setForm({ ...form, area_bu: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#F6F6F1] border border-[#E8E8E4] rounded-xl text-sm font-medium focus:outline-none focus:border-[#5B5BD6] focus:ring-2 focus:ring-[#5B5BD6]/20 transition-all"
                  placeholder="Ex: Mktg, Inovação, B2B"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#44444F] uppercase tracking-widest mb-2">Estado</label>
                <select
                  value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value as Projecto['estado'] })}
                  className="w-full px-4 py-2.5 bg-[#F6F6F1] border border-[#E8E8E4] rounded-xl text-sm font-medium focus:outline-none focus:border-[#5B5BD6] focus:ring-2 focus:ring-[#5B5BD6]/20 transition-all"
                >
                  {ESTADOS.map((e) => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#44444F] uppercase tracking-widest mb-2">Data início</label>
                  <input
                    type="date"
                    value={form.data_inicio}
                    onChange={(e) => setForm({ ...form, data_inicio: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#F6F6F1] border border-[#E8E8E4] rounded-xl text-sm font-medium focus:outline-none focus:border-[#5B5BD6] focus:ring-2 focus:ring-[#5B5BD6]/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#44444F] uppercase tracking-widest mb-2">Data fim</label>
                  <input
                    type="date"
                    value={form.data_fim}
                    onChange={(e) => setForm({ ...form, data_fim: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#F6F6F1] border border-[#E8E8E4] rounded-xl text-sm font-medium focus:outline-none focus:border-[#5B5BD6] focus:ring-2 focus:ring-[#5B5BD6]/20 transition-all"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-[#ffdad6] border border-[#ffb3af] rounded-xl px-4 py-2.5 text-xs font-semibold text-[#93000a] mt-4">{error}</div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2.5 text-sm font-bold text-[#44444F] bg-white/60 border border-[#C4C0D0] rounded-xl hover:bg-white transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2.5 text-sm font-bold text-white rounded-xl disabled:opacity-50 transition-all shadow-md"
                style={{ background: '#5B5BD6' }}
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
