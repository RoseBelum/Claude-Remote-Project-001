'use client'

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSupabase } from '@/components/supabase-provider'
import { GanttView } from '@/components/timeline/gantt-view'
import { DashboardView } from '@/components/timeline/dashboard-view'
import {
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  startOfQuarter, endOfQuarter,
  format,
} from 'date-fns'
import type { Period, Scope, PeriodRange } from '@/components/timeline/types'

type TabView = 'gantt' | 'dashboard'

function isoDate(d: Date) { return format(d, 'yyyy-MM-dd') }

function buildRange(period: Period, custom: { from: string; to: string }): PeriodRange {
  const now = new Date()
  switch (period) {
    case 'week':
      return { from: isoDate(startOfWeek(now, { weekStartsOn: 1 })), to: isoDate(endOfWeek(now, { weekStartsOn: 1 })) }
    case 'month':
      return { from: isoDate(startOfMonth(now)), to: isoDate(endOfMonth(now)) }
    case 'quarter':
      return { from: isoDate(startOfQuarter(now)), to: isoDate(endOfQuarter(now)) }
    case 'custom':
      return { from: custom.from || isoDate(startOfMonth(now)), to: custom.to || isoDate(endOfMonth(now)) }
  }
}

interface MemberOption { id: string; nome: string }

export default function TimelinePage() {
  const { user } = useSupabase()
  const supabase = createClient()

  const [tabView, setTabView] = useState<TabView>('gantt')
  const [period, setPeriod] = useState<Period>('week')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [scope, setScope] = useState<Scope>('me')
  const [members, setMembers] = useState<MemberOption[]>([])

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, nome')
      .order('nome')
      .then(({ data }) => setMembers((data ?? []) as MemberOption[]))
  }, [])

  const range = useMemo(
    () => buildRange(period, { from: customFrom, to: customTo }),
    [period, customFrom, customTo]
  )

  if (!user) return null

  const PERIODS: { label: string; value: Period }[] = [
    { label: 'Semana', value: 'week' },
    { label: 'Mês', value: 'month' },
    { label: 'Quarter', value: 'quarter' },
    { label: 'Custom', value: 'custom' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 md:py-6 space-y-4 md:space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="overline mb-1 text-[0.625rem]">Módulo 03 · Plan</p>
          <h1 className="display text-3xl md:text-4xl text-[color:var(--color-ink)]">Timeline</h1>
          <p className="text-sm text-[color:var(--color-ink-muted)] font-medium mt-1 hidden md:block">
            Visão geral de projectos e sessões
          </p>
        </div>

        {/* Gantt | Dashboard toggle */}
        <div role="tablist" aria-label="Vista" className="flex glass rounded-xl overflow-hidden text-sm border border-[color:var(--color-border)] p-1 gap-1">
          {(['gantt', 'dashboard'] as TabView[]).map((t) => {
            const active = tabView === t
            return (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTabView(t)}
                className={`px-3 md:px-4 py-1.5 rounded-lg font-semibold transition-colors ${
                  active
                    ? 'bg-[color:var(--color-primary)] text-white shadow-[0_6px_16px_-6px_rgba(39,54,255,0.55)]'
                    : 'text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-primary)] hover:bg-[color:var(--color-surface-sunken)]'
                }`}
              >
                {t === 'gantt' ? 'Gantt' : 'Dashboard'}
              </button>
            )
          })}
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Period */}
        <div className="flex glass rounded-xl overflow-hidden text-sm border border-[color:var(--color-border)] p-1 gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all ${
                period === p.value
                  ? 'bg-[#2736FF] text-white shadow-sm'
                  : 'text-[#51516B] hover:text-[#2736FF] hover:bg-[color:var(--color-surface-sunken)]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom date pickers */}
        {period === 'custom' && (
          <div className="flex items-center gap-1.5 text-sm w-full sm:w-auto">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="flex-1 sm:flex-none bg-[#F1EDE1] border border-[#E4DFD1] rounded-xl px-3 py-1.5 text-[#0B0B1C] text-xs font-medium focus:outline-none focus:border-[#2736FF] focus:ring-2 focus:ring-[#2736FF]/20 min-w-0 transition-all"
            />
            <span className="text-[#51516B] flex-shrink-0 font-bold">→</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="flex-1 sm:flex-none bg-[#F1EDE1] border border-[#E4DFD1] rounded-xl px-3 py-1.5 text-[#0B0B1C] text-xs font-medium focus:outline-none focus:border-[#2736FF] focus:ring-2 focus:ring-[#2736FF]/20 min-w-0 transition-all"
            />
          </div>
        )}

        {/* Scope selector */}
        <div className="flex items-center gap-1.5 text-sm ml-auto">
          <label className="text-[#51516B] font-bold text-xs whitespace-nowrap">Ver:</label>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as Scope)}
            className="bg-[#F1EDE1] border border-[#E4DFD1] rounded-xl px-3 py-1.5 text-[#0B0B1C] text-sm font-medium focus:outline-none focus:border-[#2736FF] focus:ring-2 focus:ring-[#2736FF]/20 max-w-[130px] transition-all"
          >
            <option value="me">Eu</option>
            <option value="team">Equipa</option>
            {members
              .filter((m) => m.id !== user.id)
              .map((m) => (
                <option key={m.id} value={m.id}>{m.nome}</option>
              ))}
          </select>
        </div>
      </div>

      {/* Range label */}
      <p className="text-xs text-[#51516B] font-medium">
        {range.from} → {range.to}
      </p>

      {/* Main content */}
      {tabView === 'gantt' ? (
        <GanttView
          userId={user.id}
          scope={scope}
          from={range.from}
          to={range.to}
        />
      ) : (
        <DashboardView
          userId={user.id}
          scope={scope}
          period={period}
          range={range}
        />
      )}
    </div>
  )
}
