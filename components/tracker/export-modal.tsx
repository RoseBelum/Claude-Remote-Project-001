'use client'

import { useState } from 'react'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

type Period = 'week' | 'month' | 'custom'
type Scope = 'me' | 'team'

interface RpcRow {
  id: string
  user_id: string
  projecto_id: string
  tag_id: string | null
  inicio: string
  fim: string | null
  horas: number | null
  nota: string | null
  user_nome: string
  projecto_nome: string
  bu_nome: string
  tag_nome: string | null
  area_bu: string | null
}

interface PersonalRow {
  id: string
  inicio: string
  horas: number | null
  nota: string | null
  projecto: { nome: string; area_bu: string | null; bu: { nome: string } }
  tag: { nome: string } | null
}

interface Props {
  profile: Profile
  onClose: () => void
  onToast: (msg: string, type: 'success' | 'error') => void
}

function toDateStr(d: Date) {
  return format(d, 'yyyy-MM-dd')
}

export function ExportModal({ profile, onClose, onToast }: Props) {
  const supabase = createClient()
  const [period, setPeriod] = useState<Period>('month')
  const [scope, setScope] = useState<Scope>('me')
  const [customFrom, setCustomFrom] = useState(toDateStr(startOfMonth(new Date())))
  const [customTo, setCustomTo] = useState(toDateStr(new Date()))
  const [exporting, setExporting] = useState(false)

  function getRange(): { from: string; to: string } {
    const now = new Date()
    if (period === 'week') return { from: toDateStr(startOfWeek(now, { weekStartsOn: 1 })), to: toDateStr(endOfWeek(now, { weekStartsOn: 1 })) }
    if (period === 'month') return { from: toDateStr(startOfMonth(now)), to: toDateStr(endOfMonth(now)) }
    return { from: customFrom, to: customTo }
  }

  async function handleExport() {
    setExporting(true)
    const { from, to } = getRange()
    const nomeSafe = profile.nome.replace(/\s+/g, '_')
    const periodLabel = `${from}_${to}`
    const filename = `timesheet_${nomeSafe}_${periodLabel}.xlsx`

    try {
      let rows: Record<string, unknown>[]

      if (scope === 'team') {
        const { data, error } = await supabase.rpc('get_team_sessions', { p_inicio: from, p_fim: to })
        if (error) throw error
        rows = ((data as RpcRow[]) ?? []).map((s) => ({
          Membro: s.user_nome,
          'Mês': s.inicio.slice(0, 10),
          BU: s.bu_nome,
          Projecto: s.projecto_nome,
          'Area BU': s.area_bu ?? 'n.a',
          'Atividade': s.tag_nome ?? 'n.a',
          'Atividade Resumida': s.nota ?? '',
          Horas: s.horas ?? 0,
        }))
      } else {
        const { data, error } = await supabase
          .from('sessoes')
          .select('id, inicio, horas, nota, projecto:projectos(nome, area_bu, bu:bus(nome)), tag:activity_tags(nome)')
          .gte('inicio', `${from}T00:00:00`)
          .lte('inicio', `${to}T23:59:59`)
          .order('inicio', { ascending: true })
        if (error) throw error
        rows = ((data as unknown as PersonalRow[]) ?? []).map((s) => ({
          'Mês': s.inicio.slice(0, 10),
          BU: s.projecto.bu.nome,
          Projecto: s.projecto.nome,
          'Area BU': s.projecto.area_bu ?? 'n.a',
          'Atividade': s.tag?.nome ?? 'n.a',
          'Atividade Resumida': s.nota ?? '',
          Horas: s.horas ?? 0,
        }))
      }

      if (rows.length === 0) {
        onToast('Sem sessões no período seleccionado.', 'error')
        setExporting(false)
        return
      }

      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Timesheet')
      XLSX.writeFile(wb, filename)
      onToast(`Ficheiro "${filename}" gerado.`, 'success')
      onClose()
    } catch {
      onToast('Erro ao exportar.', 'error')
    }

    setExporting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-base font-semibold text-[color:var(--color-ink)] mb-4">Exportar timesheet</h3>

        <div className="space-y-4">
          {/* Period */}
          <div>
            <p className="text-xs font-medium text-[color:var(--color-ink)] mb-2">Período</p>
            <div className="space-y-1.5">
              {(['week', 'month', 'custom'] as Period[]).map((p) => (
                <label key={p} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="period"
                    value={p}
                    checked={period === p}
                    onChange={() => setPeriod(p)}
                    className="text-[color:var(--color-primary)]"
                  />
                  <span className="text-sm text-[color:var(--color-ink)]">
                    {p === 'week' ? 'Semana actual' : p === 'month' ? 'Mês actual' : 'Intervalo customizado'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {period === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[color:var(--color-ink)] mb-1">De</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-[color:var(--color-border-strong)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[color:var(--color-ink)] mb-1">Até</label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full px-3 py-2 border border-[color:var(--color-border-strong)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]"
                />
              </div>
            </div>
          )}

          {/* Scope */}
          <div>
            <p className="text-xs font-medium text-[color:var(--color-ink)] mb-2">Âmbito</p>
            <div className="space-y-1.5">
              {(['me', 'team'] as Scope[]).map((s) => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    value={s}
                    checked={scope === s}
                    onChange={() => setScope(s)}
                    className="text-[color:var(--color-primary)]"
                  />
                  <span className="text-sm text-[color:var(--color-ink)]">
                    {s === 'me' ? 'Só eu' : 'Toda a equipa'}
                  </span>
                </label>
              ))}
            </div>
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
            onClick={() => void handleExport()}
            disabled={exporting}
            className="px-4 py-2 text-sm bg-[color:var(--color-primary)] text-white rounded-lg hover:bg-[color:var(--color-primary-hover)] disabled:opacity-50 transition-colors"
          >
            {exporting ? 'A exportar…' : 'Exportar .xlsx'}
          </button>
        </div>
      </div>
    </div>
  )
}
