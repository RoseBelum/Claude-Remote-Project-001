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
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      {/* Form */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">BU</label>
          <select
            value={buId}
            onChange={(e) => { setBuId(e.target.value); setProjectoId('') }}
            disabled={running}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:opacity-60"
          >
            <option value="">Todas as BUs</option>
            {bus.map((b) => (
              <option key={b.id} value={b.id}>{b.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Projecto *</label>
          <select
            value={projectoId}
            onChange={(e) => setProjectoId(e.target.value)}
            disabled={running}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:opacity-60"
          >
            <option value="">Seleccionar projecto</option>
            {filteredProjectos.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Activity Tag</label>
          <select
            value={tagId}
            onChange={(e) => setTagId(e.target.value)}
            disabled={running}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:opacity-60"
          >
            <option value="">Sem tag</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>{t.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Nota</label>
          <input
            type="text"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Breve descrição da actividade (opcional)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="border-t border-gray-100" />

      {/* Long session warning */}
      {showLongWarning && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-800">
          Tens uma sessão activa há mais de 4h. Não te esqueças de parar o cronómetro.
        </div>
      )}

      {/* Timer */}
      <div className="text-center py-4">
        <div className={`font-mono text-6xl font-bold tracking-tight transition-colors ${running ? 'text-gray-900' : 'text-gray-300'}`}>
          {formatTime(elapsed)}
        </div>
        {running && activeProjecto && (
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-gray-500 truncate max-w-xs">{activeProjecto.nome}</span>
          </div>
        )}
      </div>

      {/* Start / Stop */}
      {running ? (
        <button
          onClick={() => void stop()}
          disabled={saving}
          className="w-full py-3 bg-red-500 text-white text-base font-semibold rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors"
        >
          {saving ? 'A guardar…' : 'Parar'}
        </button>
      ) : (
        <button
          onClick={start}
          disabled={!projectoId}
          className="w-full py-3 bg-green-500 text-white text-base font-semibold rounded-xl hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Iniciar
        </button>
      )}
    </div>
  )
}
