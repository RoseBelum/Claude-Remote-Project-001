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
          <label className="block text-xs font-bold text-[#44444F] uppercase tracking-widest mb-2">BU</label>
          <select
            value={buId}
            onChange={(e) => { setBuId(e.target.value); setProjectoId('') }}
            disabled={running}
            className="w-full px-4 py-2.5 bg-[#F6F6F1] border border-[#E8E8E4] rounded-xl text-sm font-medium focus:outline-none focus:border-[#5B5BD6] focus:ring-2 focus:ring-[#5B5BD6]/20 disabled:opacity-50 transition-all"
          >
            <option value="">Todas as BUs</option>
            {bus.map((b) => (
              <option key={b.id} value={b.id}>{b.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#44444F] uppercase tracking-widest mb-2">Projecto *</label>
          <select
            value={projectoId}
            onChange={(e) => setProjectoId(e.target.value)}
            disabled={running}
            className="w-full px-4 py-2.5 bg-[#F6F6F1] border border-[#E8E8E4] rounded-xl text-sm font-medium focus:outline-none focus:border-[#5B5BD6] focus:ring-2 focus:ring-[#5B5BD6]/20 disabled:opacity-50 transition-all"
          >
            <option value="">Seleccionar projecto</option>
            {filteredProjectos.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#44444F] uppercase tracking-widest mb-2">Activity Tag</label>
          <select
            value={tagId}
            onChange={(e) => setTagId(e.target.value)}
            disabled={running}
            className="w-full px-4 py-2.5 bg-[#F6F6F1] border border-[#E8E8E4] rounded-xl text-sm font-medium focus:outline-none focus:border-[#5B5BD6] focus:ring-2 focus:ring-[#5B5BD6]/20 disabled:opacity-50 transition-all"
          >
            <option value="">Sem tag</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>{t.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#44444F] uppercase tracking-widest mb-2">Nota</label>
          <input
            type="text"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Breve descrição (opcional)"
            className="w-full px-4 py-2.5 bg-[#F6F6F1] border border-[#E8E8E4] rounded-xl text-sm font-medium focus:outline-none focus:border-[#5B5BD6] focus:ring-2 focus:ring-[#5B5BD6]/20 transition-all"
          />
        </div>
      </div>

      {/* Long session warning */}
      {showLongWarning && (
        <div className="bg-[#ffdad6] border border-[#ffb3af] rounded-xl px-4 py-2.5 text-xs font-semibold text-[#93000a]">
          ⚠️ Sessão activa há mais de 4h. Não te esqueças de parar o cronómetro.
        </div>
      )}

      {/* Timer display */}
      <div className="rounded-[1.5rem] p-6 text-center relative overflow-hidden" style={{ backgroundColor: '#EDEDFF' }}>
        {running && activeProjecto && (
          <div className="mb-3 flex justify-center">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#D4ECC4] text-[#3D6B35] text-xs font-bold uppercase tracking-wider rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3D6B35] animate-pulse" />
              {activeProjecto.nome}
            </span>
          </div>
        )}
        <div className={`font-bold text-6xl tracking-tighter leading-none transition-colors ${running ? 'text-[#1A1A2E]' : 'text-[#C4C0D0]'}`}>
          {formatTime(elapsed)}
        </div>
        {!running && !projectoId && (
          <p className="mt-2 text-xs text-[#6B6880] font-medium">Selecciona um projecto para começar</p>
        )}
      </div>

      {/* Start / Stop */}
      {running ? (
        <button
          onClick={() => void stop()}
          disabled={saving}
          className="w-full py-3.5 bg-[#ffdad6] text-[#93000a] text-sm font-bold rounded-2xl hover:bg-red-100 disabled:opacity-50 transition-all uppercase tracking-wider shadow-sm"
        >
          {saving ? 'A guardar…' : '⏹  Parar sessão'}
        </button>
      ) : (
        <button
          onClick={start}
          disabled={!projectoId}
          className="w-full py-3.5 text-white text-sm font-bold rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed transition-all uppercase tracking-wider shadow-lg"
          style={{ backgroundColor: '#5B5BD6' }}
        >
          ▶  Iniciar
        </button>
      )}
    </div>
  )
}
