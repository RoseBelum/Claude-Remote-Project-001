'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { createClient } from '@/lib/supabase/client'
import { TaskCard } from '@/components/board/task-card'
import { TaskModal } from '@/components/board/task-modal'
import type { TarefaFull } from '@/components/board/types'
import type { KanbanEstado, Projecto } from '@/types'

/* ─── helpers ──────────────────────────────────────────────────────────── */

type BoardData = Map<string, TarefaFull[]>

interface ProfileOpt { id: string; nome: string; avatar_url: string | null }
interface Toast { id: number; msg: string; type: 'success' | 'error' }

let _toastId = 0

/* ─── DroppableColumn ───────────────────────────────────────────────────── */

function DroppableColumn({
  estado,
  tasks,
  showProject,
  filterAssignee,
  onCardClick,
  onQuickAdd,
}: {
  estado: KanbanEstado
  tasks: TarefaFull[]
  showProject: boolean
  filterAssignee: string
  onCardClick: (t: TarefaFull) => void
  onQuickAdd: (estadoId: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: estado.id })
  const [quickTitle, setQuickTitle] = useState('')
  const [quickOpen, setQuickOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const visible = filterAssignee
    ? tasks.filter((t) => t.assignee_id === filterAssignee)
    : tasks

  function openQuick() {
    setQuickOpen(true)
    setTimeout(() => inputRef.current?.focus(), 30)
  }

  function submitQuick(e: React.FormEvent) {
    e.preventDefault()
    if (!quickTitle.trim()) { setQuickOpen(false); return }
    onQuickAdd(estado.id)
    // Pass the title via a custom event so the page can handle it
    const ev = new CustomEvent('quick-add', { detail: { estadoId: estado.id, titulo: quickTitle.trim() } })
    window.dispatchEvent(ev)
    setQuickTitle('')
    setQuickOpen(false)
  }

  return (
    <div className="flex-shrink-0 w-72 flex flex-col">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: estado.cor }} />
        <span className="text-sm font-semibold text-gray-700 flex-1">{estado.nome}</span>
        <span className="text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
          {visible.length}
        </span>
      </div>

      {/* Drop area */}
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[200px] rounded-xl p-2 space-y-2 transition-colors ${
          isOver ? 'bg-indigo-50/60' : 'bg-gray-50'
        }`}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {visible.length === 0 ? (
            <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg min-h-[160px]">
              <span className="text-xs text-gray-400">Sem tarefas</span>
            </div>
          ) : (
            visible.map((t) => (
              <TaskCard
                key={t.id}
                tarefa={t}
                showProject={showProject}
                onClick={() => onCardClick(t)}
              />
            ))
          )}
        </SortableContext>

        {/* Quick add */}
        {quickOpen ? (
          <form onSubmit={submitQuick} className="mt-1">
            <input
              ref={inputRef}
              type="text"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') { setQuickOpen(false); setQuickTitle('') } }}
              placeholder="Título da tarefa…"
              className="w-full px-3 py-2 bg-white border border-indigo-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
            <div className="flex gap-1.5 mt-1.5">
              <button type="submit" className="px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700">Adicionar</button>
              <button type="button" onClick={() => { setQuickOpen(false); setQuickTitle('') }} className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700">Cancelar</button>
            </div>
          </form>
        ) : (
          <button
            onClick={openQuick}
            className="w-full py-1.5 text-xs text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            + Adicionar tarefa
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── Main page ─────────────────────────────────────────────────────────── */

export default function BoardPage() {
  const supabase = createClient()

  const [estados, setEstados] = useState<KanbanEstado[]>([])
  const [projectos, setProjectos] = useState<Projecto[]>([])
  const [profiles, setProfiles] = useState<ProfileOpt[]>([])

  const [filterProjecto, setFilterProjecto] = useState('')
  const [filterAssignee, setFilterAssignee] = useState('')

  const [boardData, setBoardData] = useState<BoardData>(new Map())
  const boardDataRef = useRef<BoardData>(new Map())

  const [activeTask, setActiveTask] = useState<TarefaFull | null>(null)
  const [modalTask, setModalTask] = useState<TarefaFull | null>(null)
  const [newTaskDefaults, setNewTaskDefaults] = useState<{ estadoId: string; projectoId: string } | null>(null)

  const [toasts, setToasts] = useState<Toast[]>([])
  const [ready, setReady] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  /* ── initial load ───────────────────────────────────────────────── */
  useEffect(() => {
    async function load() {
      const [{ data: es }, { data: ps }, { data: prs }] = await Promise.all([
        supabase.from('kanban_estados').select('*').order('ordem'),
        supabase.from('projectos').select('*, bu:bus(*)').eq('estado', 'activo').order('nome'),
        supabase.from('profiles').select('id, nome, avatar_url').order('nome'),
      ])
      setEstados(es ?? [])
      setProjectos(ps ?? [])
      setProfiles(prs ?? [])
      setReady(true)
    }
    void load()
  }, [])

  /* ── fetch tasks ────────────────────────────────────────────────── */
  const fetchTasks = useCallback(async () => {
    let q = supabase
      .from('tarefas')
      .select('*, projecto:projectos(nome, bu:bus(nome, cor)), assignee:profiles(nome, avatar_url)')
      .order('ordem', { ascending: true })

    if (filterProjecto) q = q.eq('projecto_id', filterProjecto)

    const { data } = await q
    const tasks = (data as TarefaFull[]) ?? []

    const map: BoardData = new Map()
    estados.forEach((e) => map.set(e.id, []))
    tasks.forEach((t) => {
      const col = t.estado_id ?? '__none__'
      if (!map.has(col)) map.set(col, [])
      map.get(col)!.push(t)
    })

    boardDataRef.current = map
    setBoardData(map)
  }, [estados, filterProjecto])

  useEffect(() => {
    if (ready && estados.length > 0) void fetchTasks()
  }, [ready, fetchTasks])

  /* ── quick-add listener ─────────────────────────────────────────── */
  useEffect(() => {
    async function handleQuickAdd(e: Event) {
      const { estadoId, titulo } = (e as CustomEvent).detail as { estadoId: string; titulo: string }
      const projectoId = filterProjecto || projectos[0]?.id
      if (!projectoId) { addToast('Selecciona um projecto no filtro primeiro.', 'error'); return }

      const { data, error } = await supabase
        .from('tarefas')
        .insert({ titulo, projecto_id: projectoId, estado_id: estadoId, prioridade: 'media', ordem: 0 })
        .select('*, projecto:projectos(nome, bu:bus(nome, cor)), assignee:profiles(nome, avatar_url)')
        .single()

      if (error) { addToast('Erro ao criar tarefa.', 'error'); return }

      const newTask = data as TarefaFull
      setBoardData((prev) => {
        const next = new Map(prev)
        const col = [...(next.get(estadoId) ?? [])]
        col.unshift(newTask)
        next.set(estadoId, col)
        boardDataRef.current = next
        return next
      })
      addToast('Tarefa criada.', 'success')
    }

    window.addEventListener('quick-add', handleQuickAdd)
    return () => window.removeEventListener('quick-add', handleQuickAdd)
  }, [filterProjecto, projectos])

  /* ── toasts ─────────────────────────────────────────────────────── */
  function addToast(msg: string, type: 'success' | 'error') {
    const id = ++_toastId
    setToasts((p) => [...p, { id, msg, type }])
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500)
  }

  /* ── find helpers ───────────────────────────────────────────────── */
  function findColOfTask(taskId: string, data: BoardData = boardDataRef.current): string | undefined {
    for (const [colId, tasks] of data) {
      if (tasks.some((t) => t.id === taskId)) return colId
    }
  }

  function findTask(taskId: string, data: BoardData = boardDataRef.current): TarefaFull | undefined {
    for (const tasks of data.values()) {
      const t = tasks.find((t) => t.id === taskId)
      if (t) return t
    }
  }

  /* ── DnD handlers ───────────────────────────────────────────────── */
  function handleDragStart(event: DragStartEvent) {
    setActiveTask(findTask(event.active.id as string) ?? null)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string
    if (activeId === overId) return

    const current = boardDataRef.current
    const srcCol = findColOfTask(activeId, current)
    const overCol = findColOfTask(overId, current) ?? (current.has(overId) ? overId : undefined)
    if (!srcCol || !overCol || srcCol === overCol) return

    const next = new Map(current)
    const src = [...(next.get(srcCol) ?? [])]
    const dst = [...(next.get(overCol) ?? [])]

    const srcIdx = src.findIndex((t) => t.id === activeId)
    if (srcIdx < 0) return
    const [task] = src.splice(srcIdx, 1)

    const overIdx = dst.findIndex((t) => t.id === overId)
    overIdx >= 0 ? dst.splice(overIdx, 0, task) : dst.push(task)

    next.set(srcCol, src)
    next.set(overCol, dst)
    boardDataRef.current = next
    setBoardData(next)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveTask(null)
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const current = boardDataRef.current
    const colId = findColOfTask(activeId, current)
    if (!colId) return

    const tasks = current.get(colId) ?? []
    const activeIdx = tasks.findIndex((t) => t.id === activeId)
    const overIdx = tasks.findIndex((t) => t.id === overId)

    // Reorder within column
    if (activeIdx >= 0 && overIdx >= 0 && activeIdx !== overIdx) {
      const reordered = arrayMove(tasks, activeIdx, overIdx)
      const next = new Map(current).set(colId, reordered)
      boardDataRef.current = next
      setBoardData(next)
      await Promise.all(reordered.map((t, i) =>
        supabase.from('tarefas').update({ ordem: i }).eq('id', t.id)
      ))
      return
    }

    // Cross-column move (already applied by handleDragOver) — persist estado_id + orders
    const task = findTask(activeId, current)
    if (!task) return

    await Promise.all([
      supabase.from('tarefas').update({ estado_id: colId }).eq('id', activeId),
      ...tasks.map((t, i) => supabase.from('tarefas').update({ ordem: i }).eq('id', t.id)),
    ])
  }

  /* ── modal handlers ─────────────────────────────────────────────── */
  function handleTaskSaved(updated: TarefaFull) {
    setBoardData((prev) => {
      const next = new Map(prev)
      // Remove from old column
      for (const [colId, tasks] of next) {
        const idx = tasks.findIndex((t) => t.id === updated.id)
        if (idx >= 0) {
          const newTasks = [...tasks]
          newTasks.splice(idx, 1)
          next.set(colId, newTasks)
          break
        }
      }
      // Add to new column
      const destCol = updated.estado_id ?? ''
      if (destCol) {
        const dest = [...(next.get(destCol) ?? []), updated]
        next.set(destCol, dest)
      }
      boardDataRef.current = next
      return next
    })
  }

  function handleTaskDeleted(id: string) {
    setBoardData((prev) => {
      const next = new Map(prev)
      for (const [colId, tasks] of next) {
        const idx = tasks.findIndex((t) => t.id === id)
        if (idx >= 0) {
          const newTasks = [...tasks]
          newTasks.splice(idx, 1)
          next.set(colId, newTasks)
          break
        }
      }
      boardDataRef.current = next
      return next
    })
  }

  /* ── render ─────────────────────────────────────────────────────── */
  if (!ready) {
    return (
      <div className="px-4 py-8 max-w-full">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="flex gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-72 h-96 bg-gray-200 rounded-xl animate-pulse flex-shrink-0" />
          ))}
        </div>
      </div>
    )
  }

  if (projectos.length === 0) {
    return (
      <div className="px-4 py-8 max-w-5xl mx-auto text-center">
        <p className="text-gray-500 mb-3">Nenhum projecto activo encontrado.</p>
        <a href="/settings/projects" className="text-indigo-600 hover:underline text-sm">
          Criar um projecto em Definições →
        </a>
      </div>
    )
  }

  const showProject = !filterProjecto

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 flex-wrap border-b border-gray-200 bg-white">
        <h1 className="text-xl font-bold text-gray-900 mr-2">Task Board</h1>

        <select
          value={filterProjecto}
          onChange={(e) => setFilterProjecto(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todos os projectos</option>
          {projectos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>

        <select
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todos os membros</option>
          {profiles.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>

        <button
          onClick={() => setNewTaskDefaults({ estadoId: estados[0]?.id ?? '', projectoId: filterProjecto })}
          className="ml-auto px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Nova tarefa
        </button>
      </div>

      {/* Board: horizontal scroll */}
      <div className="flex-1 overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 p-4 min-w-max">
            {estados.map((estado) => (
              <DroppableColumn
                key={estado.id}
                estado={estado}
                tasks={boardData.get(estado.id) ?? []}
                showProject={showProject}
                filterAssignee={filterAssignee}
                onCardClick={setModalTask}
                onQuickAdd={() => {}}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask && (
              <TaskCard
                tarefa={activeTask}
                showProject={showProject}
                onClick={() => {}}
                overlay
              />
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Task modal (edit) */}
      {modalTask && (
        <TaskModal
          tarefa={modalTask}
          projectos={projectos}
          estados={estados}
          profiles={profiles}
          onSaved={(updated) => { handleTaskSaved(updated); setModalTask(null) }}
          onDeleted={(id) => { handleTaskDeleted(id); setModalTask(null) }}
          onClose={() => setModalTask(null)}
          onToast={addToast}
        />
      )}

      {/* Task modal (new) */}
      {newTaskDefaults && (
        <TaskModal
          tarefa={null}
          isNew
          defaultEstadoId={newTaskDefaults.estadoId}
          defaultProjectoId={newTaskDefaults.projectoId}
          projectos={projectos}
          estados={estados}
          profiles={profiles}
          onSaved={(t) => { handleTaskSaved(t); setNewTaskDefaults(null) }}
          onDeleted={() => {}}
          onClose={() => setNewTaskDefaults(null)}
          onToast={addToast}
        />
      )}

      {/* Toasts */}
      <div className="fixed bottom-20 md:bottom-6 right-4 space-y-2 z-50">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium text-white ${
              t.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  )
}
