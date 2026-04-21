export interface Profile {
  id: string
  nome: string
  avatar_url: string | null
  target_horas_mes: number
  created_at: string
}

export interface BU {
  id: string
  nome: string
  cor: string
  created_at: string
}

export interface Projecto {
  id: string
  nome: string
  bu_id: string
  bu?: BU
  area_bu: string | null
  estado: 'activo' | 'pausado' | 'concluido' | 'arquivado'
  data_inicio: string | null
  data_fim: string | null
  cor: string | null
  created_at: string
}

export interface ActivityTag {
  id: string
  nome: string
  cor: string
}

export interface Sessao {
  id: string
  user_id: string
  projecto_id: string
  projecto?: Projecto
  tag_id: string | null
  tag?: ActivityTag
  inicio: string
  fim: string | null
  horas: number | null
  nota: string | null
  editado_em: string | null
  created_at: string
}

export interface KanbanEstado {
  id: string
  nome: string
  cor: string
  ordem: number
}

export interface Tarefa {
  id: string
  projecto_id: string
  projecto?: Projecto
  titulo: string
  descricao: string | null
  assignee_id: string | null
  assignee?: Profile
  estado_id: string | null
  estado?: KanbanEstado
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente'
  data_inicio: string | null
  data_fim: string | null
  ordem: number
  created_at: string
}
