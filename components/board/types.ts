export interface TarefaFull {
  id: string
  projecto_id: string
  titulo: string
  descricao: string | null
  assignee_id: string | null
  estado_id: string | null
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente'
  data_inicio: string | null
  data_fim: string | null
  ordem: number
  created_at: string
  projecto: { nome: string; bu: { nome: string; cor: string } } | null
  assignee: { nome: string; avatar_url: string | null } | null
}
