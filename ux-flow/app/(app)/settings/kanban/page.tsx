'use client'

import { useEffect, useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createClient } from '@/lib/supabase/client'
import type { KanbanEstado } from '@/types'

interface KanbanWithCount extends KanbanEstado {
  tarefas_count: number
}

function SortableRow({
  estado,
  onEdit,
  onDelete,
}: {
  estado: KanbanWithCount
  onEdit: (e: KanbanEstado) => void
  onDelete: (e: KanbanWithCount) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: estado.id,
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <button
          {...attributes}
          {...listeners}
          className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none"
          aria-label="Reordenar"
        >
          ⠿
        </button>
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: estado.cor }} />
        <span className="text-sm font-medium text-gray-900">{estado.nome}</span>
        {estado.tarefas_count > 0 && (
          <span className="text-xs text-gray-400">{estado.tarefas_count} tarefa(s)</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => onEdit(estado)} className="text-xs text-indigo-600 hover:underline">Editar</button>
        <button onClick={() => onDelete(estado)} className="text-xs text-red-500 hover:underline">Apagar</button>
      </div>
    </div>
  )
}

interface FormData { nome: string; cor: string }
const emptyForm: FormData = { nome: '', cor: '#94a3b8' }

export default function KanbanPage() {
  const supabase = createClient()
  const [estados, setEstados] = useState<KanbanWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<KanbanEstado | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const { data } = await supabase
      .from('kanban_estados')
      .select('*, tarefas(count)')
      .order('ordem')
    setEstados(
      (data ?? []).map((e: KanbanEstado & { tarefas: { count: number }[] }) => ({
        ...e,
        tarefas_count: e.tarefas?.[0]?.count ?? 0,
      }))
    )
    setLoading(false)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = estados.findIndex((e) => e.id === active.id)
    const newIndex = estados.findIndex((e) => e.id === over.id)
    const reordered = arrayMove(estados, oldIndex, newIndex)
    setEstados(reordered)

    await Promise.all(
      reordered.map((e, i) => supabase.from('kanban_estados').update({ ordem: i }).eq('id', e.id))
    )
  }

  function openCreate() {
    setEditing(null); setForm(emptyForm); setError(null); setModalOpen(true)
  }

  function openEdit(e: KanbanEstado) {
    setEditing(e); setForm({ nome: e.nome, cor: e.cor }); setError(null); setModalOpen(true)
  }

  async function handleSave() {
    if (!form.nome.trim()) { setError('Nome é obrigatório.'); return }
    setSaving(true); setError(null)
    if (editing) {
      const { error: e } = await supabase.from('kanban_estados').update({ nome: form.nome.trim(), cor: form.cor }).eq('id', editing.id)
      if (e) { setError(e.message); setSaving(false); return }
    } else {
      const maxOrdem = estados.length > 0 ? Math.max(...estados.map((e) => e.ordem)) + 1 : 0
      const { error: e } = await supabase.from('kanban_estados').insert({ nome: form.nome.trim(), cor: form.cor, ordem: maxOrdem })
      if (e) { setError(e.message); setSaving(false); return }
    }
    setSaving(false); setModalOpen(false); fetchAll()
  }

  async function handleDelete(e: KanbanWithCount) {
    if (e.tarefas_count > 0) {
      alert(`Não é possível apagar "${e.nome}" — tem ${e.tarefas_count} tarefa(s) neste estado.`)
      return
    }
    if (!confirm(`Apagar o estado "${e.nome}"?`)) return
    await supabase.from('kanban_estados').delete().eq('id', e.id)
    fetchAll()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Estados Kanban</h2>
          <p className="text-xs text-gray-400 mt-0.5">Arrasta para reordenar</p>
        </div>
        <button
          onClick={openCreate}
          className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Novo estado
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">A carregar...</p>
      ) : estados.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhum estado encontrado.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={estados.map((e) => e.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {estados.map((e) => (
                <SortableRow key={e.id} estado={e} onEdit={openEdit} onDelete={handleDelete} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              {editing ? 'Editar estado' : 'Novo estado'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Em progresso"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cor</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.cor}
                    onChange={(e) => setForm({ ...form, cor: e.target.value })}
                    className="w-10 h-10 border border-gray-300 rounded cursor-pointer p-0.5"
                  />
                  <span className="text-sm text-gray-500 font-mono">{form.cor}</span>
                </div>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mt-3">{error}</p>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {saving ? 'A guardar...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
