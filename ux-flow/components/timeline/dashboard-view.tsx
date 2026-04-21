'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  ComposedChart, Line, ReferenceLine,
} from 'recharts'
import type { SessionAgg, Scope, Period, PeriodRange } from './types'

interface Props {
  userId: string
  scope: Scope
  period: Period
  range: PeriodRange
}

interface ProjectRow { name: string; horas: number; fill: string }
interface BuRow { name: string; value: number; fill: string }
interface DayRow { label: string; horas: number }
interface MemberRow { name: string; horas: number }

const PT_MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function fmtH(h: number) {
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return mm > 0 ? `${hh}h${mm}m` : `${hh}h`
}

function MetricCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color ?? 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
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

export function DashboardView({ userId, scope, period, range }: Props) {
  const supabase = createClient()
  const isMobile = useMobile()
  const [sessions, setSessions] = useState<SessionAgg[]>([])
  const [targetHoras, setTargetHoras] = useState<number>(160)
  const [loading, setLoading] = useState(true)

  /* ── fetch ────────────────────────────────────────────────────── */
  useEffect(() => {
    async function load() {
      setLoading(true)

      // Load target hours from profile
      const { data: prof } = await supabase
        .from('profiles')
        .select('target_horas_mes')
        .eq('id', userId)
        .single()
      if (prof?.target_horas_mes) setTargetHoras(Number(prof.target_horas_mes))

      let rows: SessionAgg[] = []

      if (scope === 'team') {
        const { data } = await supabase.rpc('get_team_sessions', {
          p_from: range.from,
          p_to: range.to,
        })
        rows = (data ?? []) as SessionAgg[]
      } else {
        const uid = scope === 'me' ? userId : scope
        const { data } = await supabase
          .from('sessoes')
          .select('id, inicio, horas, projecto_id, projecto:projectos(nome, bu:bus(id, nome, cor)), assignee:profiles(id, nome)')
          .eq('user_id', uid)
          .gte('inicio', range.from)
          .lte('inicio', range.to + 'T23:59:59')
          .not('horas', 'is', null)

        rows = ((data ?? []) as unknown as {
          id: string
          inicio: string
          horas: number
          projecto_id: string
          projecto: { nome: string; bu: { id: string; nome: string; cor: string } } | null
          assignee: { id: string; nome: string } | null
        }[]).map((s) => ({
          id: s.id,
          inicio: s.inicio,
          horas: s.horas,
          projecto_id: s.projecto_id,
          projecto_nome: s.projecto?.nome ?? '—',
          bu_nome: s.projecto?.bu?.nome ?? '—',
          bu_cor: s.projecto?.bu?.cor ?? '#6b7280',
          area_bu: null,
          tag_nome: null,
          user_id: uid,
          user_nome: s.assignee?.nome ?? '',
        }))
      }

      setSessions(rows)
      setLoading(false)
    }
    void load()
  }, [userId, scope, range])

  /* ── derived metrics ──────────────────────────────────────────── */
  const totalHoras = useMemo(() => sessions.reduce((s, r) => s + (r.horas ?? 0), 0), [sessions])

  const activeProjectos = useMemo(
    () => new Set(sessions.map((s) => s.projecto_id)).size,
    [sessions]
  )

  const pctTarget = useMemo(() => {
    if (targetHoras === 0) return 0
    // Scale target to the selected period
    const days = Math.max(1, Math.round(
      (new Date(range.to).getTime() - new Date(range.from).getTime()) / 86_400_000
    ) + 1)
    const scaledTarget = (targetHoras / 30) * days
    return Math.round((totalHoras / scaledTarget) * 100)
  }, [totalHoras, targetHoras, range])

  const projectRows = useMemo<ProjectRow[]>(() => {
    const map = new Map<string, { name: string; horas: number; fill: string }>()
    sessions.forEach((s) => {
      const key = s.projecto_id
      if (!map.has(key)) map.set(key, { name: s.projecto_nome, horas: 0, fill: s.bu_cor })
      map.get(key)!.horas += s.horas ?? 0
    })
    return Array.from(map.values()).sort((a, b) => b.horas - a.horas).slice(0, 12)
  }, [sessions])

  const buRows = useMemo<BuRow[]>(() => {
    const map = new Map<string, { name: string; value: number; fill: string }>()
    sessions.forEach((s) => {
      if (!map.has(s.bu_nome)) map.set(s.bu_nome, { name: s.bu_nome, value: 0, fill: s.bu_cor })
      map.get(s.bu_nome)!.value += s.horas ?? 0
    })
    return Array.from(map.values()).sort((a, b) => b.value - a.value)
  }, [sessions])

  const dayRows = useMemo<DayRow[]>(() => {
    const map = new Map<string, number>()
    sessions.forEach((s) => {
      const d = s.inicio.slice(0, 10)
      map.set(d, (map.get(d) ?? 0) + (s.horas ?? 0))
    })
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, horas]) => {
        const d = new Date(date + 'T00:00:00')
        const label = `${d.getDate()} ${PT_MONTHS[d.getMonth()]}`
        return { label, horas: Math.round(horas * 10) / 10 }
      })
  }, [sessions])

  const dailyTarget = useMemo(() => Math.round((targetHoras / 22) * 10) / 10, [targetHoras])

  const memberRows = useMemo<MemberRow[]>(() => {
    if (scope !== 'team') return []
    const map = new Map<string, { name: string; horas: number }>()
    sessions.forEach((s) => {
      if (!map.has(s.user_id)) map.set(s.user_id, { name: s.user_nome, horas: 0 })
      map.get(s.user_id)!.horas += s.horas ?? 0
    })
    return Array.from(map.values()).sort((a, b) => b.horas - a.horas)
  }, [sessions, scope])

  /* ── render ───────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0,1,2,3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
        <div className="grid md:grid-cols-2 gap-4">
          <div className="h-56 bg-gray-100 rounded-xl animate-pulse" />
          <div className="h-56 bg-gray-100 rounded-xl animate-pulse" />
        </div>
      </div>
    )
  }

  const pctColor = pctTarget >= 100 ? 'text-emerald-600' : pctTarget >= 70 ? 'text-amber-500' : 'text-red-500'

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total de Horas" value={fmtH(totalHoras)} />
        <MetricCard label="% Objectivo" value={`${pctTarget}%`} color={pctColor} sub={`${fmtH(targetHoras)} target`} />
        <MetricCard label="Projectos Activos" value={String(activeProjectos)} />
        <MetricCard label="Sessões" value={String(sessions.length)} />
      </div>

      {/* Horas por dia */}
      {dayRows.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Horas por Dia</h3>
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={dayRows} margin={{ top: 4, right: isMobile ? 4 : 60, left: -20, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} width={32} />
              <Tooltip formatter={(v) => [`${v}h`, 'Horas']} />
              <Bar dataKey="horas" fill="#6366f1" radius={[3,3,0,0]} maxBarSize={32} />
              <ReferenceLine
                y={dailyTarget}
                stroke="#ef4444"
                strokeDasharray="4 3"
                label={isMobile ? undefined : { value: `${dailyTarget}h/dia`, fill: '#ef4444', fontSize: 10, position: 'right' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
          {isMobile && (
            <p className="text-xs text-red-500 mt-1">— Objectivo diário: {dailyTarget}h</p>
          )}
        </div>
      )}

      {/* Horas por projecto + BU donut */}
      <div className="grid md:grid-cols-2 gap-4">
        {projectRows.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Horas por Projecto</h3>
            <ResponsiveContainer width="100%" height={Math.max(180, projectRows.length * 30)}>
              <BarChart
                layout="vertical"
                data={projectRows}
                margin={{ top: 0, right: 36, left: 4, bottom: 0 }}
              >
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  width={isMobile ? 80 : 120}
                  tickFormatter={(v: string) => isMobile && v.length > 10 ? v.slice(0, 9) + '…' : v}
                />
                <Tooltip formatter={(v) => [fmtH(Number(v)), 'Horas']} />
                <Bar dataKey="horas" radius={[0,3,3,0]} maxBarSize={18}>
                  {projectRows.map((row, i) => (
                    <Cell key={i} fill={row.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {buRows.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Distribuição por BU</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={buRows}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="40%"
                  outerRadius="65%"
                  paddingAngle={2}
                  label={isMobile ? undefined : ({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`}
                  labelLine={!isMobile}
                >
                  {buRows.map((row, i) => (
                    <Cell key={i} fill={row.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [fmtH(Number(v)), 'Horas']} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Team comparison */}
      {scope === 'team' && memberRows.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Horas por Pessoa</h3>
          <ResponsiveContainer width="100%" height={Math.max(160, memberRows.length * 36)}>
            <BarChart
              layout="vertical"
              data={memberRows}
              margin={{ top: 0, right: 36, left: 4, bottom: 0 }}
            >
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 10 }}
                width={isMobile ? 80 : 120}
                tickFormatter={(v: string) => isMobile && v.length > 10 ? v.slice(0, 9) + '…' : v}
              />
              <Tooltip formatter={(v) => [fmtH(Number(v)), 'Horas']} />
              <Bar dataKey="horas" fill="#6366f1" radius={[0,3,3,0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Empty state */}
      {sessions.length === 0 && (
        <div className="h-48 flex flex-col items-center justify-center text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-sm font-medium">Sem sessões no período seleccionado.</p>
          <p className="text-xs mt-1">Regista horas no Tracker para as ver aqui.</p>
        </div>
      )}
    </div>
  )
}
