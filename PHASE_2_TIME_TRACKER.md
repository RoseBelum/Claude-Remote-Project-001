# UX Flow — Fase 2: Time Tracker (Tab 1)

## Pré-requisito
Fase 1 concluída. Projectos, BUs e Activity Tags já existem na base de dados.

## Dependências adicionais

```bash
npm install xlsx date-fns
```

---

## Objectivo
Tab 1 completamente funcional: cronómetro, registo de sessões, edição retroactiva e export Excel no formato exacto do template UCB.

---

## Layout da página (`/tracker`)

**Desktop — dois painéis lado a lado:**
- Esquerda (40%): painel de nova sessão + cronómetro
- Direita (60%): lista de sessões do dia

**Mobile — coluna única:**
- Topo: painel de cronómetro (colapsável se sessão activa)
- Baixo: lista de sessões do dia

---

## Painel de cronómetro

### Formulário de nova sessão

Campos (nesta ordem):
1. **BU** — select dropdown com círculo de cor + nome. Ao seleccionar, filtra o dropdown de Projecto.
2. **Projecto** — select dropdown filtrado pela BU seleccionada. Mostra apenas projectos com `estado = 'activo'`.
3. **Activity Tag** — select dropdown com todas as tags. Opcional.
4. **Nota** — text input, placeholder "Breve descrição da actividade (opcional)"

### Cronómetro

**Estado parado:**
- Display `00:00:00` em tipografia grande
- Botão "Iniciar" (verde, tamanho grande)
- Desactivado se Projecto não estiver seleccionado

**Estado a correr:**
- Display a contar em tempo real (`setInterval` a cada segundo)
- Nome do projecto activo visível por baixo
- Botão "Parar" (vermelho)
- Indicador visual pulsante (ponto verde animado)

**Aviso de sessão longa:**
Se cronómetro correr há mais de 4 horas, mostrar banner amarelo: "Tens uma sessão activa há mais de 4h. Não te esqueças de parar o cronómetro."

### Persistência em localStorage

Ao iniciar, guardar:
```json
{
  "activeSession": {
    "projectoId": "uuid",
    "tagId": "uuid | null",
    "nota": "string",
    "inicio": "ISO 8601 timestamp"
  }
}
```

Ao carregar a página, verificar se existe `activeSession`. Se sim, retomar cronómetro a partir do `inicio` guardado e restaurar os dropdowns. Ao parar, limpar localStorage.

### Ao parar o cronómetro

1. Calcular `horas = (now - inicio) / 3600000`, arredondado a 2 casas decimais
2. Inserir na tabela `sessoes` com todos os campos
3. Limpar localStorage
4. Reset do formulário (manter BU e Projecto para sessões consecutivas)
5. Sessão aparece imediatamente na lista (optimistic update)

---

## Lista de sessões

### Navegação de datas

Header da lista:
- Botão "‹" (dia anterior)
- Data em formato "Terça, 21 Abr 2026"
- Botão "›" (dia seguinte)
- Botão "Hoje" (visível só se não estiver no dia actual)

Query para carregar sessões do dia:
```sql
SELECT s.*, p.nome as projecto_nome, b.nome as bu_nome, b.cor as bu_cor,
       t.nome as tag_nome, t.cor as tag_cor
FROM sessoes s
JOIN projectos p ON p.id = s.projecto_id
JOIN bus b ON b.id = p.bu_id
LEFT JOIN activity_tags t ON t.id = s.tag_id
WHERE s.user_id = auth.uid()
  AND s.inicio::date = [data seleccionada]
ORDER BY s.inicio ASC
```

### Cada linha de sessão

```
[badge BU]  Nome Projecto              [tag badge]    2,5h    [✏] [🗑]
            Nota da sessão             14:00 – 16:30
```

- Badge da BU com cor de fundo
- Nome do projecto em bold
- Tag como badge colorido (ou "—" se não tiver)
- Horas com vírgula: `2,5h`
- Hora início → hora fim
- Nota em texto secundário
- Ícone editar → modal de edição
- Ícone apagar → confirmação inline

### Total do dia

No fundo da lista:
```
Total: 6,5h   [████████████░░░░░░░░]   42% do objectivo diário
```

Referência diária = `target_horas_mes / dias_úteis_do_mês`.

---

## Modal de edição de sessão

| Campo | Tipo | Notas |
|-------|------|-------|
| Projecto | select | todos os projectos activos |
| Activity Tag | select | opcional |
| Data | date picker | |
| Hora início | time input | HH:MM |
| Hora fim | time input | HH:MM, opcional |
| Horas | number input | step 0,5 — se editado manualmente, prevalece |
| Nota | text input | |

**Lógica de horas:** se `hora início` e `hora fim` preenchidos, calcular automaticamente. Se utilizador editar `horas` manualmente, usar esse valor.

**Ao guardar:** update na DB, `editado_em = now()`, optimistic update, toast de confirmação.

---

## Export Excel

### Modal de export

Botão "Exportar" no header da página. Abre modal com:

**Período:**
- Semana actual
- Mês actual
- Range customizado (date pickers: de / até)

**Scope:**
- Só eu
- Toda a equipa

### Formato do ficheiro

Nome: `timesheet_[nome]_[periodo].xlsx`

**Colunas (ordem exacta):**

| Coluna | Fonte |
|--------|-------|
| Mês | `sessoes.inicio` formato `YYYY-MM-DD` |
| BU | `bus.nome` |
| Projecto | `projectos.nome` |
| Area BU | `projectos.area_bu` ou `"n.a"` |
| Atividade | `activity_tags.nome` ou `"n.a"` |
| Atividade Resumida | `sessoes.nota` ou `""` |
| Horas | `sessoes.horas` (número) |

Quando scope = "Toda a equipa": adicionar coluna `Membro` (= `profiles.nome`) como primeira coluna.

Uma linha por sessão, ordenadas por data ascendente.

**Implementação com SheetJS:**
```typescript
import * as XLSX from 'xlsx'

function exportToExcel(sessoes: SessaoExport[], filename: string) {
  const rows = sessoes.map(s => ({
    'Mês': s.inicio.split('T')[0],
    'BU': s.bu_nome,
    'Projecto': s.projecto_nome,
    'Area BU': s.area_bu ?? 'n.a',
    'Atividade': s.tag_nome ?? 'n.a',
    'Atividade Resumida': s.nota ?? '',
    'Horas': s.horas,
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Timesheet')
  XLSX.writeFile(wb, filename)
}
```

---

## Detalhes de UX

- Optimistic updates em todas as acções (criar, editar, apagar)
- Skeleton loading na lista de sessões
- Empty state se não há sessões no dia
- Botão Start/Stop activável com `Space` ou `Enter`
- Horas sempre com vírgula na UI (`2,5h`)
- Toasts de confirmação e erro

---

## Critérios de conclusão da Fase 2

- [ ] Cronómetro inicia e para correctamente
- [ ] Sessão guardada na DB ao parar
- [ ] Cronómetro sobrevive a refresh da página (localStorage)
- [ ] Aviso visual após 4h de sessão activa
- [ ] Navegação de datas na lista funciona
- [ ] Sessões do dia listadas correctamente
- [ ] Modal de edição abre com dados preenchidos
- [ ] Edição actualiza sessão e regista `editado_em`
- [ ] Apagar sessão com confirmação funciona
- [ ] Total do dia calculado correctamente
- [ ] Export individual gera xlsx correcto no formato UCB
- [ ] Export de equipa inclui coluna Membro
- [ ] Filtros de período funcionam no export
- [ ] UI funciona correctamente em mobile
