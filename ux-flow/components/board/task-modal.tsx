'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Projecto, KanbanEstado } from '@/types'
import type { TarefaFull } from './types'

const PRIORIDADES = ['baixa', 'media', 'alta', 'urgente'] as const
type Prioridade = (typeof PRIORIDADES)[number]

const PRIORIDADE_STYLE: Record<Prioridade, string> = {
  baixa: 'bg-gray-100 text-gray-500 ring-gray-200',
  media: 'bg-blue-100 text-blue-600 ring-blue-200',
  alta: 'bg-orange-100 text-orange-600 ring-orange-200',
  urgente: 'bg-red-100 text-red-600 ring-red-200',
}

interface ProfileOpt {
  id: string
  nome: string
  avatar_url: string | null
}

interface Props {
  tarefa: TarefaFull | null
  isNew?: boolean
  defaultEstadoId?: string
  defaultProjectoId?: string
  projectos: Projecto[]
  estados: KanbanEstado[]
  profiles: ProfileOpt[]
  onSaved: (t: TarefaFull) => void
  onDeleted: (id: string) => void
  onClose: () => void
  onToast: (msg: string, type: 'success' | 'error') => void
}

export function TaskModal({
  tarefa,
  isNew = false,
  defaultEstadoId,
  defaultProjectoId,
  projectos,
  estados,
  profiles,
  onSaved,
  onDeleted,
  onClose,
  onToast,
}: Props) {
  const supabase = createClient()
  const titleRef = useRef<HTMLInputElement>(null)

  const [titulo, setTitulo] = useState(tarefa?.titulo ?? '')
  const [descricao, setDescricao] = useState(tarefa?.descricao ?? '')
  const [projectoId, setProjectoId] = useState(tarefa?.projecto_id ?? defaultProjectoId ?? '')
  const [assigneeId, setAssigneeId] = useState(tarefa?.assignee_id ?? '')
  const [estadoId, setEstadoId] = useState(tarefa?.estado_id ?? defaultEstadoId ?? '')
  const [prioridade, setPrioridade] = useState<Prioridade>(tarefa?.prioridade ?? 'media')
  const [dataInicio, setDataInicio] = useState(tarefa?.data_inicio ?? '')
  const [dataFim, setDataFim] = useState(tarefa?.data_fim ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    setTimeout(() => titleRef.current?.focus(), 50)
  }, [])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSave() {
    if (!titulo.trim() || !projectoId || !estadoId) {
      onToast('Título, projecto e estado são obrigatórios.', 'error')
      return
    }
    setSaving(true)

    const payload = {
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      projecto_id: projectoId,
      assignee_id: assigneeId || null,
      estado_id: estadoId,
      prioridade,
      data_inicio: dataInicio || null,
      data_fim: dataFim || null,
    }

    if (isNew) {
      const { data, error } = await supabase
        .from('tarefas')
        .insert({ ...payload, ordem: 0 })
        .select('*, projecto:projectos(nome, bu:bus(nome, cor)), assignee:profiles(nome, avatar_url)')
        .single()
      setSaving(false)
      if (error) { onToast('Erro ao criar tarefa.', 'error'); return }
      onSaved(data as TarefaFull)
      onToast('Tarefa criada.', 'success')
    } else {
      const { data, error } = await supabase
        .from('tarefas')
        .update(payload)
        .eq('id', tarefa!.id)
        .select('*, projecto:projectos(nome, bu:bus(nome, cor)), assignee:profiles(nome, avatar_url)')
        .single()
      setSaving(false)
      if (error) { onToast('Erro ao guardar.', 'error'); return }
      onSaved(data as TarefaFull)
      onToast('Tarefa actualizada.', 'success')
    }
    onClose()
  }

  async function handleDelete() {
    if (!tarefa) return
    setDeleting(true)
    const { error } = await supabase.from('tarefas').delete().eq('id', tarefa.id)
    setDeleting(false)
    if (error) { onToast('Erro ao apagar.', 'error'); return }
    onDeleted(tarefa.id)
    onToast('Tarefa apagada.', 'success')
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            {isNew ? 'Nova tarefa' : 'Editar tarefa'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none">×</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Title */}
          <div>
            <input
              ref={titleRef}
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título da tarefa *"
              className="w-full text-lg font-semibold text-gray-900 border-0 border-b-2 border-gray-200 focus:border-indigo-500 outline-none pb-1 bg-transparent transition-colors"
            />
          </div>

          {/* Projecto */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Projecto *</label>
            <select
              value={projectoId}
              onChange={(e) => setProjectoId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Seleccionar</option>
              {projectos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Assignee</label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Sem assignee</option>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Estado *</label>
            <select
              value={estadoId}
              onChange={(e) => setEstadoId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Seleccionar</option>
              {estados.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>

          {/* Prioridade */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Prioridade</label>
            <div className="flex gap-2 flex-wrap">
              {PRIORIDADES.map((p) => (
                <button
                  key={p}
                  onClick={() => setPrioridade(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ring-1 transition-all ${
                    prioridade === p ? `${PRIORIDADE_STYLE[p]} ring-2` : 'bg-white text-gray-500 ring-gray-200 hover:ring-gray-300'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Data início</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-400 mt-0.5">Usado no planeamento (Timeline)</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Data fim</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Descrição</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Detalhes da tarefa…"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 space-y-3">
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="flex-1 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
            >
              {saving ? 'A guardar…' : 'Guardar'}
            </button>
          </div>

          {!isNew && (
            confirmDelete ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs text-red-700 mb-2">Apagar esta tarefa? Esta acção não pode ser desfeita.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 py-1.5 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => void handleDelete()}
                    disabled={deleting}
                    className="flex-1 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? 'A apagar…' : 'Apagar'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full py-2 text-xs text-red-500 hover:text-red-700 transition-colors"
              >
                Apagar tarefa
              </button>
            )
          )}
        </div>
      </div>
    </>
  )
}
