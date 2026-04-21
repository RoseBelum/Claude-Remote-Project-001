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
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Timeline &amp; Dashboard</h1>

        {/* Gantt | Dashboard toggle */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          {(['gantt', 'dashboard'] as TabView[]).map((t) => (
            <button
              key={t}
              onClick={() => setTabView(t)}
              className={`px-4 py-2 transition-colors capitalize ${
                tabView === t ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t === 'gantt' ? 'Gantt' : 'Dashboard'}
            </button>
          ))}
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Period */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 transition-colors ${
                period === p.value ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom date pickers */}
        {period === 'custom' && (
          <div className="flex items-center gap-2 text-sm">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-gray-400">→</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        {/* Scope selector */}
        <div className="flex items-center gap-2 ml-auto text-sm">
          <label className="text-gray-500 font-medium">Ver:</label>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as Scope)}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
      <p className="text-xs text-gray-400">
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
