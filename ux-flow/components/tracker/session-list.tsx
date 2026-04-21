'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Projecto, ActivityTag } from '@/types'
import { EditModal } from './edit-modal'

const PT_DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const PT_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function formatDateLabel(d: Date) {
  return `${PT_DAYS[d.getDay()]}, ${d.getDate()} ${PT_MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

function formatTimeRange(inicio: string, fim: string | null) {
  const start = inicio.slice(11, 16)
  const end = fim ? fim.slice(11, 16) : '…'
  return `${start} – ${end}`
}

function formatHoras(h: number | null) {
  if (!h) return '0h'
  return `${h.toString().replace('.', ',')}h`
}

function getWorkingDaysInMonth(year: number, month: number) {
  const days = new Date(year, month + 1, 0).getDate()
  let count = 0
  for (let d = 1; d <= days; d++) {
    const wd = new Date(year, month, d).getDay()
    if (wd !== 0 && wd !== 6) count++
  }
  return count
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

export interface SessaoRow {
  id: string
  user_id: string
  projecto_id: string
  tag_id: string | null
  inicio: string
  fim: string | null
  horas: number | null
  nota: string | null
  editado_em: string | null
  created_at: string
  projecto: { nome: string; area_bu: string | null; bu: { nome: string; cor: string } }
  tag: { nome: string; cor: string } | null
}

interface Props {
  projectos: Projecto[]
  tags: ActivityTag[]
  targetHorasMes: number
  newSession: SessaoRow | null
  onToast: (msg: string, type: 'success' | 'error') => void
}

function SkeletonRow() {
  return (
    <div className="animate-pulse py-3 px-4 border-b border-gray-100 flex items-center gap-3">
      <div className="w-16 h-5 bg-gray-200 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <div className="w-40 h-4 bg-gray-200 rounded" />
        <div className="w-28 h-3 bg-gray-100 rounded" />
      </div>
      <div className="w-10 h-4 bg-gray-200 rounded" />
    </div>
  )
}

export function SessionList({ projectos, tags, targetHorasMes, newSession, onToast }: Props) {
  const supabase = createClient()
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [sessions, setSessions] = useState<SessaoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editingSessao, setEditingSessao] = useState<SessaoRow | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchSessions = useCallback(
    async (date: Date) => {
      setLoading(true)
      const dateStr = toDateStr(date)
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)
      const nextStr = toDateStr(nextDate)

      const { data } = await supabase
        .from('sessoes')
        .select('*, projecto:projectos(nome, area_bu, bu:bus(nome, cor)), tag:activity_tags(nome, cor)')
        .gte('inicio', `${dateStr}T00:00:00`)
        .lt('inicio', `${nextStr}T00:00:00`)
        .order('inicio', { ascending: true })

      setSessions((data as SessaoRow[]) ?? [])
      setLoading(false)
    },
    [supabase]
  )

  useEffect(() => {
    void fetchSessions(selectedDate)
  }, [selectedDate, fetchSessions])

  // Add newly created session if it belongs to the selected date
  useEffect(() => {
    if (!newSession) return
    const sessionDate = newSession.inicio.slice(0, 10)
    const viewDate = toDateStr(selectedDate)
    if (sessionDate === viewDate) {
      setSessions((prev) => {
        const exists = prev.some((s) => s.id === newSession.id)
        if (exists) return prev
        return [...prev, newSession].sort((a, b) => a.inicio.localeCompare(b.inicio))
      })
    }
  }, [newSession])

  function goDay(offset: number) {
    setSelectedDate((d) => {
      const next = new Date(d)
      next.setDate(next.getDate() + offset)
      return next
    })
  }

  const isToday = toDateStr(selectedDate) === toDateStr(new Date())

  async function handleDelete(id: string) {
    if (!confirm('Apagar esta sessão?')) return
    setDeletingId(id)
    setSessions((prev) => prev.filter((s) => s.id !== id))
    const { error } = await supabase.from('sessoes').delete().eq('id', id)
    setDeletingId(null)
    if (error) {
      onToast('Erro ao apagar.', 'error')
      void fetchSessions(selectedDate)
    } else {
      onToast('Sessão apagada.', 'success')
    }
  }

  function handleEdited(updated: SessaoRow) {
    setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
  }

  const totalHoras = sessions.reduce((sum, s) => sum + (s.horas ?? 0), 0)
  const workingDays = getWorkingDaysInMonth(selectedDate.getFullYear(), selectedDate.getMonth())
  const dailyTarget = workingDays > 0 ? targetHorasMes / workingDays : 8
  const pct = dailyTarget > 0 ? Math.min(100, Math.round((totalHoras / dailyTarget) * 100)) : 0

  return (
    <div className="bg-white border border-gray-200 rounded-xl flex flex-col">
      {/* Date navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <button
          onClick={() => goDay(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
        >
          ‹
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{formatDateLabel(selectedDate)}</span>
          {!isToday && (
            <button
              onClick={() => setSelectedDate(new Date())}
              className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors"
            >
              Hoje
            </button>
          )}
        </div>
        <button
          onClick={() => goDay(1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
        >
          ›
        </button>
      </div>

      {/* Session rows */}
      <div className="flex-1 divide-y divide-gray-100">
        {loading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : sessions.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-400">Sem sessões neste dia.</p>
            <p className="text-xs text-gray-300 mt-1">Usa o cronómetro para registar tempo.</p>
          </div>
        ) : (
          sessions.map((s) => {
            const buCor = s.projecto.bu.cor
            return (
              <div key={s.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 group">
                {/* BU badge */}
                <span
                  className="flex-shrink-0 mt-0.5 text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: buCor + '22', color: buCor }}
                >
                  {s.projecto.bu.nome}
                </span>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900 truncate">{s.projecto.nome}</span>
                    {s.tag && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: s.tag.cor + '22', color: s.tag.cor }}
                      >
                        {s.tag.nome}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400">{formatTimeRange(s.inicio, s.fim)}</span>
                    {s.nota && <span className="text-xs text-gray-500 truncate">{s.nota}</span>}
                  </div>
                </div>

                {/* Hours */}
                <span className="flex-shrink-0 text-sm font-medium text-gray-700 tabular-nums">
                  {formatHoras(s.horas)}
                </span>

                {/* Actions */}
                <div className="flex-shrink-0 flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditingSessao(s)}
                    className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-500 text-sm transition-colors"
                    title="Editar"
                  >
                    ✏
                  </button>
                  <button
                    onClick={() => void handleDelete(s.id)}
                    disabled={deletingId === s.id}
                    className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-red-100 text-red-400 text-sm transition-colors disabled:opacity-50"
                    title="Apagar"
                  >
                    🗑
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Daily total */}
      {!loading && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-500">Total do dia</span>
            <span className="text-sm font-semibold text-gray-900">
              {formatHoras(totalHoras)}
              <span className="text-xs text-gray-400 font-normal ml-1">
                de {formatHoras(Math.round(dailyTarget * 10) / 10)} objectivo · {pct}%
              </span>
            </span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingSessao && (
        <EditModal
          sessao={editingSessao}
          projectos={projectos}
          tags={tags}
          onSaved={handleEdited}
          onClose={() => setEditingSessao(null)}
          onToast={onToast}
        />
      )}
    </div>
  )
}
