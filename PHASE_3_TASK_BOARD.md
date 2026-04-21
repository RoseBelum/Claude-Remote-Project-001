# UX Flow — Fase 3: Task Board (Tab 2)

## Pré-requisito
Fase 1 concluída. Projectos e Kanban estados já existem na base de dados.

## Dependências adicionais

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## Objectivo
Tab 2 completamente funcional: kanban com drag & drop, tarefas ligadas a projectos, assignees e datas que alimentam o Gantt da Fase 4.

---

## Layout da página (`/board`)

### Header
- Dropdown "Projecto" — filtra o board pelo projecto seleccionado
- Opção "Todos os projectos" (mostra tudo, agrupado por projecto)
- Filtro "Assignee" — dropdown com membros da equipa + "Todos"
- Botão "Nova tarefa" (atalho rápido, abre modal sem projecto pré-seleccionado)

### Board
Colunas kanban lado a lado, scroll horizontal suave em mobile.

Cada coluna:
- Header: nome do estado + badge com contagem de tarefas + cor do estado
- Área de drop (altura mínima 200px para facilitar drop em colunas vazias)
- Botão "+" no fundo de cada coluna para quick-add

**Layout de colunas:**
- Desktop: todas as colunas visíveis, scroll horizontal se necessário
- Mobile: uma coluna de cada vez com swipe, ou scroll horizontal com snap

---

## Drag & Drop (@dnd-kit)

### Comportamento
- Arrastar card entre colunas muda o `estado_id` da tarefa
- Arrastar card dentro da mesma coluna reordena (`ordem`)
- Durante drag: card original fica com opacity reduzida, placeholder mostra posição de destino
- Ao soltar: optimistic update imediato, sync com DB em background

### Implementação
```typescript
// Estrutura de dados para o board
type BoardData = {
  [estadoId: string]: Tarefa[]
}

// DndContext no nível do board
// SortableContext por coluna
// useSortable em cada card
// handleDragEnd: actualizar estado_id e/ou ordem
```

Ao mover entre colunas:
```typescript
// UPDATE tarefas SET estado_id = novoEstadoId, ordem = novaOrdem WHERE id = tarefaId
```

---

## Card de tarefa

Layout do card:
```
[badge prioridade]                          [avatar assignee]
Título da tarefa

[badge projecto se "todos os projectos"]
[data fim se definida]  [tag de estado se relevante]
```

Cores de prioridade:
- `baixa` → cinzento
- `media` → azul
- `alta` → amarelo/laranja
- `urgente` → vermelho

Interacções:
- Click → abre modal de detalhe
- Drag handle (ícone ⠿) → inicia drag
- Hover → mostra botão de acções rápidas (⋮)

---

## Modal de tarefa

Abre ao clicar no card. Funciona como painel lateral em desktop (slide-in da direita) e drawer em mobile.

### Campos

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| Título | text input (editável inline, grande) | Sim |
| Projecto | select dropdown | Sim |
| Assignee | select com avatares dos membros | Não |
| Estado | select (colunas do kanban) | Sim |
| Prioridade | selector visual 4 opções | Sim |
| Data início | date picker | Não |
| Data fim | date picker | Não |
| Descrição | textarea | Não |

**Nota sobre datas:** as datas `data_inicio` e `data_fim` das tarefas alimentam directamente o Gantt da Tab 3. Explicar no placeholder: "Usado no planeamento (Timeline)".

### Acções no modal
- Guardar (auto-save ao sair do campo, ou botão explícito)
- Apagar tarefa — botão no fundo do modal com confirmação: "Apagar esta tarefa? Esta acção não pode ser desfeita."

---

## Quick-add de tarefa

Ao clicar "+" numa coluna:
- Inline form aparece no topo da coluna
- Campo: título (text input, focus automático)
- Enter → cria tarefa com estado da coluna, projecto seleccionado no header, sem assignee
- Escape → cancela
- Tarefa criada aparece imediatamente no topo da coluna

---

## Empty states

- **Board vazio** (projecto sem tarefas): ilustração + "Nenhuma tarefa ainda. Clica em '+' para adicionar a primeira."
- **Coluna vazia**: área de drop visível com borda dashed + texto "Sem tarefas"
- **Nenhum projecto activo**: redirecionar para Definições com mensagem "Cria um projecto primeiro em Definições."

---

## Filtros e pesquisa

- **Por projecto**: dropdown no header (já descrito)
- **Por assignee**: dropdown no header, filtra cards visíveis
- **Pesquisa** (nice-to-have): input de texto que filtra títulos de tarefas em tempo real

---

## Critérios de conclusão da Fase 3

- [ ] Board renderiza as colunas correctamente
- [ ] Drag & drop entre colunas funciona e persiste na DB
- [ ] Reordenação dentro da mesma coluna funciona
- [ ] Modal de tarefa abre com todos os campos
- [ ] Criar tarefa (modal e quick-add) funciona
- [ ] Editar tarefa actualiza imediatamente o card
- [ ] Apagar tarefa com confirmação funciona
- [ ] Filtro por projecto funciona
- [ ] Filtro por assignee funciona
- [ ] Assignee avatar aparece no card
- [ ] Prioridade visível no card com cor correcta
- [ ] Data fim visível no card se definida
- [ ] Optimistic updates em todas as acções
- [ ] UI funciona em mobile (scroll horizontal ou swipe de colunas)
