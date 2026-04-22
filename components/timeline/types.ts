export type Period = 'week' | 'month' | 'quarter' | 'custom'
export type Scope = 'me' | 'team' | string   // string = specific profile id
export type GanttViewMode = 'Day' | 'Week' | 'Month' | 'Quarter Year'

export interface PeriodRange {
  from: string   // yyyy-MM-dd
  to: string
}

export interface SessionAgg {
  id: string
  inicio: string
  horas: number | null
  projecto_id: string
  projecto_nome: string
  bu_nome: string
  bu_cor: string
  area_bu: string | null
  tag_nome: string | null
  user_id: string
  user_nome: string
}
