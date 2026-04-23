'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { TarefaFull } from './types'

const PRIORIDADE: Record<string, { bg: string; color: string; label: string }> = {
  baixa:   { bg: 'rgba(217,245,221,0.7)', color: '#1E6C3A', label: 'Baixa' },
  media:   { bg: 'rgba(230,233,255,0.8)', color: '#2736FF', label: 'Média' },
  alta:    { bg: 'rgba(255,236,199,0.8)', color: '#7D4800', label: 'Alta' },
  urgente: { bg: 'rgba(255,224,222,0.8)', color: '#7A0B13', label: 'Urgente' },
}

function Avatar({ nome, url }: { nome: string; url: string | null }) {
  const initials = nome.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
  if (url) return <img src={url} alt={nome} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
  return (
    <div className="w-6 h-6 rounded-full bg-[#E6E9FF] text-[#2736FF] text-xs font-bold flex items-center justify-center flex-shrink-0">
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
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (!isDragging && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick()
        }
      }}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`bg-white border border-[color:var(--color-border)] rounded-2xl p-3.5 group select-none transition-colors ${
        isDragging ? 'opacity-30' : 'hover:border-[color:var(--color-border-strong)] hover:shadow-md cursor-pointer'
      } ${overlay ? 'shadow-2xl rotate-1' : ''}`}
      onClick={!isDragging ? onClick : undefined}
      aria-label={`Tarefa: ${tarefa.titulo}. Prioridade ${prio.label}.`}
    >
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <span
          className="text-[0.65rem] font-extrabold px-2 py-0.5 rounded-full flex-shrink-0 uppercase tracking-[0.14em]"
          style={{ backgroundColor: prio.bg, color: prio.color }}
        >
          {prio.label}
        </span>
        <div className="flex items-center gap-1.5">
          {tarefa.assignee && <Avatar nome={tarefa.assignee.nome} url={tarefa.assignee.avatar_url} />}
          <button
            {...attributes}
            {...listeners}
            className="text-[color:var(--color-ink-subtle)] hover:text-[color:var(--color-primary)] cursor-grab active:cursor-grabbing touch-none opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
            aria-label={`Arrastar tarefa ${tarefa.titulo}`}
          >
            <span aria-hidden>⠿</span>
          </button>
        </div>
      </div>

      <p className="text-sm font-semibold text-[color:var(--color-ink)] leading-snug">{tarefa.titulo}</p>

      {tarefa.descricao && (
        <p className="mt-1.5 text-xs text-[color:var(--color-ink-muted)] line-clamp-2 font-medium">{tarefa.descricao}</p>
      )}

      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
        {showProject && (
          <span
            className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{
              backgroundColor: (tarefa.projecto?.bu?.cor ?? '#2736FF') + '22',
              color: tarefa.projecto?.bu?.cor ?? '#2736FF',
            }}
          >
            {tarefa.projecto?.nome}
          </span>
        )}
        {tarefa.data_fim && (
          <span className="text-xs text-[#51516B] font-medium">{tarefa.data_fim}</span>
        )}
      </div>
    </div>
  )
}
