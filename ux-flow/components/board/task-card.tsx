'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { TarefaFull } from './types'

const PRIORIDADE: Record<string, { bg: string; color: string; label: string }> = {
  baixa:   { bg: 'rgba(215,229,187,0.6)', color: '#3f4b2c', label: 'Baixa' },
  media:   { bg: 'rgba(225,224,255,0.7)', color: '#585990', label: 'Média' },
  alta:    { bg: 'rgba(255,222,173,0.6)', color: '#7a4000', label: 'Alta' },
  urgente: { bg: 'rgba(255,218,214,0.7)', color: '#93000a', label: 'Urgente' },
}

function Avatar({ nome, url }: { nome: string; url: string | null }) {
  const initials = nome.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
  if (url) return <img src={url} alt={nome} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
  return (
    <div className="w-6 h-6 rounded-full bg-[#e1e0ff] text-[#585990] text-xs font-bold flex items-center justify-center flex-shrink-0">
      {initials}
    </div>
  )
}

interface Props {
  tarefa: TarefaFull
  showProject: boolean
  onClick: () => void
  overlay?: boolean
}

export function TaskCard({ tarefa, showProject, onClick, overlay = false }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tarefa.id })
  const prio = PRIORIDADE[tarefa.prioridade] ?? PRIORIDADE.media

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`bg-white/70 border border-white/80 rounded-2xl p-3.5 group select-none transition-all backdrop-blur-sm ${
        isDragging ? 'opacity-30' : 'hover:bg-white/90 hover:shadow-md cursor-pointer'
      } ${overlay ? 'shadow-2xl rotate-1' : ''}`}
      onClick={!isDragging ? onClick : undefined}
    >
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: prio.bg, color: prio.color }}
        >
          {prio.label}
        </span>
        <div className="flex items-center gap-1.5">
          {tarefa.assignee && <Avatar nome={tarefa.assignee.nome} url={tarefa.assignee.avatar_url} />}
          <button
            {...attributes}
            {...listeners}
            className="text-[#c8c5d0] hover:text-[#585990] cursor-grab active:cursor-grabbing touch-none opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
            aria-label="Drag"
          >
            ⠿
          </button>
        </div>
      </div>

      <p className="text-sm font-semibold text-[#181c23] leading-snug">{tarefa.titulo}</p>

      {tarefa.descricao && (
        <p className="mt-1.5 text-xs text-[#777680] line-clamp-2 font-medium">{tarefa.descricao}</p>
      )}

      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
        {showProject && (
          <span
            className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{
              backgroundColor: (tarefa.projecto?.bu?.cor ?? '#585990') + '22',
              color: tarefa.projecto?.bu?.cor ?? '#585990',
            }}
          >
            {tarefa.projecto?.nome}
          </span>
        )}
        {tarefa.data_fim && (
          <span className="text-xs text-[#777680] font-medium">{tarefa.data_fim}</span>
        )}
      </div>
    </div>
  )
}
