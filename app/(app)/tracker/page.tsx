'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSupabase } from '@/components/supabase-provider'
import { TimerPanel } from '@/components/tracker/timer-panel'
import { SessionList } from '@/components/tracker/session-list'
import { ExportModal } from '@/components/tracker/export-modal'
import type { BU, Projecto, ActivityTag } from '@/types'
import type { CreatedSession } from '@/components/tracker/timer-panel'
import type { SessaoRow } from '@/components/tracker/session-list'

interface Toast {
  id: number
  msg: string
  type: 'success' | 'error'
}

let toastId = 0

export default function TrackerPage() {
  const supabase = createClient()
  const { user, profile } = useSupabase()

  const [bus, setBus] = useState<BU[]>([])
  const [projectos, setProjectos] = useState<Projecto[]>([])
  const [tags, setTags] = useState<ActivityTag[]>([])
  const [ready, setReady] = useState(false)

  const [newSession, setNewSession] = useState<SessaoRow | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    async function load() {
      const [{ data: b }, { data: p }, { data: t }] = await Promise.all([
        supabase.from('bus').select('*').order('nome'),
        supabase.from('projectos').select('*, bu:bus(*)').eq('estado', 'activo').order('nome'),
        supabase.from('activity_tags').select('*').order('nome'),
      ])
      setBus(b ?? [])
      setProjectos(p ?? [])
      setTags(t ?? [])
      setReady(true)
    }
    void load()
  }, [])

  const addToast = useCallback((msg: string, type: 'success' | 'error') => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, msg, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500)
  }, [])

  function handleSessionCreated(s: CreatedSession) {
    setNewSession(s as unknown as SessaoRow)
  }

  if (!ready || !user) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-9 w-48 bg-white rounded-2xl" />
          <div className="flex flex-col md:grid md:grid-cols-5 gap-6">
            <div className="md:col-span-2 h-[480px] bg-[color:var(--color-surface-sunken)] rounded-[2rem]" />
            <div className="md:col-span-3 h-[480px] bg-[color:var(--color-surface-sunken)] rounded-[2rem]" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-end justify-between mb-7 gap-4">
        <div>
          <p className="overline mb-1">Módulo 01 · Time</p>
          <h1 className="display text-3xl md:text-4xl text-[color:var(--color-ink)]">Time Tracker</h1>
          <p className="text-sm text-[color:var(--color-ink-muted)] font-medium mt-1">Regista e gere o teu tempo</p>
        </div>
        <button
          type="button"
          onClick={() => setExportOpen(true)}
          className="px-4 py-2.5 text-sm font-bold bg-white text-[color:var(--color-primary)] rounded-xl border border-[color:var(--color-primary)]/30 hover:border-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-soft)] transition-colors"
        >
          Exportar
        </button>
      </div>

      {/* Main layout: 2/5 + 3/5 on desktop, stacked on mobile */}
      <div className="flex flex-col md:grid md:grid-cols-5 gap-6">
        <div className="md:col-span-2">
          <TimerPanel
            bus={bus}
            projectos={projectos}
            tags={tags}
            userId={user.id}
            onSessionCreated={handleSessionCreated}
            onToast={addToast}
          />
        </div>
        <div className="md:col-span-3">
          <SessionList
            projectos={projectos}
            tags={tags}
            targetHorasMes={profile?.target_horas_mes ?? 168}
            newSession={newSession}
            onToast={addToast}
          />
        </div>
      </div>

      {/* Export modal */}
      {exportOpen && profile && (
        <ExportModal
          profile={profile}
          onClose={() => setExportOpen(false)}
          onToast={addToast}
        />
      )}

      {/* Toasts */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-20 md:bottom-6 right-4 space-y-2 z-50"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-2xl shadow-xl text-sm font-bold ${
              t.type === 'success'
                ? 'bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border border-[color:var(--color-success-ring)]'
                : 'bg-[color:var(--color-danger-soft)] text-[color:var(--color-danger)] border border-[color:var(--color-danger-ring)]'
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  )
}
