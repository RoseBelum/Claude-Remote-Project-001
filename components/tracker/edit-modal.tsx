'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Projecto, ActivityTag } from '@/types'
import type { SessaoRow } from './session-list'

interface Props {
  sessao: SessaoRow
  projectos: Projecto[]
  tags: ActivityTag[]
  onSaved: (updated: SessaoRow) => void
  onClose: () => void
  onToast: (msg: string, type: 'success' | 'error') => void
}

function isoToDateStr(iso: string) {
  return iso.slice(0, 10)
}

function isoToTimeStr(iso: string) {
  return iso.slice(11, 16)
}

function buildIso(date: string, time: string): string {
  return `${date}T${time}:00`
}

export function EditModal({ sessao, projectos, tags, onSaved, onClose, onToast }: Props) {
  const supabase = createClient()

  const [projectoId, setProjectoId] = useState(sessao.projecto_id)
  const [tagId, setTagId] = useState(sessao.tag_id ?? '')
  const [date, setDate] = useState(isoToDateStr(sessao.inicio))
  const [horaInicio, setHoraInicio] = useState(isoToTimeStr(sessao.inicio))
  const [horaFim, setHoraFim] = useState(sessao.fim ? isoToTimeStr(sessao.fim) : '')
  const [horas, setHoras] = useState(String(sessao.horas ?? ''))
  const [horasManual, setHorasManual] = useState(false)
  const [nota, setNota] = useState(sessao.nota ?? '')
  const [saving, setSaving] = useState(false)

  // Auto-calculate horas from início/fim unless user edited manually
  useEffect(() => {
    if (horasManual) return
    if (!horaInicio || !horaFim) return
    const start = new Date(buildIso(date, horaInicio))
    const end = new Date(buildIso(date, horaFim))
    const diff = (end.getTime() - start.getTime()) / 3600000
    if (diff > 0) setHoras(String(Math.round(diff * 100) / 100))
  }, [date, horaInicio, horaFim, horasManual])

  async function handleSave() {
    if (!projectoId) return
    setSaving(true)

    const horasVal = parseFloat(horas) || null
    const fimIso = horaFim ? buildIso(date, horaFim) : null

    const { data, error } = await supabase
      .from('sessoes')
      .update({
        projecto_id: projectoId,
        tag_id: tagId || null,
        inicio: buildIso(date, horaInicio),
        fim: fimIso,
        horas: horasVal,
        nota: nota.trim() || null,
        editado_em: new Date().toISOString(),
      })
      .eq('id', sessao.id)
      .select('*, projecto:projectos(nome, area_bu, bu:bus(nome, cor)), tag:activity_tags(nome, cor)')
      .single()

    setSaving(false)

    if (error) {
      onToast('Erro ao guardar.', 'error')
    } else if (data) {
      onToast('Sessão actualizada.', 'success')
      onSaved(data as SessaoRow)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-base font-semibold text-[color:var(--color-ink)] mb-4">Editar sessão</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[color:var(--color-ink)] mb-1">Projecto *</label>
            <select
              value={projectoId}
              onChange={(e) => setProjectoId(e.target.value)}
              className="w-full px-3 py-2 border border-[color:var(--color-border-strong)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]"
            >
              <option value="">Seleccionar</option>
              {projectos.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[color:var(--color-ink)] mb-1">Activity Tag</label>
            <select
              value={tagId}
              onChange={(e) => setTagId(e.target.value)}
              className="w-full px-3 py-2 border border-[color:var(--color-border-strong)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]"
            >
              <option value="">Sem tag</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[color:var(--color-ink)] mb-1">Data</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-[color:var(--color-border-strong)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[color:var(--color-ink)] mb-1">Hora início</label>
              <input
                type="time"
                value={horaInicio}
                onChange={(e) => { setHoraInicio(e.target.value); setHorasManual(false) }}
                className="w-full px-3 py-2 border border-[color:var(--color-border-strong)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[color:var(--color-ink)] mb-1">Hora fim</label>
              <input
                type="time"
                value={horaFim}
                onChange={(e) => { setHoraFim(e.target.value); setHorasManual(false) }}
                className="w-full px-3 py-2 border border-[color:var(--color-border-strong)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[color:var(--color-ink)] mb-1">Horas</label>
            <input
              type="number"
              value={horas}
              min="0"
              step="0.5"
              onChange={(e) => { setHoras(e.target.value); setHorasManual(true) }}
              className="w-full px-3 py-2 border border-[color:var(--color-border-strong)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]"
              placeholder="ex: 1.5"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[color:var(--color-ink)] mb-1">Nota</label>
            <input
              type="text"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              className="w-full px-3 py-2 border border-[color:var(--color-border-strong)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[color:var(--color-ink)] border border-[color:var(--color-border-strong)] rounded-lg hover:bg-[color:var(--color-surface-sunken)] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving || !projectoId}
            className="px-4 py-2 text-sm bg-[color:var(--color-primary)] text-white rounded-lg hover:bg-[color:var(--color-primary-hover)] disabled:opacity-50 transition-colors"
          >
            {saving ? 'A guardar…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
