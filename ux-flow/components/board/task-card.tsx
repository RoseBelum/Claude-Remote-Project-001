'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { TarefaFull } from './types'

const PRIORIDADE: Record<string, string> = {
  baixa: 'bg-gray-100 text-gray-500',
  media: 'bg-blue-100 text-blue-600',
  alta: 'bg-orange-100 text-orange-600',
  urgente: 'bg-red-100 text-red-600',
}

function Avatar({ nome, url }: { nome: string; url: string | null }) {
  const initials = nome.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
  if (url) return <img src={url} alt={nome} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
  return (
    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">
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

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`bg-white border rounded-lg p-3 group select-none transition-all ${
        isDragging ? 'opacity-30' : 'hover:border-indigo-300 hover:shadow-sm cursor-pointer'
      } ${overlay ? 'shadow-xl rotate-1 border-indigo-200' : 'border-gray-200'}`}
      onClick={!isDragging ? onClick : undefined}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded flex-shrink-0 ${PRIORIDADE[tarefa.prioridade]}`}>
          {tarefa.prioridade}
        </span>
        <div className="flex items-center gap-1.5">
          {tarefa.assignee && <Avatar nome={tarefa.assignee.nome} url={tarefa.assignee.avatar_url} />}
          <button
            {...attributes}
            {...listeners}
            className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
            aria-label="Drag"
          >
            ⠿
          </button>
        </div>
      </div>

      <p className="text-sm font-medium text-gray-900 leading-snug">{tarefa.titulo}</p>

      {tarefa.descricao && (
        <p className="mt-1 text-xs text-gray-400 line-clamp-2">{tarefa.descricao}</p>
      )}

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {showProject && (
          <span
            className="text-xs px-1.5 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: (tarefa.projecto?.bu?.cor ?? '#6366f1') + '22',
              color: tarefa.projecto?.bu?.cor ?? '#6366f1',
            }}
          >
            {tarefa.projecto?.nome}
          </span>
        )}
        {tarefa.data_fim && (
          <span className="text-xs text-gray-400">{tarefa.data_fim}</span>
        )}
      </div>
    </div>
  )
}
