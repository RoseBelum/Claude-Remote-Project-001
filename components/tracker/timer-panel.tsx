'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { BU, Projecto, ActivityTag } from '@/types'

const STORAGE_KEY = 'ux-flow:activeSession'

interface ActiveSessionStore {
  buId: string
  projectoId: string
  tagId: string | null
  nota: string
  inicio: string
}

export interface CreatedSession {
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
  bus: BU[]
  projectos: Projecto[]
  tags: ActivityTag[]
  userId: string
  onSessionCreated: (s: CreatedSession) => void
  onToast: (msg: string, type: 'success' | 'error') => void
}

function formatTime(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function TimerPanel({ bus, projectos, tags, userId, onSessionCreated, onToast }: Props) {
  const supabase = createClient()

  const [buId, setBuId] = useState('')
  const [projectoId, setProjectoId] = useState('')
  const [tagId, setTagId] = useState('')
  const [nota, setNota] = useState('')

  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [saving, setSaving] = useState(false)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Restore session from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return
    try {
      const session: ActiveSessionStore = JSON.parse(stored)
      const start = new Date(session.inicio)
      const elapsedSecs = Math.floor((Date.now() - start.getTime()) / 1000)
      setBuId(session.buId ?? '')
      setProjectoId(session.projectoId)
      setTagId(session.tagId ?? '')
      setNota(session.nota)
      setStartTime(start)
      setElapsed(elapsedSecs)
      setRunning(true)
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  // Interval
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed((p) => p + 1), 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running])

  // Keyboard shortcut: Space/Enter
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) return
      if (e.code !== 'Space' && e.code !== 'Enter') return
      e.preventDefault()
      if (running) void stop()
      else if (projectoId) start()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [running, projectoId])

  function start() {
    if (!projectoId) return
    const now = new Date()
    setStartTime(now)
    setElapsed(0)
    setRunning(true)
    const store: ActiveSessionStore = { buId, projectoId, tagId: tagId || null, nota, inicio: now.toISOString() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  }

  async function stop() {
    if (!startTime || !projectoId) return
    setSaving(true)
    const now = new Date()
    const horas = Math.round(((now.getTime() - startTime.getTime()) / 3600000) * 100) / 100

    const { data, error } = await supabase
      .from('sessoes')
      .insert({
        user_id: userId,
        projecto_id: projectoId,
        tag_id: tagId || null,
        inicio: startTime.toISOString(),
        fim: now.toISOString(),
        horas,
        nota: nota.trim() || null,
      })
      .select('*, projecto:projectos(nome, area_bu, bu:bus(nome, cor)), tag:activity_tags(nome, cor)')
      .single()

    localStorage.removeItem(STORAGE_KEY)
    setRunning(false)
    setElapsed(0)
    setStartTime(null)
    setNota('')
    setSaving(false)

    if (error) {
      onToast('Erro ao guardar sessão.', 'error')
    } else if (data) {
      onSessionCreated(data as CreatedSession)
      onToast('Sessão guardada.', 'success')
    }
  }

  const filteredProjectos = buId ? projectos.filter((p) => p.bu_id === buId) : projectos
  const activeProjecto = projectos.find((p) => p.id === projectoId)
  const showLongWarning = running && elapsed > 4 * 3600

  return (
    <div className="glass rounded-[2rem] p-7 space-y-5">
      {/* Form */}
      <div className="space-y-4">
        <div>
          <label htmlFor="tracker-bu" className="block text-xs font-extrabold text-[color:var(--color-ink-muted)] uppercase tracking-[0.2em] mb-2">BU</label>
          <select
            id="tracker-bu"
            value={buId}
            onChange={(e) => { setBuId(e.target.value); setProjectoId('') }}
            disabled={running}
            className="w-full px-4 py-2.5 bg-[color:var(--color-surface-sunken)] border border-[color:var(--color-border)] rounded-xl text-sm font-medium focus:outline-none focus:border-[color:var(--color-primary)] focus:ring-2 focus:ring-[color:var(--color-primary)]/25 disabled:opacity-60 transition-colors"
          >
            <option value="">Todas as BUs</option>
            {bus.map((b) => (
              <option key={b.id} value={b.id}>{b.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="tracker-projecto" className="block text-xs font-extrabold text-[color:var(--color-ink-muted)] uppercase tracking-[0.2em] mb-2">
            Projecto <span aria-hidden className="text-[color:var(--color-accent)]">*</span>
            <span className="sr-only"> (obrigatório)</span>
          </label>
          <select
            id="tracker-projecto"
            value={projectoId}
            onChange={(e) => setProjectoId(e.target.value)}
            disabled={running}
            required
            aria-required="true"
            className="w-full px-4 py-2.5 bg-[color:var(--color-surface-sunken)] border border-[color:var(--color-border)] rounded-xl text-sm font-medium focus:outline-none focus:border-[color:var(--color-primary)] focus:ring-2 focus:ring-[color:var(--color-primary)]/25 disabled:opacity-60 transition-colors"
          >
            <option value="">Seleccionar projecto</option>
            {filteredProjectos.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="tracker-tag" className="block text-xs font-extrabold text-[color:var(--color-ink-muted)] uppercase tracking-[0.2em] mb-2">Activity Tag</label>
          <select
            id="tracker-tag"
            value={tagId}
            onChange={(e) => setTagId(e.target.value)}
            disabled={running}
            className="w-full px-4 py-2.5 bg-[color:var(--color-surface-sunken)] border border-[color:var(--color-border)] rounded-xl text-sm font-medium focus:outline-none focus:border-[color:var(--color-primary)] focus:ring-2 focus:ring-[color:var(--color-primary)]/25 disabled:opacity-60 transition-colors"
          >
            <option value="">Sem tag</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>{t.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="tracker-nota" className="block text-xs font-extrabold text-[color:var(--color-ink-muted)] uppercase tracking-[0.2em] mb-2">Nota</label>
          <input
            id="tracker-nota"
            type="text"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Breve descrição (opcional)"
            className="w-full px-4 py-2.5 bg-[color:var(--color-surface-sunken)] border border-[color:var(--color-border)] rounded-xl text-sm font-medium focus:outline-none focus:border-[color:var(--color-primary)] focus:ring-2 focus:ring-[color:var(--color-primary)]/25 transition-colors"
          />
        </div>
      </div>

      {/* Long session warning */}
      {showLongWarning && (
        <div
          role="alert"
          className="bg-[color:var(--color-warning-soft)] border border-[color:var(--color-warning-ring)] rounded-xl px-4 py-2.5 text-xs font-semibold text-[color:var(--color-warning)]"
        >
          <span aria-hidden>⚠️ </span>Sessão activa há mais de 4h. Não te esqueças de parar o cronómetro.
        </div>
      )}

      {/* Timer display — cosmic panel */}
      <div
        className="relative overflow-hidden rounded-[1.5rem] p-6 text-center space-bg"
        role="timer"
        aria-live="off"
        aria-atomic="true"
      >
        {running && activeProjecto && (
          <div className="relative z-10 mb-3 flex justify-center">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 text-white text-xs font-bold uppercase tracking-[0.18em] rounded-full border border-white/20">
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: '#7FE0A3', boxShadow: '0 0 8px rgba(127,224,163,0.8)' }}
                aria-hidden
              />
              {activeProjecto.nome}
            </span>
          </div>
        )}
        <div
          className={`relative z-10 font-bold text-6xl tracking-tighter leading-none tabular-nums ${running ? 'text-white' : 'text-[color:var(--color-space-ink-subtle)]'}`}
        >
          {formatTime(elapsed)}
        </div>
        {!running && !projectoId && (
          <p className="relative z-10 mt-2 text-xs text-[color:var(--color-space-ink-muted)] font-medium">
            Selecciona um projecto para começar
          </p>
        )}
      </div>

      {/* Start / Stop */}
      {running ? (
        <button
          type="button"
          onClick={() => void stop()}
          disabled={saving}
          aria-label="Parar sessão"
          className="w-full py-3.5 bg-[color:var(--color-danger)] text-white text-sm font-bold rounded-2xl hover:bg-[#7A0B13] disabled:opacity-50 transition-colors uppercase tracking-[0.18em] shadow-[0_10px_30px_-8px_rgba(161,0,28,0.55)]"
        >
          {saving ? 'A guardar…' : '■  Parar sessão'}
        </button>
      ) : (
        <button
          type="button"
          onClick={start}
          disabled={!projectoId}
          aria-label="Iniciar sessão"
          className="w-full py-3.5 bg-[color:var(--color-primary)] text-white text-sm font-bold rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[color:var(--color-primary-hover)] transition-colors uppercase tracking-[0.18em] shadow-[0_10px_30px_-8px_rgba(39,54,255,0.55)]"
        >
          ▶  Iniciar
        </button>
      )}
    </div>
  )
}
