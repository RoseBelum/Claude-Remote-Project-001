# UX Flow — Fase 4: Timeline & Dashboard (Tab 3)

## Pré-requisito
Fases 1, 2 e 3 concluídas. Sessões de tempo e tarefas com datas já existem na base de dados.

## Dependências adicionais

```bash
npm install recharts frappe-gantt
```

---

## Objectivo
Tab 3 com duas sub-vistas: Timeline (Gantt de planeamento) e Dashboard (analytics de horas). Ambas partilham os mesmos filtros de período e pessoa.

---

## Layout da página (`/timeline`)

### Header global
- Toggle de sub-vista: **Timeline** | **Dashboard** (tabs ou segmented control)
- Filtro de período: Semana | Mês | Quarter | Custom
- Filtro de pessoa: "Eu" | "Equipa" | [nome específico]

Estes filtros aplicam-se às duas sub-vistas. Quando mudar de sub-vista, os filtros mantêm-se.

---

## Sub-vista: Timeline (Gantt)

### Biblioteca
Usar **Frappe Gantt** (https://frappe.io/gantt). É open source, leve e tem drag nativo.

Instalação e setup básico:
```typescript
import Gantt from 'frappe-gantt'

// Converter tarefas para o formato Frappe
const tasks = tarefas.map(t => ({
  id: t.id,
  name: `${t.titulo}`,
  start: t.data_inicio ?? today,
  end: t.data_fim ?? today,
  progress: t.estado === 'Concluído' ? 100 : 0,
  custom_class: `bu-${t.projecto?.bu?.nome.toLowerCase()}`,
}))

const gantt = new Gantt('#gantt', tasks, {
  view_mode: 'Week',  // Day | Week | Month | Quarter Year
  on_date_change: (task, start, end) => updateTaskDates(task.id, start, end),
  on_click: (task) => openTaskModal(task.id),
})
```

### Zoom (view modes)

Segmented control no header da Timeline:
- **Dia** → `view_mode: 'Day'`
- **Semana** → `view_mode: 'Week'`
- **Mês** → `view_mode: 'Month'`
- **Quarter** → `view_mode: 'Quarter Year'`

### Agrupamento e cores

- Cor de cada barra = cor da BU do projecto (`bus.cor`)
- Aplicar via `custom_class` + CSS:
```css
.gantt .bar.bu-via_verde .bar-progress { fill: #10b981; }
.gantt .bar.bu-ucb .bar-progress { fill: #8b5cf6; }
/* etc para cada BU */
```

### Toggle "Eu / Equipa"

- **Eu**: mostrar só tarefas onde `assignee_id = user_id`
- **Equipa**: mostrar todas as tarefas, com assignee visível no label da barra

### Drag nas barras

Ao arrastar uma barra (mover ou redimensionar):
1. `on_date_change` dispara com novo `start` e `end`
2. Optimistic update local
3. `UPDATE tarefas SET data_inicio = start, data_fim = end WHERE id = task.id`
4. Toast discreto "Datas actualizadas"

### Click numa barra

Abre o mesmo modal de tarefa da Tab 2 (componente partilhado).

### Filtros adicionais da Timeline

Sidebar ou dropdown de filtros:
- Por BU (multi-select com checkboxes)
- Por projecto (multi-select)
- Ocultar tarefas sem datas definidas

---

## Sub-vista: Dashboard

### Fonte de dados

Para vista "Eu": query directa às `sessoes` do utilizador autenticado.

Para vista "Equipa": usar a função `get_team_sessions(p_inicio, p_fim)` criada na Fase 1.

```typescript
// Calcular período com date-fns
const { inicio, fim } = getPeriodRange(periodo) // semana | mês | quarter | custom
```

---

### Bloco 1 — Metric cards (linha de 4)

| Métrica | Cálculo |
|---------|---------|
| Horas totais | `SUM(sessoes.horas)` no período |
| % do target | `(horas_totais / target_periodo) * 100` |
| Projectos activos | `COUNT(DISTINCT projecto_id)` no período |
| Sessões registadas | `COUNT(sessoes)` no período |

Target do período:
- Semana: `target_horas_mes / 4`
- Mês: `target_horas_mes`
- Quarter: `target_horas_mes * 3`

Exibir % com cor:
- < 50% → vermelho
- 50–80% → amarelo
- > 80% → verde

---

### Bloco 2 — Horas por projecto (bar chart horizontal)

```typescript
// Recharts BarChart com layout="vertical"
// Eixo Y: nomes dos projectos
// Eixo X: horas
// Cor das barras: cor da BU do projecto
// Ordenar por horas decrescente
// Tooltip: nome projecto + BU + horas
```

Dados:
```sql
SELECT p.nome, b.nome as bu_nome, b.cor, SUM(s.horas) as total_horas
FROM sessoes s
JOIN projectos p ON p.id = s.projecto_id
JOIN bus b ON b.id = p.bu_id
WHERE [filtros de período e pessoa]
GROUP BY p.id, p.nome, b.nome, b.cor
ORDER BY total_horas DESC
```

---

### Bloco 3 — Distribuição por BU (donut chart)

```typescript
// Recharts PieChart com innerRadius
// Uma fatia por BU
// Cor: bus.cor
// Legenda: nome BU + horas + percentagem
// Tooltip ao hover em cada fatia
```

Dados:
```sql
SELECT b.nome, b.cor, SUM(s.horas) as total_horas
FROM sessoes s
JOIN projectos p ON p.id = s.projecto_id
JOIN bus b ON b.id = p.bu_id
WHERE [filtros]
GROUP BY b.id, b.nome, b.cor
ORDER BY total_horas DESC
```

---

### Bloco 4 — Horas por dia/semana (line chart)

```typescript
// Recharts ComposedChart: Bar por dia + ReferenceLine para target diário
// Eixo X: datas do período
// Eixo Y: horas
// Barra: horas por dia
// Linha de referência: target_horas_mes / dias_úteis_do_mês
// Tooltip: data + horas + diferença ao target
```

Granularidade:
- Vista semana → por dia
- Vista mês → por semana
- Vista quarter → por mês

---

### Bloco 5 — Comparação da equipa (só vista "Equipa")

```typescript
// Recharts BarChart horizontal
// Uma barra por pessoa
// Mostrar: horas totais + linha de target individual
// Ordenar por horas decrescente
// Avatar da pessoa no eixo Y (ou iniciais)
```

Dados: usar `get_team_sessions()` e agrupar por `user_id`.

---

## Layout do Dashboard

**Desktop — grid 2 colunas:**
```
[Horas totais] [% Target] [Projectos] [Sessões]   ← linha de 4 metric cards
[Horas por projecto (bar) — 60%]  [Donut BU — 40%]
[Horas por dia (line chart) — 100%]
[Comparação equipa — 100%, só em vista equipa]
```

**Mobile — coluna única, nesta ordem:**
1. Metric cards (2x2 grid)
2. Donut BU
3. Horas por projecto
4. Horas por dia
5. Comparação equipa (se equipa)

---

## Detalhes de UX

- Charts com animação de entrada suave (Recharts tem `animationDuration`)
- Empty state se não há dados no período: "Sem sessões registadas neste período."
- Loading skeletons nos charts enquanto carregam
- Tooltip em todos os charts com valores exactos
- Cores consistentes com as BUs definidas em toda a app
- Gantt: mostrar mensagem se não há tarefas com datas definidas: "Adiciona datas às tarefas no Task Board para as ver aqui."

---

## Critérios de conclusão da Fase 4

**Timeline:**
- [ ] Gantt renderiza tarefas com datas correctamente
- [ ] Zoom Day/Week/Month/Quarter funciona
- [ ] Cores das barras reflectem a BU do projecto
- [ ] Drag para alterar datas persiste na DB
- [ ] Toggle Eu/Equipa filtra correctamente
- [ ] Click numa barra abre modal da tarefa
- [ ] Filtros por BU e projecto funcionam
- [ ] Empty state para tarefas sem datas

**Dashboard:**
- [ ] Metric cards calculam correctamente para todos os períodos
- [ ] Bar chart de horas por projecto renderiza e ordena correctamente
- [ ] Donut de distribuição por BU renderiza
- [ ] Line chart de horas por dia/semana/mês renderiza
- [ ] Linha de referência de target visível
- [ ] Vista "Equipa" mostra comparação entre membros
- [ ] Filtros de período aplicam a todos os charts simultaneamente
- [ ] Toggle Eu/Equipa funciona em ambas as sub-vistas
- [ ] UI funciona correctamente em mobile
- [ ] Loading states e empty states implementados
