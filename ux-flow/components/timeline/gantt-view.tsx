'use client'

import { useEffect, useRef, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TaskModal } from '@/components/board/task-modal'
import type { TarefaFull } from '@/components/board/types'
import type { Projecto, KanbanEstado } from '@/types'
import type { Scope } from './types'

interface BUFilter { id: string; nome: string; cor: string; checked: boolean }

interface Props {
  userId: string
  scope: Scope
  from: string
  to: string
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '_')
}

function useMobile() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    function check() { setMobile(window.innerWidth < 768) }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return mobile
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  const dt = new Date(d + 'T00:00:00')
  return `${dt.getDate().toString().padStart(2,'0')}/${(dt.getMonth()+1).toString().padStart(2,'0')}`
}

export function GanttView({ userId, scope, from, to }: Props) {
  const supabase = createClient()
  const containerRef = useRef<HTMLDivElement>(null)
  const isMobile = useMobile()

  const [tasks, setTasks] = useState<TarefaFull[]>([])
  const [estados, setEstados] = useState<KanbanEstado[]>([])
  const [projectos, setProjectos] = useState<Projecto[]>([])
  const [profiles, setProfiles] = useState<{ id: string; nome: string; avatar_url: string | null }[]>([])
  const [buFilters, setBuFilters] = useState<BUFilter[]>([])
  const [hideNoDates, setHideNoDates] = useState(false)
  const [viewMode, setViewMode] = useState<string>('Week')
  const [modalTask, setModalTask] = useState<TarefaFull | null>(null)
  const [loading, setLoading] = useState(true)

  /* ── fetch shared lookups ───────────────────────────────────── */
  useEffect(() => {
    async function load() {
      const [{ data: es }, { data: ps }, { data: prs }] = await Promise.all([
        supabase.from('kanban_estados').select('*').order('ordem'),
        supabase.from('projectos').select('*, bu:bus(*)').eq('estado', 'activo').order('nome'),
        supabase.from('profiles').select('id, nome, avatar_url').order('nome'),
      ])
      setEstados((es ?? []) as KanbanEstado[])
      setProjectos((ps ?? []) as Projecto[])
      setProfiles(prs ?? [])
    }
    void load()
  }, [])

  /* ── fetch tasks ────────────────────────────────────────────── */
  useEffect(() => {
    async function fetch() {
      setLoading(true)
      let q = supabase
        .from('tarefas')
        .select('*, projecto:projectos(nome, bu:buses(id, nome, cor)), assignee:profiles(nome, avatar_url)')
        .order('data_inicio', { ascending: true })

      if (scope === 'me') q = q.eq('assignee_id', userId)
      else if (scope !== 'team') q = q.eq('assignee_id', scope)

      const { data } = await q
      const all = (data as TarefaFull[]) ?? []
      setTasks(all)

      const seen = new Map<string, BUFilter>()
      all.forEach((t) => {
        const bu = t.projecto?.bu as { id: string; nome: string; cor: string } | null
        if (bu && !seen.has(bu.id)) seen.set(bu.id, { ...bu, checked: true })
      })
      setBuFilters(Array.from(seen.values()))
      setLoading(false)
    }
    void fetch()
  }, [userId, scope, from, to])

  /* ── filtered tasks ─────────────────────────────────────────── */
  const filteredTasks = useMemo(() => {
    const enabledBus = new Set(buFilters.filter((b) => b.checked).map((b) => b.id))
    return tasks.filter((t) => {
      const buId = (t.projecto?.bu as unknown as { id: string } | null)?.id
      if (buId && !enabledBus.has(buId)) return false
      if (hideNoDates && (!t.data_inicio || !t.data_fim)) return false
      return true
    })
  }, [tasks, buFilters, hideNoDates])

  /* ── inject frappe-gantt styles once ────────────────────────── */
  useEffect(() => {
    if (document.getElementById('frappe-gantt-css')) return
    const link = document.createElement('link')
    link.id = 'frappe-gantt-css'
    link.rel = 'stylesheet'
    link.href = '/frappe-gantt.css'
    document.head.appendChild(link)
  }, [])

  /* ── build / refresh Gantt (desktop only) ───────────────────── */
  useEffect(() => {
    if (isMobile) return
    if (!containerRef.current || loading) return
    if (filteredTasks.length === 0) return

    let cancelled = false

    import('frappe-gantt').then((mod) => {
      if (cancelled || !containerRef.current) return
      const Gantt = (mod as { default: new (...a: unknown[]) => unknown }).default as new (
        el: HTMLElement,
        tasks: unknown[],
        opts: unknown
      ) => { change_view_mode: (m: string) => void }

      const today = new Date().toISOString().slice(0, 10)

      const ganttTasks = filteredTasks.map((t) => ({
        id: t.id,
        name: scope === 'team' && t.assignee
          ? `${t.titulo} (${t.assignee.nome.split(' ')[0]})`
          : t.titulo,
        start: t.data_inicio ?? today,
        end: t.data_fim ?? t.data_inicio ?? today,
        progress: 0,
        custom_class: `bu-${slugify((t.projecto?.bu as { nome: string } | null)?.nome ?? '')}`,
      }))

      containerRef.current.innerHTML = ''

      new Gantt(containerRef.current, ganttTasks, {
        view_mode: viewMode,
        date_format: 'YYYY-MM-DD',
        on_date_change: async (task: { id: string }, start: string, end: string) => {
          await supabase
            .from('tarefas')
            .update({ data_inicio: start.slice(0, 10), data_fim: end.slice(0, 10) })
            .eq('id', task.id)
        },
        on_click: (task: { id: string }) => {
          const found = tasks.find((t) => t.id === task.id)
          if (found) setModalTask(found)
        },
      })
    })

    return () => { cancelled = true }
  }, [filteredTasks, viewMode, loading, isMobile])

  const VIEW_MODES = [
    { label: 'Dia', value: 'Day' },
    { label: 'Sem', value: 'Week' },
    { label: 'Mês', value: 'Month' },
    { label: 'Q', value: 'Quarter Year' },
  ]

  const tasksWithDates = filteredTasks.filter((t) => t.data_inicio || t.data_fim)

  return (
    <div className="space-y-4">
      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        {/* View mode — desktop only */}
        {!isMobile && (
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {VIEW_MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => setViewMode(m.value)}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  viewMode === m.value ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}

        {/* Hide no dates */}
        <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={hideNoDates}
            onChange={(e) => setHideNoDates(e.target.checked)}
            className="rounded text-indigo-600 w-4 h-4"
          />
          Sem datas
        </label>

        {/* BU filters */}
        <div className="flex flex-wrap gap-2">
          {buFilters.map((b) => (
            <label key={b.id} className="flex items-center gap-1 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={b.checked}
                onChange={(e) => setBuFilters((prev) =>
                  prev.map((bf) => bf.id === b.id ? { ...bf, checked: e.target.checked } : bf)
                )}
                className="rounded w-4 h-4"
              />
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: b.cor }} />
              <span className="text-gray-600">{b.nome}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      ) : tasksWithDates.length === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-sm font-medium">Nenhuma tarefa com datas definidas.</p>
          <p className="text-xs mt-1">Adiciona datas às tarefas no Task Board para as ver aqui.</p>
        </div>
      ) : isMobile ? (
        /* ── Mobile: sorted task list ───────────────────────────── */
        <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
          {tasksWithDates
            .slice()
            .sort((a, b) => (a.data_inicio ?? '').localeCompare(b.data_inicio ?? ''))
            .map((t) => {
              const bu = t.projecto?.bu as { nome: string; cor: string } | null
              const assigneeName = scope === 'team' && t.assignee
                ? t.assignee.nome.split(' ')[0]
                : null
              return (
                <button
                  key={t.id}
                  onClick={() => setModalTask(t)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  {/* BU colour stripe */}
                  <span
                    className="flex-shrink-0 w-1 self-stretch rounded-full"
                    style={{ backgroundColor: bu?.cor ?? '#6366f1' }}
                  />
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{t.titulo}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {t.projecto?.nome ?? ''}
                      {assigneeName ? ` · ${assigneeName}` : ''}
                    </p>
                  </div>
                  {/* Dates */}
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs font-medium text-gray-700 tabular-nums">{fmtDate(t.data_inicio)}</p>
                    {t.data_fim && t.data_fim !== t.data_inicio && (
                      <p className="text-xs text-gray-400 tabular-nums">→ {fmtDate(t.data_fim)}</p>
                    )}
                  </div>
                  {/* Chevron */}
                  <span className="flex-shrink-0 text-gray-300 text-sm">›</span>
                </button>
              )
            })}
        </div>
      ) : (
        /* ── Desktop: Frappe Gantt ──────────────────────────────── */
        <div
          ref={containerRef}
          className="overflow-x-auto rounded-xl border border-gray-200 bg-white"
          style={{ minHeight: 200 }}
        />
      )}

      {/* Task modal */}
      {modalTask && (
        <TaskModal
          tarefa={modalTask}
          projectos={projectos}
          estados={estados}
          profiles={profiles}
          onSaved={(updated) => {
            setTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t))
            setModalTask(null)
          }}
          onDeleted={(id) => {
            setTasks((prev) => prev.filter((t) => t.id !== id))
            setModalTask(null)
          }}
          onClose={() => setModalTask(null)}
          onToast={() => {}}
        />
      )}
    </div>
  )
}
